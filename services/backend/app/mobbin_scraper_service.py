"""
Mobbin Scraper Service - Manages browser instance and scraping
"""

import os
from typing import Optional
from app.mobbin_scraper import MobbinScraper
import asyncio


class MobbinScraperService:
    """
    Singleton service for Mobbin web scraping
    Manages a single scraper instance
    """
    
    _instance: Optional['MobbinScraperService'] = None
    _scraper: Optional[MobbinScraper] = None
    _email: Optional[str] = None
    _password: Optional[str] = None
    _lock: asyncio.Lock = asyncio.Lock()
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        """Initialize with environment variables"""
        if not hasattr(self, '_initialized'):
            self._email = os.getenv('MOBBIN_EMAIL')
            self._password = os.getenv('MOBBIN_PASSWORD')
            self._initialized = True
    
    def is_configured(self) -> bool:
        """Check if Mobbin credentials are configured"""
        return bool(self._email and self._password)
    
    async def get_scraper(self) -> MobbinScraper:
        """
        Get or create scraper instance
        Reuses existing browser session if available
        """
        async with self._lock:
            if not self.is_configured():
                raise ValueError(
                    "Mobbin credentials not configured. "
                    "Please set MOBBIN_EMAIL and MOBBIN_PASSWORD environment variables."
                )
            
            # Create new scraper if none exists
            if self._scraper is None:
                print("Creating new Mobbin scraper instance...")
                self._scraper = MobbinScraper(self._email, self._password)
                await self._scraper.start()
                print("✓ Scraper ready")
            
            return self._scraper
    
    async def close(self):
        """Close the scraper and browser"""
        async with self._lock:
            if self._scraper:
                await self._scraper.close()
                self._scraper = None
                print("✓ Scraper closed")


# Global instance
mobbin_scraper_service = MobbinScraperService()