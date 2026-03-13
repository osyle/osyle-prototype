from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum
import jwt
import requests
from functools import lru_cache
from typing import Optional
import json
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import routers
from app.routers import tastes, projects
from app.routers import dtm
from app.integrations.figma import relay as relay_router
from app.websockets.routes import router as ws_router
# from app.routers.mobbin import router as mobbin_router  # DISABLED: Uses Playwright

app = FastAPI(title="Osyle API", version="1.0.0")

@app.on_event("startup")
async def startup_event():
    print("="*70)
    print("STARTUP: Initializing Mobbin scraper...")
    print("="*70)
    """
    try:
        from app.integrations.mobbin.service import mobbin_scraper_service
        if mobbin_scraper_service.is_configured():
            await mobbin_scraper_service.get_scraper()
        else:
            print("⚠️ Mobbin credentials not configured")
    except Exception as e:
        print(f"⚠️ Failed to initialize Mobbin scraper: {e}")
    """
    print("="*70)

@app.on_event("shutdown")
async def shutdown_event():
    print("SHUTDOWN: Closing Mobbin scraper...")
    """
    try:
        from app.integrations.mobbin.service import mobbin_scraper_service
        await mobbin_scraper_service.close()
    except Exception as e:
        print(f"Error closing scraper: {e}")
    """

# Get ALLOWED_ORIGINS from environment
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*")
if ALLOWED_ORIGINS != "*":
    origins_list = [origin.strip() for origin in ALLOWED_ORIGINS.split(",")]
else:
    origins_list = ["*"]

print(f"CORS allowed origins: {origins_list}")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# AWS Cognito configuration from environment
REGION = os.getenv("AWS_REGION")
USER_POOL_ID = os.getenv("USER_POOL_ID")

if not REGION or not USER_POOL_ID:
    raise ValueError("AWS_REGION and USER_POOL_ID must be set in environment variables")

COGNITO_ISSUER = f"https://cognito-idp.{REGION}.amazonaws.com/{USER_POOL_ID}"

@lru_cache()
def get_jwks():
    url = f"{COGNITO_ISSUER}/.well-known/jwks.json"
    try:
        response = requests.get(url, timeout=5)
        response.raise_for_status()
        return response.json()
    except Exception:
        return None

def verify_token(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    token = authorization.replace("Bearer ", "")
    try:
        jwks = get_jwks()
        if not jwks:
            raise HTTPException(status_code=500, detail="Failed to fetch JWKS")
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")
        key = None
        for jwk in jwks.get("keys", []):
            if jwk.get("kid") == kid:
                key = jwt.algorithms.RSAAlgorithm.from_jwk(json.dumps(jwk))
                break
        if not key:
            raise HTTPException(status_code=401, detail="Invalid token key")
        payload = jwt.decode(
            token, key, algorithms=["RS256"], issuer=COGNITO_ISSUER,
            options={"verify_exp": True, "verify_aud": False}
        )
        email = payload.get("email")
        if not email:
            raise HTTPException(status_code=403, detail="Email not found in token")
        if not email.endswith("@osyle.com"):
            raise HTTPException(status_code=403, detail="Only @osyle.com accounts allowed")
        return payload
    except HTTPException:
        raise
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Authentication failed: {str(e)}")

@app.get("/")
async def root():
    return {"message": "Osyle API is running", "version": "1.0.0"}

@app.get("/api/health")
async def health():
    return {"status": "healthy", "service": "osyle-api"}

@app.get("/api/protected")
async def protected_route(user: dict = Depends(verify_token)):
    return {"message": "Access granted", "user": {"email": user.get("email"), "sub": user.get("sub")}}

@app.get("/api/user/profile")
async def user_profile(user: dict = Depends(verify_token)):
    return {
        "email": user.get("email"),
        "email_verified": user.get("email_verified"),
        "sub": user.get("sub"),
        "cognito_username": user.get("cognito:username"),
    }

# Include routers
app.include_router(tastes.router)
app.include_router(projects.router)
app.include_router(ws_router)
app.include_router(dtm.router)
app.include_router(relay_router.router)
# app.include_router(mobbin_router)  # DISABLED: Uses Playwright

# Create Mangum handler for HTTP events
mangum_handler = Mangum(app)


def handler(event, context):
    """
    Main Lambda handler — routes to HTTP or WebSocket handler.

    Relay CORS: Figma plugin UI runs in a sandboxed iframe with origin 'null'.
    CORSMiddleware rejects null origins. We stamp Access-Control-Allow-Origin: *
    directly onto the raw Lambda response dict for /relay/* paths — this runs
    after all middleware and is guaranteed to survive into the API Gateway response.
    """
    request_context = event.get("requestContext", {})
    route_key = request_context.get("routeKey", "")

    is_websocket = (
        route_key.startswith("$") or
        "connectionId" in request_context
    )
    is_http = "http" in request_context

    if is_websocket and not is_http:
        print(f"Detected WebSocket event: {route_key}")
        from app.websockets.lambda_handler import handle_websocket_event
        return handle_websocket_event(event, context)
    else:
        print(f"Detected HTTP event: {route_key}")
        response = mangum_handler(event, context)

        # Stamp CORS on relay routes at the raw Lambda response level.
        # Bypasses CORSMiddleware entirely — null origin is allowed here.
        path = event.get("rawPath", "")
        if path.startswith("/relay/"):
            if "headers" not in response:
                response["headers"] = {}
            response["headers"]["access-control-allow-origin"] = "*"
            response["headers"]["access-control-allow-methods"] = "GET, POST, OPTIONS"
            response["headers"]["access-control-allow-headers"] = "content-type"

        return response