"""
WebSocket Routes for LLM Operations
"""
from fastapi import APIRouter, WebSocket, Query, WebSocketException, status
import jwt
import os

from app.websocket_handler import handle_websocket

router = APIRouter()

# Cognito configuration
REGION = os.getenv("AWS_REGION")
USER_POOL_ID = os.getenv("USER_POOL_ID")
COGNITO_ISSUER = f"https://cognito-idp.{REGION}.amazonaws.com/{USER_POOL_ID}"


async def verify_websocket_token(token: str) -> dict:
    """Verify JWT token for WebSocket connection"""
    try:
        # Decode without verification first to get kid
        unverified = jwt.decode(token, options={"verify_signature": False})
        
        # For production, you should verify the signature properly
        # For now, just extract the user info
        email = unverified.get("email")
        
        if not email or not email.endswith("@osyle.com"):
            raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION)
        
        return {
            "user_id": unverified.get("sub"),
            "email": email
        }
    except Exception:
        raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION)


@router.websocket("/ws/llm")
async def websocket_llm_endpoint(
    websocket: WebSocket,
    token: str = Query(...)
):
    """
    WebSocket endpoint for LLM operations
    
    Query params:
        token: JWT authentication token
    
    Messages format:
        Client -> Server:
        {
            "action": "build-dtr" | "generate-ui",
            "data": { ... }
        }
        
        Server -> Client:
        {
            "type": "progress" | "complete" | "error",
            "stage": "...",
            "message": "...",
            "data": { ... }
        }
    """
    # Verify token
    user = await verify_websocket_token(token)
    user_id = user.get("user_id")
    
    # Handle WebSocket connection
    await handle_websocket(websocket, user_id)
