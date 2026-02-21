"""
WebSocket Lambda Handler for API Gateway WebSocket Events
Handles $connect, $disconnect, and $default routes
"""
import asyncio
import boto3
import json
import jwt
import os
from typing import Dict, Any


def get_jwks():
    """Fetch JSON Web Key Set from Cognito"""
    import requests

    region = os.getenv("AWS_REGION", "us-east-1")
    user_pool_id = os.getenv("USER_POOL_ID")

    url = f"https://cognito-idp.{region}.amazonaws.com/{user_pool_id}/.well-known/jwks.json"
    try:
        response = requests.get(url, timeout=5)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"Failed to fetch JWKS: {e}")
        return None


def verify_websocket_token(token: str) -> Dict[str, Any]:
    """Verify JWT token for WebSocket connection"""
    try:
        region = os.getenv("AWS_REGION", "us-east-1")
        user_pool_id = os.getenv("USER_POOL_ID")
        issuer = f"https://cognito-idp.{region}.amazonaws.com/{user_pool_id}"

        jwks = get_jwks()
        if not jwks:
            print("Failed to fetch JWKS")
            return None

        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")

        key = None
        for jwk in jwks.get("keys", []):
            if jwk.get("kid") == kid:
                key = jwt.algorithms.RSAAlgorithm.from_jwk(json.dumps(jwk))
                break

        if not key:
            print("No matching key found")
            return None

        payload = jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            issuer=issuer,
            options={
                "verify_exp": True,
                "verify_aud": False
            }
        )

        email = payload.get("email")
        if not email or not email.endswith("@osyle.com"):
            print(f"Invalid email domain: {email}")
            return None

        return payload

    except jwt.ExpiredSignatureError:
        print("Token has expired")
        return None
    except jwt.InvalidTokenError as e:
        print(f"Invalid token: {e}")
        return None
    except Exception as e:
        print(f"Token verification failed: {e}")
        return None


def handle_websocket_event(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Handle API Gateway WebSocket events.

    Event structure for WebSocket:
    {
        "requestContext": {
            "routeKey": "$connect" | "$disconnect" | "$default",
            "connectionId": "abc123",
            "domainName": "n6m806tmzk.execute-api.us-east-1.amazonaws.com",
            "stage": "production",
            ...
        },
        "queryStringParameters": { "token": "..." },  # Only on $connect
        "body": "{...}"                                # Only on $default
    }
    """
    print(f"Full event: {json.dumps(event)}")

    request_context = event.get("requestContext", {})
    route_key = request_context.get("routeKey")
    connection_id = request_context.get("connectionId")
    domain_name = request_context.get("domainName")
    stage = request_context.get("stage")

    print(f"WebSocket event - Route: {route_key}, Connection: {connection_id}")

    if not connection_id:
        print("ERROR: No connectionId found in event!")
        print(f"requestContext keys: {request_context.keys()}")
        return {"statusCode": 400, "body": "Missing connectionId"}

    endpoint_url = f"https://{domain_name}/{stage}"
    apigw_management = boto3.client(
        "apigatewaymanagementapi",
        endpoint_url=endpoint_url
    )

    if route_key == "$connect":
        return handle_connect(event, request_context, connection_id)
    elif route_key == "$disconnect":
        return handle_disconnect(event, request_context, connection_id)
    elif route_key == "$default":
        return handle_message(event, request_context, apigw_management, connection_id)
    else:
        print(f"Unknown route key: {route_key}")
        return {"statusCode": 400, "body": "Unknown route"}


def handle_connect(
    event: Dict[str, Any],
    request_context: Dict[str, Any],
    connection_id: str
) -> Dict[str, Any]:
    """Handle WebSocket connection request"""
    query_params = event.get("queryStringParameters") or {}
    token = query_params.get("token")

    if not token:
        print(f"Connection {connection_id}: No token provided")
        return {"statusCode": 401, "body": "Unauthorized: No token provided"}

    user = verify_websocket_token(token)
    if not user:
        print(f"Connection {connection_id}: Invalid token")
        return {"statusCode": 403, "body": "Forbidden: Invalid token"}

    user_id = user.get("sub")
    email = user.get("email")
    print(f"Connection {connection_id}: Authenticated as {email} (user_id: {user_id})")

    # TODO: Persist connection_id -> user_id in DynamoDB so handle_message
    # can look up user_id without requiring it in every payload.

    return {"statusCode": 200, "body": "Connected"}


def handle_disconnect(
    event: Dict[str, Any],
    request_context: Dict[str, Any],
    connection_id: str
) -> Dict[str, Any]:
    """Handle WebSocket disconnection"""
    print(f"Connection {connection_id}: Disconnected")
    # TODO: Remove connection_id from DynamoDB
    return {"statusCode": 200, "body": "Disconnected"}


def send_message(apigw_management: Any, connection_id: str, data: Dict[str, Any]):
    """Send a message to a WebSocket client via API Gateway Management API"""
    try:
        apigw_management.post_to_connection(
            ConnectionId=connection_id,
            Data=json.dumps(data)
        )
        print(f"Sent message to {connection_id}: type={data.get('type', 'unknown')}")
    except Exception as e:
        # GoneException -> client already disconnected; other errors logged but not fatal
        print(f"Failed to send message to {connection_id}: {e}")


def send_error(apigw_management: Any, connection_id: str, error: str):
    """Send an error message to a WebSocket client"""
    send_message(apigw_management, connection_id, {"type": "error", "error": error})


class LambdaWebSocketAdapter:
    """
    Thin shim that lets the async action handlers in handler.py run inside
    Lambda without any changes.

    The individual handlers (handle_build_dtr, handle_generate_flow, etc.)
    only ever call `await websocket.send_json(...)`.  This adapter satisfies
    that interface by forwarding to apigw_management.post_to_connection.
    """

    def __init__(self, apigw_management: Any, connection_id: str):
        self.apigw_management = apigw_management
        self.connection_id = connection_id

    async def send_json(self, data: Dict[str, Any]):
        try:
            self.apigw_management.post_to_connection(
                ConnectionId=self.connection_id,
                Data=json.dumps(data)
            )
        except Exception as e:
            # GoneException means client disconnected mid-stream - not a real error
            print(f"send_json to {self.connection_id} failed: {e}")


def handle_message(
    event: Dict[str, Any],
    request_context: Dict[str, Any],
    apigw_management: Any,
    connection_id: str
) -> Dict[str, Any]:
    """
    Route an incoming $default WebSocket message to the correct action handler.

    All heavy lifting is delegated to the shared async handlers in handler.py
    via LambdaWebSocketAdapter so there is a single implementation for both
    the local FastAPI server and Lambda.
    """
    try:
        body = event.get("body", "{}")
        message = json.loads(body)

        action = message.get("action")
        data = message.get("data", {})

        print(f"Connection {connection_id}: action='{action}' data_keys={list(data.keys())}")

        # Acknowledge receipt so the client knows the message arrived
        send_message(apigw_management, connection_id, {
            "type": "progress",
            "stage": "received",
            "message": f"Processing action: {action}"
        })

        # user_id must be included in every message payload by the client
        # (until $connect stores it in DynamoDB and we can look it up by connectionId)
        user_id = data.get("user_id")
        if not user_id:
            send_error(apigw_management, connection_id, "user_id required in message data")
            return {"statusCode": 400}

        # Build the adapter so handler.py functions receive a websocket-like object
        adapter = LambdaWebSocketAdapter(apigw_management, connection_id)

        # Import the shared handlers (imported here to avoid circular imports at
        # module load time and to keep Lambda cold-start overhead minimal)
        from app.websockets import handler as ws_handler

        async def run():
            if action == "build-dtr":
                await ws_handler.handle_build_dtr(adapter, data, user_id)
            elif action == "generate-ui":
                await ws_handler.handle_generate_ui(adapter, data, user_id)
            elif action == "generate-flow":
                await ws_handler.handle_generate_flow(adapter, data, user_id)
            elif action == "iterate-ui":
                await ws_handler.handle_iterate_ui(adapter, data, user_id)
            elif action == "copy-message":
                await ws_handler.handle_copy_message(adapter, data, user_id)
            elif action == "finalize-copy":
                await ws_handler.handle_finalize_copy(adapter, data, user_id)
            else:
                send_error(apigw_management, connection_id, f"Unknown action: {action}")

        asyncio.run(run())

        return {"statusCode": 200}

    except json.JSONDecodeError as e:
        print(f"Invalid JSON in message body: {e}")
        send_error(apigw_management, connection_id, "Invalid JSON in message body")
        return {"statusCode": 400}

    except Exception as e:
        import traceback
        print(f"Error handling message: {e}")
        traceback.print_exc()
        send_error(apigw_management, connection_id, str(e))
        return {"statusCode": 500}