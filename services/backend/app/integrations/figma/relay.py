"""
figma-relay — cloud relay for bidirectional Figma ↔ Osyle communication.

Mirrors the local figma-relay.mjs but runs on Lambda/DynamoDB so it works
from production (app.osyle.com over HTTPS).

CORS: relay endpoints explicitly allow ALL origins because requests come from
the Figma plugin UI iframe (origin is null or figma.com, neither of which
is in the app's ALLOWED_ORIGINS list). Relay payloads are short-lived design
data — no auth tokens or PII — so wildcard CORS is safe here.

DynamoDB table: OsyleFigmaRelay-Prod
  PK:  token       (string)
  ttl: epoch secs  (number, DynamoDB auto-deletes after 10 min)

Large payloads (>300KB) are offloaded to S3 under relay/<token>.json.
DynamoDB stores an s3_key reference instead of payload_json in that case.
"""
import os
import json
import time
import boto3
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from boto3.dynamodb.conditions import Attr
from botocore.exceptions import ClientError

router = APIRouter(prefix="/relay", tags=["relay"])

REGION       = os.getenv("AWS_REGION", "us-east-1")
TABLE_NAME   = "OsyleFigmaRelay-Prod"
S3_BUCKET    = os.getenv("S3_BUCKET", "osyle-shared-assets-prod")
TTL_SECS     = 10 * 60       # 10 minutes
S3_THRESHOLD = 300 * 1024    # offload to S3 above 300KB

_table = None
_s3    = None


def get_table():
    global _table
    if _table is None:
        kwargs = {"region_name": REGION}
        endpoint = os.getenv("DYNAMODB_ENDPOINT_URL")
        if endpoint:
            kwargs["endpoint_url"] = endpoint
        _table = boto3.resource("dynamodb", **kwargs).Table(TABLE_NAME)
    return _table


def get_s3():
    global _s3
    if _s3 is None:
        _s3 = boto3.client("s3", region_name=REGION)
    return _s3


def relay_response(data: dict, status: int = 200) -> JSONResponse:
    """Return JSON with explicit wildcard CORS — required for Figma plugin origin."""
    return JSONResponse(
        content=data,
        status_code=status,
        headers={
            "Access-Control-Allow-Origin":  "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        },
    )


def ttl_epoch() -> int:
    return int(time.time()) + TTL_SECS


def store_payload(token: str, body: dict, direction: str):
    """Write relay item to DynamoDB, offloading payload to S3 if >300KB."""
    payload_json = json.dumps(body)
    item = {
        "token": token,
        "direction": direction,
        "acked": False,
        "ttl": ttl_epoch(),
    }
    if len(payload_json.encode()) > S3_THRESHOLD:
        s3_key = f"relay/{token}.json"
        get_s3().put_object(
            Bucket=S3_BUCKET,
            Key=s3_key,
            Body=payload_json.encode(),
            ContentType="application/json",
        )
        item["s3_key"] = s3_key
    else:
        item["payload_json"] = payload_json
    get_table().put_item(Item=item)


def fetch_payload_json(item: dict) -> dict:
    """Retrieve payload dict from DynamoDB item, fetching from S3 if needed."""
    if "s3_key" in item:
        obj = get_s3().get_object(Bucket=S3_BUCKET, Key=item["s3_key"])
        return json.loads(obj["Body"].read())
    return json.loads(item["payload_json"])


# ── CORS preflight (Figma plugin sends OPTIONS before POST) ───────────────────
@router.options("/{rest_of_path:path}")
async def preflight(rest_of_path: str):
    return relay_response({})


# ── Health check ──────────────────────────────────────────────────────────────
@router.get("/figma-ping")
async def ping():
    return relay_response({"ok": True, "source": "lambda"})


# ── Osyle → Figma ─────────────────────────────────────────────────────────────

@router.post("/figma-payload")
async def store_o2f_payload(request: Request):
    """Osyle stores an export payload destined for the Figma plugin."""
    try:
        body = await request.json()
    except Exception:
        return relay_response({"error": "Invalid JSON"}, 400)
    token = body.get("token")
    if not token:
        return relay_response({"error": "Missing token"}, 400)
    store_payload(token, body, "o2f")
    return relay_response({"ok": True, "token": token})


@router.get("/figma-payload-latest")
async def get_payload_latest():
    """Figma plugin polls for the most recent unacked Osyle→Figma payload.
    Returns {} (not 404) when nothing is pending — avoids console noise."""
    try:
        resp = get_table().scan(
            FilterExpression=Attr("direction").eq("o2f") & Attr("acked").eq(False)
        )
    except ClientError as e:
        return relay_response({"error": str(e)}, 500)
    items = resp.get("Items", [])
    if not items:
        return relay_response({})
    latest = max(items, key=lambda i: i.get("ttl", 0))
    return relay_response(fetch_payload_json(latest))


@router.post("/figma-ack/{token}")
async def ack_payload(token: str):
    """Figma plugin ACKs receipt — marks payload as consumed."""
    get_table().update_item(
        Key={"token": token},
        UpdateExpression="SET acked = :t",
        ExpressionAttributeValues={":t": True},
    )
    return relay_response({"ok": True})


@router.get("/figma-ack/{token}")
async def check_ack(token: str):
    """Osyle polls to confirm Figma received the payload."""
    resp = get_table().get_item(Key={"token": token})
    item = resp.get("Item")
    if not item or not item.get("acked"):
        return relay_response({"error": "No ACK yet"}, 404)
    get_table().delete_item(Key={"token": token})
    if "s3_key" in item:
        get_s3().delete_object(Bucket=S3_BUCKET, Key=item["s3_key"])
    return relay_response({"ok": True})


# ── Figma → Osyle ─────────────────────────────────────────────────────────────

@router.post("/figma-import-payload")
async def store_import_payload(request: Request):
    """Figma plugin stores a frame payload destined for Osyle."""
    try:
        body = await request.json()
    except Exception:
        return relay_response({"error": "Invalid JSON"}, 400)
    token = body.get("token")
    if not token:
        return relay_response({"error": "Missing token"}, 400)
    store_payload(token, body, "f2o")
    return relay_response({"ok": True, "token": token})


@router.get("/figma-import-latest")
async def get_import_latest():
    """Osyle polls for the most recent unacked Figma→Osyle payload."""
    try:
        resp = get_table().scan(
            FilterExpression=Attr("direction").eq("f2o") & Attr("acked").eq(False)
        )
    except ClientError as e:
        return relay_response({"error": str(e)}, 500)
    items = resp.get("Items", [])
    if not items:
        return relay_response({"error": "No pending import"}, 404)
    latest = max(items, key=lambda i: i.get("ttl", 0))
    return relay_response(fetch_payload_json(latest))


@router.post("/figma-import-ack/{token}")
async def ack_import(token: str):
    """Osyle ACKs import receipt — removes from queue."""
    resp = get_table().get_item(Key={"token": token})
    item = resp.get("Item", {})
    get_table().delete_item(Key={"token": token})
    if "s3_key" in item:
        get_s3().delete_object(Bucket=S3_BUCKET, Key=item["s3_key"])
    return relay_response({"ok": True})