"""
Mobbin Router - Web scraping based
Uses Playwright to scrape Mobbin.com with comprehensive search and content extraction
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from app.mobbin_scraper_service import mobbin_scraper_service


router = APIRouter(prefix="/api/mobbin", tags=["mobbin"])


# Request/Response Models
class SearchRequest(BaseModel):
    """Request model for searching apps"""
    query: str = Field(..., description="Search query (e.g., 'instagram', 'uber')")
    platform: str = Field("ios", description="Platform: ios or android")
    content_type: str = Field("apps", description="Content type: apps, screens, ui-elements, flows")


class AppSearchResult(BaseModel):
    """App search result with full metadata"""
    id: str
    name: str
    logo_url: Optional[str] = None
    platform: str
    version_id: Optional[str] = None
    url: str
    base_url: str


class AppsQueryRequest(BaseModel):
    platform: str = "ios"
    category: Optional[str] = None
    page: int = 1
    page_size: int = 24


class AppResponse(BaseModel):
    id: str
    name: str
    logo_url: Optional[str]
    category: Optional[str]
    url: str
    platform: str


class ScreenResponse(BaseModel):
    id: str
    screen_number: int
    image_url: str
    thumbnail_url: str
    title: Optional[str] = None
    tags: Optional[List[str]] = None


class UIElementResponse(BaseModel):
    id: str
    element_number: int
    image_url: str
    thumbnail_url: str
    title: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None


class FlowResponse(BaseModel):
    id: str
    flow_number: Optional[int] = None
    title: str
    thumbnail_url: Optional[str]
    url: Optional[str]
    metadata: Optional[str] = None
    tags: Optional[List[str]] = None


class FlowDetailResponse(BaseModel):
    title: Optional[str]
    description: Optional[str]
    screens: List[Dict[str, Any]]
    flow_tree: Optional[Dict[str, Any]]
    metadata: Dict[str, Any]


class FlowTreeNodeResponse(BaseModel):
    id: str
    title: str
    screen_count: int
    depth: int
    has_children: bool
    is_selected: bool
    order: int


class FlowTreeResponse(BaseModel):
    app_id: str
    version_id: str
    nodes: List[FlowTreeNodeResponse]
    total: int


class NodeScreenResponse(BaseModel):
    id: str
    screen_number: int
    image_url: str
    thumbnail_url: str
    label: Optional[str] = None
    dimensions: Optional[Dict[str, int]] = None


class SearchResponse(BaseModel):
    query: str
    platform: str
    content_type: str
    apps: List[AppSearchResult]
    total: int


@router.get("/status")
async def get_status():
    """Check Mobbin service status"""
    is_configured = mobbin_scraper_service.is_configured()
    
    return {
        "configured": is_configured,
        "method": "web_scraping",
        "browser": "playwright_chromium",
        "note": "Using web scraping - browser will launch on first request"
    }


@router.post("/search")
async def search_apps(request: SearchRequest):
    """
    Search for apps on Mobbin
    
    This is the primary search endpoint that searches Mobbin's database
    and returns apps matching the query.
    
    Example:
        POST /api/mobbin/search
        {
            "query": "instagram",
            "platform": "ios",
            "content_type": "apps"
        }
    """
    try:
        scraper = await mobbin_scraper_service.get_scraper()
        
        apps = await scraper.search_apps(
            query=request.query,
            platform=request.platform,
            content_type=request.content_type
        )
        
        return SearchResponse(
            query=request.query,
            platform=request.platform,
            content_type=request.content_type,
            apps=[
                AppSearchResult(
                    id=app["id"],
                    name=app["name"],
                    logo_url=app.get("logo_url"),
                    platform=app["platform"],
                    version_id=app.get("version_id"),
                    url=app["url"],
                    base_url=app["base_url"]
                )
                for app in apps
            ],
            total=len(apps)
        )
    except Exception as e:
        import traceback
        print("="*70)
        print(f"ERROR in search_apps: {str(e)}")
        print(traceback.format_exc())
        print("="*70)
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@router.get("/apps/{app_id}/screens")
async def get_app_screens(
    app_id: str,
    version_id: Optional[str] = Query(None, description="Version ID (optional, uses latest if not provided)"),
    limit: Optional[int] = Query(None, description="Maximum number of screens to return")
):
    """
    Get screens for a specific app
    
    Args:
        app_id: Full app ID/slug (e.g., "instagram-ios-3aa6c4a6-7200-43f0-81c2-397c22fa1596")
        version_id: Optional version ID
        limit: Optional limit on number of screens
    """
    try:
        scraper = await mobbin_scraper_service.get_scraper()
        
        screens = await scraper.get_app_screens(app_id, version_id, limit)
        
        return {
            "app_id": app_id,
            "version_id": version_id,
            "screens": [
                ScreenResponse(
                    id=screen["id"],
                    screen_number=screen["screen_number"],
                    image_url=screen["image_url"],
                    thumbnail_url=screen["thumbnail_url"],
                    title=screen.get("title"),
                    tags=screen.get("tags")
                )
                for screen in screens
            ],
            "total": len(screens)
        }
    except Exception as e:
        import traceback
        print(f"ERROR in get_app_screens: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to fetch screens: {str(e)}")


@router.get("/apps/{app_id}/ui-elements")
async def get_app_ui_elements(
    app_id: str,
    version_id: Optional[str] = Query(None, description="Version ID (optional)"),
    limit: Optional[int] = Query(None, description="Maximum number of elements to return")
):
    """
    Get UI elements for a specific app
    
    Args:
        app_id: Full app ID/slug
        version_id: Optional version ID
        limit: Optional limit on number of elements
    """
    try:
        scraper = await mobbin_scraper_service.get_scraper()
        
        elements = await scraper.get_app_ui_elements(app_id, version_id, limit)
        
        return {
            "app_id": app_id,
            "version_id": version_id,
            "ui_elements": [
                UIElementResponse(
                    id=elem["id"],
                    element_number=elem["element_number"],
                    image_url=elem["image_url"],
                    thumbnail_url=elem["thumbnail_url"],
                    title=elem.get("title"),
                    category=elem.get("category"),
                    tags=elem.get("tags")
                )
                for elem in elements
            ],
            "total": len(elements)
        }
    except Exception as e:
        import traceback
        print(f"ERROR in get_app_ui_elements: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to fetch UI elements: {str(e)}")


@router.get("/apps/{app_id}/flows")
async def get_app_flows(
    app_id: str,
    version_id: Optional[str] = Query(None, description="Version ID (optional)"),
    limit: Optional[int] = Query(None, description="Maximum number of flows to return")
):
    """
    Get flows for a specific app
    
    Args:
        app_id: Full app ID/slug
        version_id: Optional version ID
        limit: Optional limit on number of flows
    """
    try:
        scraper = await mobbin_scraper_service.get_scraper()
        
        flows = await scraper.get_app_flows(app_id, version_id, limit)
        
        return {
            "app_id": app_id,
            "version_id": version_id,
            "flows": [
                FlowResponse(
                    id=flow["id"],
                    flow_number=flow.get("flow_number"),
                    title=flow["title"],
                    thumbnail_url=flow.get("thumbnail_url"),
                    url=flow.get("url"),
                    metadata=flow.get("metadata"),
                    tags=flow.get("tags")
                )
                for flow in flows
            ],
            "total": len(flows)
        }
    except Exception as e:
        import traceback
        print(f"ERROR in get_app_flows: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to fetch flows: {str(e)}")


# IMPORTANT: Specific routes (/tree) MUST come BEFORE generic routes ({flow_id})
# FastAPI matches routes in order, so /flows/tree would match /flows/{flow_id} if that came first

@router.get("/apps/{app_id}/flows/tree/{node_id}/screens")
async def get_flow_node_screens(
    app_id: str,
    node_id: str,
    version_id: str = Query(..., description="Version ID (required)")
):
    """
    Get screens for a specific flow tree node
    
    Args:
        app_id: Full app ID/slug
        node_id: Flow tree node ID
        version_id: Version ID (required)
        
    Returns:
        Screens for the specific flow node
    """
    try:
        scraper = await mobbin_scraper_service.get_scraper()
        
        screens = await scraper.get_flow_node_screens(app_id, version_id, node_id)
        
        return {
            "app_id": app_id,
            "version_id": version_id,
            "node_id": node_id,
            "screens": [
                NodeScreenResponse(
                    id=screen["id"],
                    screen_number=screen["screen_number"],
                    image_url=screen["image_url"],
                    thumbnail_url=screen["thumbnail_url"],
                    label=screen.get("label"),
                    dimensions=screen.get("dimensions")
                )
                for screen in screens
            ],
            "total": len(screens)
        }
    except Exception as e:
        import traceback
        print(f"ERROR in get_flow_node_screens: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to fetch flow node screens: {str(e)}")


@router.get("/apps/{app_id}/flows/tree")
async def get_flow_tree(
    app_id: str,
    version_id: Optional[str] = Query(None, description="Version ID (optional)")
):
    """
    Get the complete flow tree structure for an app
    
    Args:
        app_id: Full app ID/slug
        version_id: Optional version ID
        
    Returns:
        Flow tree with all nodes in hierarchical order
    """
    try:
        scraper = await mobbin_scraper_service.get_scraper()
        
        tree_data = await scraper.get_flow_tree(app_id, version_id)
        
        return FlowTreeResponse(
            app_id=tree_data.get("app_id", app_id),
            version_id=tree_data.get("version_id", version_id or ""),
            nodes=[
                FlowTreeNodeResponse(
                    id=node["id"],
                    title=node["title"],
                    screen_count=node["screen_count"],
                    depth=node["depth"],
                    has_children=node["has_children"],
                    is_selected=node["is_selected"],
                    order=node["order"]
                )
                for node in tree_data.get("nodes", [])
            ],
            total=len(tree_data.get("nodes", []))
        )
    except Exception as e:
        import traceback
        print(f"ERROR in get_flow_tree: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to fetch flow tree: {str(e)}")


@router.get("/apps/{app_id}/flows/{flow_id}")
async def get_flow_details(
    app_id: str,
    flow_id: str,
    version_id: str = Query(..., description="Version ID (required for flow details)")
):
    """
    Get detailed information about a specific flow including the flow tree
    
    Args:
        app_id: Full app ID/slug
        flow_id: Flow ID (path parameter)
        version_id: Version ID (query parameter, required)
        
    Returns:
        Detailed flow information including title, description, screens, and flow tree structure
    """
    try:
        scraper = await mobbin_scraper_service.get_scraper()
        
        flow_data = await scraper.get_flow_details(app_id, version_id, flow_id)
        
        return FlowDetailResponse(
            title=flow_data.get("title"),
            description=flow_data.get("description"),
            screens=flow_data.get("screens", []),
            flow_tree=flow_data.get("flow_tree"),
            metadata=flow_data.get("metadata", {})
        )
    except Exception as e:
        import traceback
        print(f"ERROR in get_flow_details: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to fetch flow details: {str(e)}")


@router.post("/apps/query")
async def query_apps(request: AppsQueryRequest):
    """
    Query Mobbin apps using web scraping (legacy endpoint)
    
    NOTE: For search functionality, use the /search endpoint instead.
    This endpoint is for browsing apps by category/platform.
    """
    try:
        scraper = await mobbin_scraper_service.get_scraper()
        
        apps = await scraper.get_apps(
            platform=request.platform,
            category=request.category,
            page=request.page,
            page_size=request.page_size
        )
        
        return {
            "apps": [
                AppResponse(
                    id=app["id"],
                    name=app["name"],
                    logo_url=app.get("logo_url"),
                    category=app.get("category"),
                    url=app["url"],
                    platform=app.get("platform", request.platform)
                )
                for app in apps
            ],
            "page": request.page,
            "page_size": request.page_size,
            "total_in_page": len(apps),
            "has_more": len(apps) == request.page_size
        }
    except Exception as e:
        import traceback
        print("="*70)
        print(f"ERROR in query_apps: {str(e)}")
        print(traceback.format_exc())
        print("="*70)
        raise HTTPException(status_code=500, detail=f"Failed to fetch apps: {str(e)}")