from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum
import jwt
import requests
from functools import lru_cache

app = FastAPI()

# CORS for Amplify
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure with your Amplify URL later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# JWT verification
@lru_cache()
def get_jwks(region: str, user_pool_id: str):
    url = f"https://cognito-idp.{region}.amazonaws.com/{user_pool_id}/.well-known/jwks.json"
    return requests.get(url).json()

async def verify_token(authorization: str):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization.split(" ")[1]
    # Add JWT verification logic here
    return token

@app.get("/")
async def root():
    return {"message": "Osyle API is running"}

@app.get("/api/protected")
async def protected_route(token: str = Depends(verify_token)):
    return {"message": "This is a protected route", "user": "authenticated"}

@app.get("/api/health")
async def health():
    return {"status": "healthy"}

# Lambda handler
handler = Mangum(app)