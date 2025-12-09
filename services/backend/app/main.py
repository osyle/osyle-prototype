from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum
import jwt
import requests
from functools import lru_cache
from typing import Optional
import json
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Osyle API", version="1.0.0")

# CORS for Amplify and local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# AWS Cognito configuration
REGION = "us-east-1"
USER_POOL_ID = "us-east-1_KZwi3uUTn"
COGNITO_ISSUER = f"https://cognito-idp.{REGION}.amazonaws.com/{USER_POOL_ID}"

@lru_cache()
def get_jwks():
    """Fetch and cache JSON Web Key Set from Cognito"""
    url = f"{COGNITO_ISSUER}/.well-known/jwks.json"
    try:
        response = requests.get(url, timeout=5)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        logger.error(f"Error fetching JWKS: {e}")
        return None

def verify_token(authorization: Optional[str] = Header(None)) -> dict:
    """Verify JWT token from Cognito"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")
    
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization.replace("Bearer ", "")
    
    try:
        # Get JWKS
        jwks = get_jwks()
        if not jwks:
            raise HTTPException(status_code=500, detail="Failed to fetch JWKS")
        
        # Decode header to get kid
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")
        
        # Find the correct key
        key = None
        for jwk in jwks.get("keys", []):
            if jwk.get("kid") == kid:
                key = jwt.algorithms.RSAAlgorithm.from_jwk(json.dumps(jwk))
                break
        
        if not key:
            raise HTTPException(status_code=401, detail="Invalid token key")
        
        # Verify and decode token
        # Skip audience validation - we validate issuer and signature which is sufficient
        payload = jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            issuer=COGNITO_ISSUER,
            options={
                "verify_exp": True,
                "verify_aud": False  # Skip audience validation
            }
        )
        
        logger.info(f"Token decoded successfully. Token contains: {list(payload.keys())}")
        
        # Get email from token
        email = payload.get("email")
        
        if not email:
            logger.error(f"No email found in token. Keys: {list(payload.keys())}")
            raise HTTPException(
                status_code=403,
                detail="Email not found in token"
            )
        
        logger.info(f"Email extracted: {email}")
        
        # Verify email domain
        if not email.endswith("@osyle.com"):
            logger.warning(f"Unauthorized email domain: {email}")
            raise HTTPException(
                status_code=403,
                detail="Only @osyle.com accounts allowed"
            )
        
        logger.info(f"User authenticated successfully: {email}")
        
        return payload
        
    except HTTPException:
        raise
    except jwt.ExpiredSignatureError:
        logger.warning("Token expired")
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError as e:
        logger.error(f"Invalid token: {str(e)}")
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")
    except Exception as e:
        logger.error(f"Authentication error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Authentication failed: {str(e)}")

@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "Osyle API is running", "version": "1.0.0"}

@app.get("/api/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy", "service": "osyle-api"}

@app.get("/api/protected")
async def protected_route(user: dict = Depends(verify_token)):
    """Protected endpoint - requires valid JWT"""
    return {
        "message": "Access granted to protected resource",
        "user": {
            "email": user.get("email"),
            "sub": user.get("sub"),
        }
    }

@app.get("/api/user/profile")
async def user_profile(user: dict = Depends(verify_token)):
    """Get user profile"""
    return {
        "email": user.get("email"),
        "email_verified": user.get("email_verified"),
        "sub": user.get("sub"),
        "cognito_username": user.get("cognito:username"),
    }

# Lambda handler
handler = Mangum(app)