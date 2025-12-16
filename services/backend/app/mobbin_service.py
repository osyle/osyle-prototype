"""
Mobbin Service - Auto-authenticating singleton service
Manages Mobbin authentication and provides API access

NOTE: Mobbin authentication is currently not working programmatically.
The GitHub repo (MobbinAPI) appears to be outdated. Mobbin primarily uses
OTP/Magic Link authentication which requires manual email verification.

Alternative approaches:
1. Use browser automation to login and extract tokens
2. Manually login once and copy session tokens
3. Use Mobbin's official API (if/when available)
"""

import os
from typing import Optional
from app.mobbin_api import MobbinAPI, Token
import asyncio
from datetime import datetime


class MobbinService:
    """
    Singleton service for Mobbin API access
    
    IMPORTANT: Currently non-functional due to Mobbin's authentication changes.
    The service is structured for future use when authentication is resolved.
    """
    
    _instance: Optional['MobbinService'] = None
    _api: Optional[MobbinAPI] = None
    _token: Optional[Token] = None
    _email: Optional[str] = None
    _password: Optional[str] = None
    _last_auth_time: Optional[float] = None
    _auth_error: Optional[str] = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        """Initialize with environment variables"""
        if not hasattr(self, '_initialized'):
            self._email = os.getenv('MOBBIN_EMAIL')
            self._password = os.getenv('MOBBIN_PASSWORD')
            
            # Check for pre-extracted tokens
            access_token = os.getenv('MOBBIN_ACCESS_TOKEN')
            refresh_token = os.getenv('MOBBIN_REFRESH_TOKEN')
            
            if access_token:
                # Use pre-extracted tokens (recommended method)
                import time
                self._token = Token(
                    access_token=access_token,
                    refresh_token=refresh_token or "",
                    generated_time=time.time()  # Current time
                )
                self._api = MobbinAPI(email=self._email or "extracted", token=self._token)
                print("✓ Using pre-extracted Mobbin tokens from environment")
            
            self._initialized = True
    
    def is_configured(self) -> bool:
        """Check if Mobbin credentials or tokens are configured"""
        has_credentials = bool(self._email and self._password)
        has_tokens = bool(self._token)
        return has_credentials or has_tokens
    
    async def _authenticate(self) -> None:
        """
        Authenticate with Mobbin using stored credentials
        
        NOTE: This is currently not working. Mobbin's authentication has changed
        and the password endpoint returns 401 Unauthorized.
        """
        if not self.is_configured():
            raise ValueError(
                "Mobbin credentials not configured. "
                "Please set MOBBIN_EMAIL and MOBBIN_PASSWORD environment variables."
            )
        
        print(f"Authenticating with Mobbin as {self._email}...")
        
        self._api = MobbinAPI(email=self._email)
        
        try:
            # Try password login
            self._token = await self._api.login_with_password(self._password)
            self._last_auth_time = asyncio.get_event_loop().time()
            self._auth_error = None
            print("✓ Successfully authenticated with Mobbin")
        except Exception as e:
            error_msg = str(e)
            self._auth_error = error_msg
            print(f"✗ Failed to authenticate with Mobbin: {error_msg}")
            
            # Provide helpful error message
            if "401" in error_msg or "Unauthorized" in error_msg:
                print("\n" + "="*70)
                print("MOBBIN AUTHENTICATION ISSUE")
                print("="*70)
                print("The Mobbin API authentication is currently not working.")
                print("\nPossible reasons:")
                print("1. Mobbin changed their authentication system")
                print("2. Your account uses OTP/Magic Link (not password)")
                print("3. The GitHub MobbinAPI implementation is outdated")
                print("\nAlternative solutions:")
                print("1. Check if your Mobbin account has a password set")
                print("   (Settings -> Account -> Password)")
                print("2. Use browser dev tools to extract session tokens manually")
                print("3. Wait for an updated Mobbin API implementation")
                print("="*70 + "\n")
            
            self._api = None
            self._token = None
            raise
    
    async def get_api(self) -> MobbinAPI:
        """
        Get authenticated Mobbin API instance
        Auto-authenticates if needed or token is expired
        """
        # If we have pre-extracted tokens, use them
        if self._api is not None and self._token is not None:
            # Check if token is expired (tokens last 24 hours)
            if self._token.is_expired():
                print("Token expired, refreshing...")
                try:
                    await self._api.refresh_token()
                    self._token = self._api.token
                    print("✓ Token refreshed")
                except Exception as e:
                    print(f"✗ Token refresh failed: {e}")
                    # If using pre-extracted tokens and refresh fails, that's an error
                    if not self._password:
                        raise ValueError(
                            "Token refresh failed and no password available for re-authentication. "
                            "Please extract new tokens manually."
                        )
                    # Try to re-authenticate with password
                    await self._authenticate()
            return self._api
        
        # Otherwise, try to authenticate with password
        if self._api is None or self._token is None:
            await self._authenticate()
        
        return self._api
    
    async def ensure_authenticated(self) -> bool:
        """
        Ensure service is authenticated
        Returns True if authenticated, False otherwise
        """
        if not self.is_configured():
            return False
        
        try:
            await self.get_api()
            return True
        except Exception as e:
            print(f"Authentication check failed: {e}")
            return False
    
    def get_auth_error(self) -> Optional[str]:
        """Get the last authentication error message"""
        return self._auth_error


# Global instance
mobbin_service = MobbinService()