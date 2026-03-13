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
"""
import os
import json
import time
import boto3
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
from boto3.dynamodb.conditions import Attr
from botocore.exceptions import ClientError

router = APIRouter(prefix="/relay", tags=["relay"])

REGION     = os.getenv("AWS_REGION", "us-east-1")
ENV        = os.getenv("ENVIRONMENT", "Prod")
TABLE_NAME = f"OsyleFigmaRelay-{ENV}"
TTL_SECS   = 10 * 60  # 10 minutes

_table = None

def get_table():
    global _table
    if _table is None:
        kwargs = {"region_name": REGION}
        endpoint = os.getenv("DYNAMODB_ENDPOINT_URL")
        if endpoint:
            kwargs["endpoint_url"] = endpoint
        _table = boto3.resource("dynamodb", **kwargs).Table(TABLE_NAME)
    return _table

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
async def store_payload(request: Request):
    """Osyle stores an export payload destined for the Figma plugin."""
    try:
        body = await request.json()
    except Exception:
        return relay_response({"error": "Invalid JSON"}, 400)
    token = body.get("token")
    if not token:
        return relay_response({"error": "Missing token"}, 400)
    get_table().put_item(Item={
        "token": token,
        "payload_json": json.dumps(body),
        "direction": "o2f",
        "acked": False,
        "ttl": ttl_epoch(),
    })
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
    return relay_response(json.loads(latest["payload_json"]))


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
    get_table().put_item(Item={
        "token": token,
        "payload_json": json.dumps(body),
        "direction": "f2o",
        "acked": False,
        "ttl": ttl_epoch(),
    })
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
    return relay_response(json.loads(latest["payload_json"]))


@router.post("/figma-import-ack/{token}")
async def ack_import(token: str):
    """Osyle ACKs import receipt — removes from queue."""
    get_table().delete_item(Key={"token": token})
    return relay_response({"ok": True})