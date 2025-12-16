"""
Pydantic models for Osyle API
Defines DTOs for Users, Tastes, Resources, and Projects
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# ============================================================================
# USER MODELS
# ============================================================================

class UserInDB(BaseModel):
    """User stored in DynamoDB"""
    user_id: str  # Cognito sub
    email: str
    name: Optional[str] = None
    picture: Optional[str] = None
    created_at: str
    updated_at: str


class UserOut(BaseModel):
    """User response"""
    user_id: str
    email: str
    name: Optional[str] = None
    picture: Optional[str] = None


# ============================================================================
# TASTE MODELS
# ============================================================================

class TasteCreate(BaseModel):
    """Request to create a new taste"""
    name: str
    metadata: Optional[dict] = {}


class TasteOut(BaseModel):
    """Taste response"""
    taste_id: str
    owner_id: str
    name: str
    metadata: dict
    created_at: str
    resource_count: Optional[int] = 0  # Calculated field


class TasteUpdate(BaseModel):
    """Request to update a taste"""
    name: Optional[str] = None
    metadata: Optional[dict] = None


# ============================================================================
# RESOURCE MODELS
# ============================================================================

class ResourceCreate(BaseModel):
    """Request to create a new resource"""
    name: str
    metadata: Optional[dict] = {}


class ResourceDownloadUrls(BaseModel):
    """Presigned URLs for downloading resource files"""
    figma_get_url: Optional[str] = None
    image_get_url: Optional[str] = None


class ResourceOut(BaseModel):
    """Resource response"""
    resource_id: str
    taste_id: str
    owner_id: str
    name: str
    figma_key: Optional[str] = None
    image_key: Optional[str] = None
    has_figma: bool = False
    has_image: bool = False
    metadata: dict
    created_at: str
    download_urls: Optional[ResourceDownloadUrls] = None


class ResourceUploadUrls(BaseModel):
    """Presigned URLs for uploading resource files"""
    figma_put_url: Optional[str] = None
    image_put_url: Optional[str] = None


class ResourceWithUrls(BaseModel):
    """Resource with presigned upload URLs"""
    resource: ResourceOut
    upload_urls: ResourceUploadUrls


class ResourceUpdate(BaseModel):
    """Request to update a resource"""
    name: Optional[str] = None
    metadata: Optional[dict] = None
    has_figma: Optional[bool] = None
    has_image: Optional[bool] = None


# ============================================================================
# PROJECT MODELS
# ============================================================================

class ProjectCreate(BaseModel):
    """Request to create a new project"""
    name: str
    task_description: Optional[str] = ""
    selected_taste_id: Optional[str] = None
    selected_resource_ids: Optional[List[str]] = []
    inspiration_image_keys: Optional[List[str]] = []  # S3 keys for inspiration images
    metadata: Optional[dict] = {}


class ProjectOut(BaseModel):
    """Project response"""
    project_id: str
    owner_id: str
    name: str
    task_description: str
    selected_taste_id: Optional[str] = None
    selected_resource_ids: List[str] = []
    inspiration_image_keys: List[str] = []  # S3 keys for inspiration images
    outputs: List[str] = []  # List of S3 keys
    metadata: dict
    created_at: str
    updated_at: str


class ProjectUpdate(BaseModel):
    """Request to update a project"""
    name: Optional[str] = None
    task_description: Optional[str] = None
    selected_taste_id: Optional[str] = None
    selected_resource_ids: Optional[List[str]] = None  # ✅ CHANGED: Now a list
    metadata: Optional[dict] = None


# ============================================================================
# RESPONSE WRAPPERS
# ============================================================================

class MessageResponse(BaseModel):
    """Simple message response"""
    message: str


class ErrorResponse(BaseModel):
    """Error response"""
    detail: str