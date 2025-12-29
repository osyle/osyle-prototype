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

class DeviceScreen(BaseModel):
    """Device screen dimensions"""
    width: int
    height: int


class DeviceInfo(BaseModel):
    """Device information"""
    platform: str  # 'web' or 'phone'
    screen: DeviceScreen


# ============================================================================
# FLOW MODELS (NEW)
# ============================================================================

class ScreenDefinition(BaseModel):
    """Screen definition from user input"""
    name: Optional[str] = ""
    description: Optional[str] = ""
    mode: str  # "exact" | "redesign" | "inspiration" | "rethink"
    has_figma: bool = False
    has_images: bool = False
    image_count: int = 0  # Number of images for this screen


class Position(BaseModel):
    """Canvas position for a screen"""
    x: float
    y: float


class FlowTransition(BaseModel):
    """Transition between screens in a flow"""
    transition_id: str
    from_screen_id: str
    to_screen_id: str
    trigger: str  # "Tap 'Sign Up' button"
    trigger_type: str  # "tap" | "submit" | "auto" | "link"
    flow_type: str  # "forward" | "back" | "error" | "branch" | "success"
    label: Optional[str] = None  # Display text on arrow
    condition: Optional[str] = None  # "if form valid"
    color: Optional[str] = None  # For visual coding


class FlowScreen(BaseModel):
    """Screen in a flow"""
    screen_id: str
    name: str
    description: str
    task_description: str  # Specific UI generation task
    platform: str  # 'web' | 'phone'
    dimensions: dict  # {width: int, height: int}
    screen_type: Optional[str] = "intermediate"  # "entry" | "intermediate" | "success" | "error" | "exit"
    semantic_role: Optional[str] = None  # "form" | "confirmation" | "decision" | "content"
    ui_code: Optional[str] = None  # Generated React code
    ui_loading: Optional[bool] = False
    ui_error: Optional[bool] = False


class FlowGraph(BaseModel):
    """Complete flow graph structure"""
    flow_id: str
    flow_name: str
    description: Optional[str] = ""
    entry_screen_id: str
    screens: List[FlowScreen]
    transitions: List[FlowTransition]
    layout_positions: Optional[dict] = {}  # screen_id -> {x, y}
    layout_algorithm: Optional[str] = "hierarchical"  # "hierarchical" | "force-directed" | "manual"


class ProjectCreate(BaseModel):
    """Request to create a new project"""
    name: str
    task_description: Optional[str] = ""
    selected_taste_id: Optional[str] = None
    selected_resource_ids: Optional[List[str]] = []
    inspiration_image_keys: Optional[List[str]] = []  # S3 keys for inspiration images
    device_info: Optional[DeviceInfo] = None  # Device settings when project was created
    rendering_mode: Optional[str] = None  # 'react' or 'design-ml'
    flow_mode: Optional[bool] = True  # NEW: Generate flow vs single screen
    max_screens: Optional[int] = 5  # NEW: Max screens in flow
    screen_definitions: Optional[List[ScreenDefinition]] = []  # NEW: Screen definitions from user
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
    device_info: Optional[dict] = None  # Device settings when project was created
    rendering_mode: Optional[str] = None  # 'react' or 'design-ml'
    flow_mode: Optional[bool] = True  # NEW: Flow mode flag
    flow_graph: Optional[dict] = None  # NEW: Flow graph structure
    outputs: List[str] = []  # List of S3 keys
    metadata: dict
    created_at: str
    updated_at: str


class ProjectUpdate(BaseModel):
    """Request to update a project"""
    name: Optional[str] = None
    task_description: Optional[str] = None
    selected_taste_id: Optional[str] = None
    selected_resource_ids: Optional[List[str]] = None
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