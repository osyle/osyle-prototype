"""
Mobbin API Router for FastAPI
Handles authentication and data fetching from Mobbin
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from typing import Optional, List
import os

from app.mobbin_api import MobbinAPI, Token

router = APIRouter(prefix="/api/mobbin", tags=["mobbin"])

# In-memory token storage (use Redis or database in production)
_mobbin_tokens = {}


class SendCodeRequest(BaseModel):
    email: EmailStr


class VerifyCodeRequest(BaseModel):
    email: EmailStr
    code: str


class PasswordLoginRequest(BaseModel):
    email: EmailStr
    password: str


class AppsQueryRequest(BaseModel):
    email: EmailStr
    page: int = 1
    page_size: int = 24
    platform: str = "ios"
    categories: Optional[List[str]] = None
    styles: Optional[List[str]] = None


class TokenResponse(BaseModel):
    email: str
    message: str


class AppResponse(BaseModel):
    id: str
    name: str
    category: str
    logo_url: str
    tagline: str
    platform: str
    preview_urls: List[str]


class ScreenResponse(BaseModel):
    id: str
    number: int
    url: str
    elements: Optional[List[str]]
    patterns: Optional[List[str]]


class FlowResponse(BaseModel):
    id: str
    name: str
    screen_count: int


async def get_mobbin_api(email: str) -> MobbinAPI:
    """Get authenticated Mobbin API instance"""
    if email not in _mobbin_tokens:
        raise HTTPException(status_code=401, detail="Not authenticated with Mobbin")
    
    token = _mobbin_tokens[email]
    api = MobbinAPI(email=email, token=token)
    
    # Refresh if expired
    if token.is_expired():
        try:
            await api.refresh_token()
            _mobbin_tokens[email] = api.token
        except Exception as e:
            del _mobbin_tokens[email]
            raise HTTPException(status_code=401, detail="Token expired, please re-authenticate")
    
    return api


@router.post("/auth/send-code", response_model=TokenResponse)
async def send_verification_code(request: SendCodeRequest):
    """Send Mobbin verification code to email"""
    try:
        api = MobbinAPI(email=request.email)
        await api.send_email()
        await api.close()
        
        return TokenResponse(
            email=request.email,
            message="Verification code sent to your email"
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send code: {str(e)}")


@router.post("/auth/check-method")
async def check_auth_method(request: SendCodeRequest):
    """Check which authentication method is required for the email"""
    try:
        api = MobbinAPI(email=request.email)
        requires_password = await api.should_use_password()
        await api.close()
        
        return {
            "email": request.email,
            "requires_password": requires_password,
            "auth_method": "password" if requires_password else "magic_link"
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        import traceback
        error_detail = f"Failed to check auth method: {str(e)}\n{traceback.format_exc()}"
        print(error_detail)  # Log to console
        raise HTTPException(status_code=500, detail=f"Failed to check auth method: {str(e)}")


@router.post("/auth/login-password", response_model=TokenResponse)
async def login_with_password(request: PasswordLoginRequest):
    """Login with email and password"""
    try:
        api = MobbinAPI(email=request.email)
        token = await api.login_with_password(request.password)
        
        # Store token
        _mobbin_tokens[request.email] = token
        
        await api.close()
        
        return TokenResponse(
            email=request.email,
            message="Successfully authenticated with Mobbin"
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Login failed: {str(e)}")


@router.post("/auth/verify", response_model=TokenResponse)
async def verify_code(request: VerifyCodeRequest):
    """Verify Mobbin OTP code and authenticate"""
    try:
        api = MobbinAPI(email=request.email)
        token = await api.verify(request.code)
        
        # Store token
        _mobbin_tokens[request.email] = token
        
        await api.close()
        
        return TokenResponse(
            email=request.email,
            message="Successfully authenticated with Mobbin"
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Verification failed: {str(e)}")


@router.get("/auth/status")
async def check_auth_status(email: str):
    """Check if user is authenticated with Mobbin"""
    is_authenticated = email in _mobbin_tokens
    
    if is_authenticated:
        token = _mobbin_tokens[email]
        return {
            "authenticated": True,
            "email": email,
            "token_expired": token.is_expired()
        }
    
    return {
        "authenticated": False,
        "email": email
    }


@router.post("/apps/query")
async def query_apps(request: AppsQueryRequest):
    """Query Mobbin apps with filters and pagination"""
    try:
        api = await get_mobbin_api(request.email)
        
        # Fetch pages up to requested page
        all_apps = []
        last_app = None
        
        for page_num in range(request.page):
            apps = await api.query_apps_page(
                last_app=last_app,
                page_size=request.page_size,
                platform=request.platform,
                categories=request.categories,
                styles=request.styles
            )
            
            if not apps:
                break
            
            all_apps.extend(apps)
            last_app = apps[-1]
        
        # Return only current page
        start_idx = (request.page - 1) * request.page_size
        end_idx = start_idx + request.page_size
        current_page = all_apps[start_idx:end_idx] if start_idx < len(all_apps) else []
        
        await api.close()
        
        return {
            "apps": [
                AppResponse(
                    id=app.id,
                    name=app.app_name,
                    category=app.app_category,
                    logo_url=app.app_logo_url,
                    tagline=app.app_tagline,
                    platform=app.platform,
                    preview_urls=app.preview_screen_urls
                )
                for app in current_page
            ],
            "page": request.page,
            "page_size": request.page_size,
            "total_in_page": len(current_page),
            "has_more": len(all_apps) == request.page * request.page_size
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch apps: {str(e)}")


@router.get("/apps/count")
async def get_apps_count(email: str, platform: str = "ios"):
    """Get total count of apps"""
    try:
        api = await get_mobbin_api(email)
        count = await api.get_ios_apps_count()
        await api.close()
        
        return {
            "platform": platform,
            "count": count
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get count: {str(e)}")


@router.get("/apps/{app_id}/screens")
async def get_app_screens(app_id: str, email: str):
    """Get all screens for a specific app"""
    try:
        api = await get_mobbin_api(email)
        
        # Need to fetch the app first to get the App object
        # This is a simplified approach - you might want to cache apps
        apps = await api.query_apps_page(page_size=100)
        app = next((a for a in apps if a.id == app_id), None)
        
        if not app:
            # Try fetching more pages
            last_app = apps[-1] if apps else None
            for _ in range(10):  # Try up to 10 more pages
                more_apps = await api.query_apps_page(last_app=last_app, page_size=100)
                if not more_apps:
                    break
                app = next((a for a in more_apps if a.id == app_id), None)
                if app:
                    break
                last_app = more_apps[-1]
        
        if not app:
            raise HTTPException(status_code=404, detail="App not found")
        
        screens = await api.get_ios_screens(app)
        await api.close()
        
        return {
            "app": {
                "id": app.id,
                "name": app.app_name,
                "logo": app.app_logo_url
            },
            "screens": [
                ScreenResponse(
                    id=screen.id,
                    number=screen.screen_number,
                    url=screen.screen_url,
                    elements=screen.screen_elements,
                    patterns=screen.screen_patterns
                )
                for screen in screens
            ],
            "total": len(screens)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch screens: {str(e)}")


@router.get("/apps/{app_id}/flows")
async def get_app_flows(app_id: str, email: str):
    """Get all flows for a specific app"""
    try:
        api = await get_mobbin_api(email)
        
        # Fetch app (same logic as screens endpoint)
        apps = await api.query_apps_page(page_size=100)
        app = next((a for a in apps if a.id == app_id), None)
        
        if not app:
            last_app = apps[-1] if apps else None
            for _ in range(10):
                more_apps = await api.query_apps_page(last_app=last_app, page_size=100)
                if not more_apps:
                    break
                app = next((a for a in more_apps if a.id == app_id), None)
                if app:
                    break
                last_app = more_apps[-1]
        
        if not app:
            raise HTTPException(status_code=404, detail="App not found")
        
        flows = await api.get_ios_flows(app)
        await api.close()
        
        return {
            "app": {
                "id": app.id,
                "name": app.app_name,
                "logo": app.app_logo_url
            },
            "flows": [
                FlowResponse(
                    id=flow.id,
                    name=flow.name,
                    screen_count=len(flow.screens)
                )
                for flow in flows
            ],
            "total": len(flows)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch flows: {str(e)}")


@router.delete("/auth/logout")
async def logout(email: str):
    """Logout from Mobbin (clear stored token)"""
    if email in _mobbin_tokens:
        del _mobbin_tokens[email]
        return {"message": "Logged out successfully"}
    
    return {"message": "No active session found"}