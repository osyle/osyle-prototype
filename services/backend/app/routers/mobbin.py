"""
Mobbin API Router for FastAPI
Uses MobbinService for automatic authentication from environment variables
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List

from app.mobbin_service import mobbin_service

router = APIRouter(prefix="/api/mobbin", tags=["mobbin"])


class AppsQueryRequest(BaseModel):
    page: int = 1
    page_size: int = 24
    platform: str = "ios"
    categories: Optional[List[str]] = None
    styles: Optional[List[str]] = None


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


@router.get("/status")
async def get_status():
    """Check Mobbin service status"""
    is_configured = mobbin_service.is_configured()
    is_authenticated = await mobbin_service.ensure_authenticated()
    error_message = mobbin_service.get_auth_error()
    
    return {
        "configured": is_configured,
        "authenticated": is_authenticated,
        "email": mobbin_service._email if is_configured else None,
        "error": error_message,
        "note": "Mobbin authentication is currently not working due to API changes. The password endpoint returns 401 Unauthorized. Mobbin primarily uses OTP/Magic Link authentication which cannot be automated."
    }


@router.post("/apps/query")
async def query_apps(request: AppsQueryRequest):
    """Query Mobbin apps with filters and pagination"""
    try:
        api = await mobbin_service.get_api()
        
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
    except Exception as e:
        import traceback
        print("="*70)
        print(f"ERROR in query_apps: {str(e)}")
        print(traceback.format_exc())
        print("="*70)
        raise HTTPException(status_code=500, detail=f"Failed to fetch apps: {str(e)}")


@router.get("/apps/count")
async def get_apps_count(platform: str = "ios"):
    """Get total count of apps"""
    try:
        api = await mobbin_service.get_api()
        count = await api.get_ios_apps_count()
        
        return {
            "platform": platform,
            "count": count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get count: {str(e)}")


@router.get("/apps/{app_id}/screens")
async def get_app_screens(app_id: str):
    """Get all screens for a specific app"""
    try:
        api = await mobbin_service.get_api()
        
        # Need to fetch the app first to get the App object
        apps = await api.query_apps_page(page_size=100)
        app = next((a for a in apps if a.id == app_id), None)
        
        if not app:
            # Try fetching more pages
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
        
        screens = await api.get_ios_screens(app)
        
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
async def get_app_flows(app_id: str):
    """Get all flows for a specific app"""
    try:
        api = await mobbin_service.get_api()
        
        # Fetch app
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