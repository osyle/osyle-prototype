"""
Authentication helpers for Osyle API
Extracts and validates user information from Cognito JWT tokens
"""
from fastapi import Depends, HTTPException, Header
from typing import Optional
import jwt
import requests
from functools import lru_cache
import json


# ============================================================================
# COGNITO CONFIGURATION
# ============================================================================

REGION = "us-east-1"
USER_POOL_ID = "us-east-1_KZwi3uUTn"
COGNITO_ISSUER = f"https://cognito-idp.{REGION}.amazonaws.com/{USER_POOL_ID}"


# ============================================================================
# JWT KEY MANAGEMENT
# ============================================================================

@lru_cache()
def get_jwks():
    """Fetch and cache JSON Web Key Set from Cognito"""
    url = f"{COGNITO_ISSUER}/.well-known/jwks.json"
    try:
        response = requests.get(url, timeout=5)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"Error fetching JWKS: {e}")
        return None


# ============================================================================
# TOKEN VERIFICATION
# ============================================================================

def verify_token(authorization: Optional[str] = Header(None)) -> dict:
    """
    Verify JWT token from Cognito and extract user information
    
    Args:
        authorization: Authorization header (Bearer token)
    
    Returns:
        Dictionary containing user information (user_id, email, name, etc.)
    
    Raises:
        HTTPException: If token is invalid or missing
    """
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
            token,
            key,
            algorithms=["RS256"],
            issuer=COGNITO_ISSUER,
            options={
                "verify_exp": True,
                "verify_aud": False
            }
        )
        
        email = payload.get("email")
        
        if not email:
            raise HTTPException(
                status_code=403,
                detail="Email not found in token"
            )
        
        if not email.endswith("@osyle.com"):
            raise HTTPException(
                status_code=403,
                detail="Only @osyle.com accounts allowed"
            )
        
        return payload
        
    except HTTPException:
        raise
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Authentication failed: {str(e)}")


# ============================================================================
# USER EXTRACTION DEPENDENCIES
# ============================================================================

def get_current_user(token_payload: dict = Depends(verify_token)) -> dict:
    """
    FastAPI dependency to get current authenticated user
    
    Returns:
        Dictionary with user_id, email, name, picture
    """
    return {
        "user_id": token_payload.get("sub"),  # Cognito sub is the stable user ID
        "email": token_payload.get("email"),
        "name": token_payload.get("name"),
        "picture": token_payload.get("picture")
    }


def get_user_id(user: dict = Depends(get_current_user)) -> str:
    """
    FastAPI dependency to get just the user_id
    Useful for simple endpoints that only need the ID
    """
    return user["user_id"]
