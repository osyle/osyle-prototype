"""
WebSocket Lambda Handler for API Gateway WebSocket Events
Handles $connect, $disconnect, and $default routes
"""
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
        
        # Get JWKS
        jwks = get_jwks()
        if not jwks:
            print("Failed to fetch JWKS")
            return None
        
        # Get key ID from token
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")
        
        # Find matching key
        key = None
        for jwk in jwks.get("keys", []):
            if jwk.get("kid") == kid:
                key = jwt.algorithms.RSAAlgorithm.from_jwk(json.dumps(jwk))
                break
        
        if not key:
            print("No matching key found")
            return None
        
        # Verify token
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
        
        # Check email domain
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
    Handle API Gateway WebSocket events
    
    IMPORTANT: API Gateway V2 WebSocket events have a different structure!
    
    Event structure for WebSocket:
    {
        "requestContext": {
            "routeKey": "$connect" | "$disconnect" | "$default",
            "connectionId": "abc123",  # <-- This is in requestContext for WebSocket
            "domainName": "n6m806tmzk.execute-api.us-east-1.amazonaws.com",
            "stage": "production",
            "apiId": "n6m806tmzk",
            ...
        },
        "queryStringParameters": { "token": "..." },  # Only on $connect
        "body": "{...}"  # Only on $default
    }
    """
    
    # Print full event for debugging
    print(f"Full event: {json.dumps(event)}")
    
    request_context = event.get("requestContext", {})
    route_key = request_context.get("routeKey")
    
    # IMPORTANT: connectionId is in requestContext for WebSocket API Gateway V2
    connection_id = request_context.get("connectionId")
    
    # For WebSocket, these are also in requestContext
    domain_name = request_context.get("domainName")
    stage = request_context.get("stage")
    
    print(f"WebSocket event - Route: {route_key}, Connection: {connection_id}")
    
    if not connection_id:
        print("ERROR: No connectionId found in event!")
        print(f"requestContext keys: {request_context.keys()}")
        return {"statusCode": 400, "body": "Missing connectionId"}
    
    # Initialize API Gateway Management API for sending messages
    endpoint_url = f"https://{domain_name}/{stage}"
    apigw_management = boto3.client(
        'apigatewaymanagementapi',
        endpoint_url=endpoint_url
    )
    
    # Handle different routes
    if route_key == "$connect":
        return handle_connect(event, request_context, connection_id)
    
    elif route_key == "$disconnect":
        return handle_disconnect(event, request_context, connection_id)
    
    elif route_key == "$default":
        return handle_message(event, request_context, apigw_management, connection_id)
    
    else:
        print(f"Unknown route key: {route_key}")
        return {"statusCode": 400, "body": "Unknown route"}


def handle_connect(event: Dict[str, Any], request_context: Dict[str, Any], connection_id: str) -> Dict[str, Any]:
    """Handle WebSocket connection request"""
    
    # Get token from query string
    query_params = event.get("queryStringParameters") or {}
    token = query_params.get("token")
    
    if not token:
        print(f"Connection {connection_id}: No token provided")
        return {
            "statusCode": 401,
            "body": "Unauthorized: No token provided"
        }
    
    # Verify token
    user = verify_websocket_token(token)
    
    if not user:
        print(f"Connection {connection_id}: Invalid token")
        return {
            "statusCode": 403,
            "body": "Forbidden: Invalid token"
        }
    
    user_id = user.get("sub")
    email = user.get("email")
    
    print(f"Connection {connection_id}: Authenticated as {email} (user_id: {user_id})")
    
    # TODO: Store connection_id -> user_id mapping in DynamoDB for later use
    # This allows you to identify which user sent a message
    
    return {
        "statusCode": 200,
        "body": "Connected"
    }


def handle_disconnect(event: Dict[str, Any], request_context: Dict[str, Any], connection_id: str) -> Dict[str, Any]:
    """Handle WebSocket disconnection"""
    
    print(f"Connection {connection_id}: Disconnected")
    
    # TODO: Remove connection_id from DynamoDB
    
    return {
        "statusCode": 200,
        "body": "Disconnected"
    }


def handle_message(
    event: Dict[str, Any],
    request_context: Dict[str, Any],
    apigw_management: Any,
    connection_id: str
) -> Dict[str, Any]:
    """Handle WebSocket message"""
    
    try:
        # Parse message body
        body = event.get("body", "{}")
        message = json.loads(body)
        
        action = message.get("action")
        data = message.get("data", {})
        
        print(f"Connection {connection_id}: Action '{action}' with data keys: {data.keys()}")
        
        # TODO: Get user_id from DynamoDB using connection_id
        # For now, we'll need to pass it in the message or re-authenticate
        
        # Send acknowledgment
        send_message(apigw_management, connection_id, {
            "type": "progress",
            "stage": "received",
            "message": f"Processing action: {action}"
        })
        
        # Route to appropriate handler
        if action == "build-dtr":
            handle_build_dtr(data, apigw_management, connection_id)
        elif action == "generate-ui":
            handle_generate_ui(data, apigw_management, connection_id)
        else:
            send_error(apigw_management, connection_id, f"Unknown action: {action}")
        
        return {"statusCode": 200}
        
    except json.JSONDecodeError as e:
        print(f"Invalid JSON: {e}")
        send_error(apigw_management, connection_id, "Invalid JSON in message body")
        return {"statusCode": 400}
        
    except Exception as e:
        print(f"Error handling message: {e}")
        import traceback
        traceback.print_exc()
        send_error(apigw_management, connection_id, str(e))
        return {"statusCode": 500}


def send_message(apigw_management: Any, connection_id: str, data: Dict[str, Any]):
    """Send message to WebSocket client"""
    try:
        apigw_management.post_to_connection(
            ConnectionId=connection_id,
            Data=json.dumps(data)
        )
        print(f"Sent message to {connection_id}: {data.get('type', 'unknown')}")
    except apigw_management.exceptions.GoneException:
        print(f"Connection {connection_id} is no longer available")
    except Exception as e:
        print(f"Failed to send message to {connection_id}: {e}")


def send_error(apigw_management: Any, connection_id: str, error: str):
    """Send error message to client"""
    send_message(apigw_management, connection_id, {
        "type": "error",
        "error": error
    })


def handle_build_dtr(data: Dict[str, Any], apigw_management: Any, connection_id: str):
    """Handle build-dtr action"""
    # Import your existing handler
    from app.websocket_handler import handle_build_dtr as build_dtr_logic
    
    # Create a wrapper that sends messages via API Gateway Management API
    class WebSocketWrapper:
        def __init__(self, apigw, conn_id):
            self.apigw = apigw
            self.conn_id = conn_id
        
        async def send_json(self, data):
            send_message(self.apigw, self.conn_id, data)
        
        async def accept(self):
            pass
        
        async def close(self):
            pass
    
    websocket = WebSocketWrapper(apigw_management, connection_id)
    
    # TODO: Get user_id from connection mapping in DynamoDB
    # For now, require it in the message data
    user_id = data.get("user_id")
    
    if not user_id:
        send_error(apigw_management, connection_id, "user_id required in message data")
        return
    
    # Run the handler
    import asyncio
    try:
        asyncio.run(build_dtr_logic(websocket, data, user_id))
    except Exception as e:
        print(f"Error in build_dtr_logic: {e}")
        import traceback
        traceback.print_exc()
        send_error(apigw_management, connection_id, str(e))


def handle_generate_ui(data: Dict[str, Any], apigw_management: Any, connection_id: str):
    """Handle generate-ui action"""
    # Similar to build_dtr
    from app.websocket_handler import handle_generate_ui as generate_ui_logic
    
    class WebSocketWrapper:
        def __init__(self, apigw, conn_id):
            self.apigw = apigw
            self.conn_id = conn_id
        
        async def send_json(self, data):
            send_message(self.apigw, self.conn_id, data)
        
        async def accept(self):
            pass
        
        async def close(self):
            pass
    
    websocket = WebSocketWrapper(apigw_management, connection_id)
    
    user_id = data.get("user_id")
    
    if not user_id:
        send_error(apigw_management, connection_id, "user_id required in message data")
        return
    
    import asyncio
    try:
        asyncio.run(generate_ui_logic(websocket, data, user_id))
    except Exception as e:
        print(f"Error in generate_ui_logic: {e}")
        import traceback
        traceback.print_exc()
        send_error(apigw_management, connection_id, str(e))
