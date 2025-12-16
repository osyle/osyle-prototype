"""
Mobbin API - Python Implementation with correct endpoints
Based on the Swift implementation
"""

import httpx
import time
from typing import Optional, List, Dict, Any
from dataclasses import dataclass
from datetime import datetime


@dataclass
class Token:
    """Authentication token data"""
    access_token: str
    refresh_token: str
    generated_time: float
    
    def is_expired(self) -> bool:
        """Check if token is older than 23 hours (tokens last 24h)"""
        return (time.time() - self.generated_time) > (23 * 3600)


@dataclass
class UserInfo:
    """User information"""
    id: str
    aud: str
    role: str
    email: str
    email_confirmed_at: Optional[str]
    recovery_sent_at: Optional[str]
    last_sign_in_at: Optional[str]
    avatar_url: Optional[str]
    full_name: Optional[str]


@dataclass
class App:
    """App information"""
    id: str
    app_name: str
    app_category: str
    app_style: Optional[str]
    app_logo_url: str
    app_tagline: str
    company_hq_region: str
    company_stage: str
    platform: str
    created_at: str
    app_version_id: str
    app_version_created_at: str
    app_version_updated_at: str
    app_version_published_at: str
    preview_screen_urls: List[str]


@dataclass
class Screen:
    """Screen information"""
    id: str
    screen_number: int
    screen_url: str
    app_version_id: str
    screen_elements: Optional[List[str]]
    screen_patterns: Optional[List[str]]
    updated_at: str
    created_at: str


@dataclass
class Flow:
    """Flow information"""
    id: str
    name: str
    actions: Optional[List[str]]
    parent_app_section_id: Optional[str]
    order: int
    updated_at: str
    app_version_id: str
    screens: List[Dict[str, Any]]


class MobbinAPI:
    """
    Unofficial Mobbin API client for Python
    """
    
    # Correct Supabase endpoints from Swift implementation
    SUPABASE_URL = "https://ujasntkfphywizsdaapi.supabase.co"
    SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlhdCI6MTYyNTQ2MDM3NSwiZXhwIjoxOTQxMDM2Mzc1fQ.IgHG-M4znmVhQEa6uWWb3gz-_XXjsSvPPF8NBad8gvk"
    
    def __init__(
        self, 
        email: Optional[str] = None,
        user_info: Optional[UserInfo] = None,
        token: Optional[Token] = None
    ):
        """Initialize Mobbin API client"""
        self.email = email
        self.user_info = user_info
        self.token = token
        self.client = httpx.AsyncClient(timeout=30.0)
        
    async def _get_headers(self, include_auth: bool = True) -> Dict[str, str]:
        """Get headers for API requests matching Swift implementation"""
        headers = {
            "apikey": self.SUPABASE_ANON_KEY,
            "Content-Type": "application/json",
            "X-Client-Info": "supabase-js/1.35.7",
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            "Origin": "https://mobbin.com",
            "Referer": "https://mobbin.com/",
        }
        
        if include_auth and self.token:
            headers["Authorization"] = f"Bearer {self.token.access_token}"
        else:
            headers["Authorization"] = f"Bearer {self.SUPABASE_ANON_KEY}"
            
        return headers
    
    async def should_use_password(self) -> bool:
        """Check if email requires password auth"""
        if not self.email:
            raise ValueError("Email is required")
            
        url = f"{self.SUPABASE_URL}/rest/v1/rpc/get_should_use_password_for_email"
        headers = await self._get_headers(include_auth=False)
        headers["Content-Profile"] = "public"
        
        data = {"target_email": self.email}
        
        try:
            response = await self.client.post(url, json=data, headers=headers)
            response.raise_for_status()
            
            # The response is just a boolean value
            result = response.json()
            return result if isinstance(result, bool) else False
        except Exception as e:
            # If the endpoint fails, default to password not required
            # This allows the flow to continue with magic link
            print(f"Error checking password requirement: {e}")
            return False
    
    async def login_with_password(self, password: str) -> Token:
        """Login with email and password"""
        if not self.email:
            raise ValueError("Email is required")
        
        url = f"{self.SUPABASE_URL}/auth/v1/token?grant_type=password"
        headers = await self._get_headers(include_auth=False)
        
        data = {
            "email": self.email,
            "password": password
        }
        
        response = await self.client.post(url, json=data, headers=headers)
        response.raise_for_status()
        
        result = response.json()
        
        # Store token
        self.token = Token(
            access_token=result["access_token"],
            refresh_token=result["refresh_token"],
            generated_time=time.time()
        )
        
        # Store user info
        user = result.get("user", {})
        user_meta = user.get("user_metadata", {})
        self.user_info = UserInfo(
            id=user.get("id", ""),
            aud=user.get("aud", ""),
            role=user.get("role", ""),
            email=user.get("email", ""),
            email_confirmed_at=user.get("email_confirmed_at"),
            recovery_sent_at=user.get("recovery_sent_at"),
            last_sign_in_at=user.get("last_sign_in_at"),
            avatar_url=user_meta.get("avatar_url"),
            full_name=user_meta.get("full_name")
        )
        
        return self.token
    
    async def send_email(self) -> None:
        """Send verification email to the user"""
        if not self.email:
            raise ValueError("Email is required")
        
        url = f"{self.SUPABASE_URL}/auth/v1/otp"
        headers = await self._get_headers(include_auth=False)
        headers["Content-Type"] = "text/plain;charset=UTF-8"
        
        # Use exact body format from Swift - send as JSON string, not with json= parameter
        import json
        body_str = json.dumps({
            "email": self.email,
            "create_user": True,
            "gotrue_meta_security": {}
        })
        
        response = await self.client.post(url, content=body_str, headers=headers)
        response.raise_for_status()
        
    async def verify(self, code: str) -> Token:
        """Verify email with OTP code"""
        if not self.email:
            raise ValueError("Email is required")
            
        url = f"{self.SUPABASE_URL}/auth/v1/verify"
        headers = await self._get_headers(include_auth=False)
        headers["Content-Type"] = "text/plain;charset=UTF-8"
        
        # Use magiclink type as in Swift implementation - send as JSON string
        import json
        body_str = json.dumps({
            "email": self.email,
            "token": code,
            "type": "magiclink"
        })
        
        response = await self.client.post(url, content=body_str, headers=headers)
        response.raise_for_status()
        
        result = response.json()
        
        # Store token
        self.token = Token(
            access_token=result["access_token"],
            refresh_token=result["refresh_token"],
            generated_time=time.time()
        )
        
        # Store user info
        user = result.get("user", {})
        user_meta = user.get("user_metadata", {})
        self.user_info = UserInfo(
            id=user.get("id", ""),
            aud=user.get("aud", ""),
            role=user.get("role", ""),
            email=user.get("email", ""),
            email_confirmed_at=user.get("email_confirmed_at"),
            recovery_sent_at=user.get("recovery_sent_at"),
            last_sign_in_at=user.get("last_sign_in_at"),
            avatar_url=user_meta.get("avatar_url"),
            full_name=user_meta.get("full_name")
        )
        
        return self.token
    
    async def refresh_token(self) -> Token:
        """Refresh the access token"""
        if not self.token:
            raise ValueError("No token to refresh")
            
        url = f"{self.SUPABASE_URL}/auth/v1/token?grant_type=refresh_token"
        headers = await self._get_headers(include_auth=False)
        
        data = {"refresh_token": self.token.refresh_token}
        
        response = await self.client.post(url, json=data, headers=headers)
        response.raise_for_status()
        
        result = response.json()
        
        self.token = Token(
            access_token=result["access_token"],
            refresh_token=result["refresh_token"],
            generated_time=time.time()
        )
        
        return self.token
    
    async def get_ios_apps_count(self) -> int:
        """Get count of iOS apps using RPC endpoint"""
        url = f"{self.SUPABASE_URL}/rest/v1/rpc/get_content_count"
        headers = await self._get_headers()
        headers["Content-Profile"] = "public"
        headers["Accept-Profile"] = "public"
        
        data = {"filter_app_platform": "ios"}
        
        response = await self.client.post(url, json=data, headers=headers)
        response.raise_for_status()
        
        return response.json()
    
    async def query_apps_page(
        self,
        last_app: Optional[App] = None,
        page_size: int = 24,
        platform: str = "ios",
        categories: Optional[List[str]] = None,
        styles: Optional[List[str]] = None,
        regions: Optional[List[str]] = None,
        company_stages: Optional[List[str]] = None
    ) -> List[App]:
        """
        Query apps page using the RPC endpoint
        This is the correct method that matches Swift implementation
        """
        if not self.token:
            raise ValueError("Must be authenticated")
        
        url = f"{self.SUPABASE_URL}/rest/v1/rpc/get_apps_with_preview_screens_filter?select=*"
        headers = await self._get_headers()
        headers["Content-Profile"] = "public"
        headers["Accept-Profile"] = "public"
        
        print("DEBUG: Request URL:", url)
        print("DEBUG: Token present:", bool(self.token))
        print("DEBUG: Access token (first 50 chars):", self.token.access_token[:50] if self.token else "None")
        print("DEBUG: Headers:", {k: v[:50] + "..." if len(v) > 50 else v for k, v in headers.items()})
        
        # Build request body matching Swift implementation
        body = {
            "filterAppCategories": categories,
            "filterAppCompanyStages": company_stages,
            "filterAppPlatform": platform,
            "filterOperator": "and",
            "lastAppVersionUpdatedAt": last_app.app_version_updated_at if last_app else None,
            "filterAppStyles": styles,
            "filterAppRegions": regions,
            "pageSize": page_size,
            "lastAppId": last_app.id if last_app else None,
            "lastAppVersionPublishedAt": last_app.app_version_published_at if last_app else None
        }
        
        response = await self.client.post(url, json=body, headers=headers)
        
        print("DEBUG: Response status:", response.status_code)
        if response.status_code != 200:
            print("DEBUG: Response body:", response.text[:500])
        
        response.raise_for_status()
        
        apps_data = response.json()
        return [self._parse_app(app) for app in apps_data]
    
    async def get_all_ios_apps(self, max_pages: int = 100) -> List[App]:
        """Get all iOS apps with pagination"""
        all_apps = []
        last_app = None
        
        for _ in range(max_pages):
            apps = await self.query_apps_page(last_app=last_app)
            if not apps:
                break
            all_apps.extend(apps)
            last_app = apps[-1]
        
        return all_apps
    
    async def get_ios_screens(
        self,
        app: App,
        version_id: Optional[str] = None
    ) -> List[Screen]:
        """Get screens for an iOS app"""
        url = f"{self.SUPABASE_URL}/rest/v1/app_screen"
        headers = await self._get_headers()
        
        version = version_id or app.app_version_id
        
        params = {
            "app_version_id": f"eq.{version}",
            "select": "*",
            "order": "screen_number.asc"
        }
        
        response = await self.client.get(url, headers=headers, params=params)
        response.raise_for_status()
        
        screens_data = response.json()
        return [self._parse_screen(screen) for screen in screens_data]
    
    async def get_ios_flows(
        self,
        app: App,
        version_id: Optional[str] = None
    ) -> List[Flow]:
        """Get flows for an iOS app"""
        url = f"{self.SUPABASE_URL}/rest/v1/app_section"
        headers = await self._get_headers()
        
        version = version_id or app.app_version_id
        
        params = {
            "app_version_id": f"eq.{version}",
            "select": "*,app_section_screen(*)",
            "order": "order.asc"
        }
        
        response = await self.client.get(url, headers=headers, params=params)
        response.raise_for_status()
        
        flows_data = response.json()
        return [self._parse_flow(flow) for flow in flows_data]
    
    def _parse_app(self, data: Dict[str, Any]) -> App:
        """Parse app data from API response"""
        return App(
            id=data["id"],
            app_name=data["appName"],
            app_category=data.get("appCategory", ""),
            app_style=data.get("appStyle"),
            app_logo_url=data["appLogoUrl"],
            app_tagline=data.get("appTagline", ""),
            company_hq_region=data.get("companyHqRegion", ""),
            company_stage=data.get("companyStage", ""),
            platform=data["platform"],
            created_at=data["createdAt"],
            app_version_id=data["appVersionId"],
            app_version_created_at=data["appVersionCreatedAt"],
            app_version_updated_at=data["appVersionUpdatedAt"],
            app_version_published_at=data["appVersionPublishedAt"],
            preview_screen_urls=data.get("previewScreenUrls", [])
        )
    
    def _parse_screen(self, data: Dict[str, Any]) -> Screen:
        """Parse screen data from API response"""
        return Screen(
            id=data["id"],
            screen_number=data["screen_number"],
            screen_url=data["screen_url"],
            app_version_id=data["app_version_id"],
            screen_elements=data.get("screen_elements"),
            screen_patterns=data.get("screen_patterns"),
            updated_at=data["updated_at"],
            created_at=data["created_at"]
        )
    
    def _parse_flow(self, data: Dict[str, Any]) -> Flow:
        """Parse flow data from API response"""
        return Flow(
            id=data["id"],
            name=data["name"],
            actions=data.get("actions"),
            parent_app_section_id=data.get("parent_app_section_id"),
            order=data["order"],
            updated_at=data["updated_at"],
            app_version_id=data["app_version_id"],
            screens=data.get("app_section_screen", [])
        )
    
    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()
    
    async def __aenter__(self):
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()