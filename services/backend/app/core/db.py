"""
DynamoDB database operations for Osyle
Provides CRUD functions for Users, Tastes, Resources, and Projects
"""
import os
import boto3
import uuid
from decimal import Decimal
from datetime import datetime
from typing import Optional, List, Dict, Any
from boto3.dynamodb.conditions import Key, Attr
from botocore.exceptions import ClientError


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def convert_decimals(obj):
    """
    Recursively convert DynamoDB Decimal objects to int/float for JSON serialization
    """
    if isinstance(obj, list):
        return [convert_decimals(item) for item in obj]
    elif isinstance(obj, dict):
        return {key: convert_decimals(value) for key, value in obj.items()}
    elif isinstance(obj, Decimal):
        # Convert to int if it's a whole number, otherwise float
        if obj % 1 == 0:
            return int(obj)
        else:
            return float(obj)
    else:
        return obj


# ============================================================================
# DYNAMODB SETUP
# ============================================================================

DYNAMO_REGION = os.getenv("AWS_REGION", "us-east-1")
DYNAMO_ENDPOINT = os.getenv("DYNAMODB_ENDPOINT_URL")  # For local development

# Initialize DynamoDB resource
if DYNAMO_ENDPOINT:
    dynamodb = boto3.resource(
        'dynamodb',
        region_name=DYNAMO_REGION,
        endpoint_url=DYNAMO_ENDPOINT
    )
else:
    dynamodb = boto3.resource('dynamodb', region_name=DYNAMO_REGION)

# Table names from environment
USERS_TABLE_NAME = os.getenv("USERS_TABLE", "OsyleUsers")
TASTES_TABLE_NAME = os.getenv("TASTES_TABLE", "OsyleTastes")
RESOURCES_TABLE_NAME = os.getenv("RESOURCES_TABLE", "OsyleResources")
PROJECTS_TABLE_NAME = os.getenv("PROJECTS_TABLE", "OsyleProjects")
DESIGN_MUTATIONS_TABLE_NAME = os.getenv("DESIGN_MUTATIONS_TABLE", "OsyleDesignMutations")

# Table references
users_table = dynamodb.Table(USERS_TABLE_NAME)
tastes_table = dynamodb.Table(TASTES_TABLE_NAME)
resources_table = dynamodb.Table(RESOURCES_TABLE_NAME)
projects_table = dynamodb.Table(PROJECTS_TABLE_NAME)
design_mutations_table = dynamodb.Table(DESIGN_MUTATIONS_TABLE_NAME)


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def get_timestamp() -> str:
    """Get current timestamp in ISO format"""
    return datetime.utcnow().isoformat() + "Z"


def generate_uuid() -> str:
    """Generate a new UUID"""
    return str(uuid.uuid4())


# ============================================================================
# USER OPERATIONS
# ============================================================================

def ensure_user(user_id: str, email: str, name: str = None, picture: str = None) -> Dict[str, Any]:
    """
    Create user if doesn't exist, return user data
    Uses conditional put to avoid overwriting
    """
    now = get_timestamp()
    user_item = {
        "user_id": user_id,
        "email": email,
        "name": name or "",
        "picture": picture or "",
        "created_at": now,
        "updated_at": now
    }
    
    try:
        users_table.put_item(
            Item=user_item,
            ConditionExpression="attribute_not_exists(user_id)"
        )
        return user_item
    except ClientError as e:
        if e.response['Error']['Code'] == 'ConditionalCheckFailedException':
            # User already exists, return existing data
            response = users_table.get_item(Key={"user_id": user_id})
            return response.get("Item", user_item)
        raise


def get_user(user_id: str) -> Optional[Dict[str, Any]]:
    """Get user by ID"""
    try:
        response = users_table.get_item(Key={"user_id": user_id})
        return response.get("Item")
    except ClientError:
        return None


# ============================================================================
# TASTE OPERATIONS
# ============================================================================

def create_taste(owner_id: str, name: str, metadata: dict = None) -> Dict[str, Any]:
    """Create a new taste"""
    taste_id = generate_uuid()
    now = get_timestamp()
    
    item = {
        "taste_id": taste_id,
        "owner_id": owner_id,
        "name": name,
        "metadata": metadata or {},
        "created_at": now,
        "updated_at": now
    }
    
    tastes_table.put_item(Item=item)
    return item


def get_taste(taste_id: str) -> Optional[Dict[str, Any]]:
    """Get taste by ID"""
    try:
        response = tastes_table.get_item(Key={"taste_id": taste_id})
        return response.get("Item")
    except ClientError:
        return None


def list_tastes_for_owner(owner_id: str) -> List[Dict[str, Any]]:
    """List all tastes for a specific owner"""
    try:
        response = tastes_table.query(
            IndexName="owner_id-index",
            KeyConditionExpression=Key('owner_id').eq(owner_id)
        )
        return response.get("Items", [])
    except ClientError as e:
        print(f"Error querying tastes: {e}")
        return []


def update_taste(taste_id: str, name: str = None, metadata: dict = None) -> Dict[str, Any]:
    """Update a taste"""
    now = get_timestamp()
    update_expr_parts = ["updated_at = :updated"]
    expr_attr_values = {":updated": now}
    expr_attr_names = {}  # For reserved keywords
    
    if name is not None:
        # 'name' is a reserved keyword in DynamoDB
        update_expr_parts.append("#n = :name")
        expr_attr_values[":name"] = name
        expr_attr_names["#n"] = "name"
    
    if metadata is not None:
        update_expr_parts.append("metadata = :metadata")
        expr_attr_values[":metadata"] = metadata
    
    update_expr = "SET " + ", ".join(update_expr_parts)
    
    # Only include ExpressionAttributeNames if we have any
    update_params = {
        "Key": {"taste_id": taste_id},
        "UpdateExpression": update_expr,
        "ExpressionAttributeValues": expr_attr_values,
        "ReturnValues": "ALL_NEW"
    }
    
    if expr_attr_names:
        update_params["ExpressionAttributeNames"] = expr_attr_names
    
    response = tastes_table.update_item(**update_params)
    
    return response.get("Attributes", {})


def delete_taste(taste_id: str) -> bool:
    """Delete a taste"""
    try:
        tastes_table.delete_item(Key={"taste_id": taste_id})
        return True
    except ClientError:
        return False


# ============================================================================
# RESOURCE OPERATIONS
# ============================================================================

def create_resource(
    resource_id: str,
    taste_id: str,
    owner_id: str,
    name: str,
    figma_key: str = None,
    image_key: str = None,
    metadata: dict = None
) -> Dict[str, Any]:
    """
    Create a new resource
    
    Accepts resource_id as a parameter to ensure it matches S3 keys
    """
    now = get_timestamp()
    
    item = {
        "resource_id": resource_id,
        "taste_id": taste_id,
        "owner_id": owner_id,
        "name": name,
        "figma_key": figma_key or "",
        "image_key": image_key or "",
        "has_figma": False,
        "has_image": False,
        "metadata": metadata or {},
        "created_at": now,
        "updated_at": now
    }
    
    resources_table.put_item(Item=item)
    return item


def get_resource(resource_id: str) -> Optional[Dict[str, Any]]:
    """Get resource by ID"""
    try:
        response = resources_table.get_item(Key={"resource_id": resource_id})
        return response.get("Item")
    except ClientError:
        return None


def list_resources_for_taste(taste_id: str) -> List[Dict[str, Any]]:
    """List all resources for a specific taste"""
    try:
        response = resources_table.query(
            IndexName="taste_id-index",
            KeyConditionExpression=Key('taste_id').eq(taste_id)
        )
        items = response.get("Items", [])
        
        # Filter out corrupt/incomplete records (missing required fields)
        valid_items = []
        for item in items:
            # Check if item has required fields
            if "resource_id" in item and "name" in item:
                valid_items.append(item)
            else:
                # Log corrupt record for cleanup
                print(f"⚠️  Warning: Found corrupt resource record: {item.get('resource_id', 'unknown')}")
                # Could optionally delete it here
                # resources_table.delete_item(Key={"resource_id": item.get("resource_id")})
        
        return valid_items
    except ClientError as e:
        print(f"Error querying resources: {e}")
        return []


def update_resource(
    resource_id: str,
    name: str = None,
    has_figma: bool = None,
    has_image: bool = None,
    metadata: dict = None
) -> Dict[str, Any]:
    """Update a resource"""
    now = get_timestamp()
    update_expr_parts = ["updated_at = :updated"]
    expr_attr_values = {":updated": now}
    expr_attr_names = {}  # For reserved keywords
    
    if name is not None:
        # 'name' is a reserved keyword in DynamoDB
        update_expr_parts.append("#n = :name")
        expr_attr_values[":name"] = name
        expr_attr_names["#n"] = "name"
    
    if has_figma is not None:
        update_expr_parts.append("has_figma = :has_figma")
        expr_attr_values[":has_figma"] = has_figma
    
    if has_image is not None:
        update_expr_parts.append("has_image = :has_image")
        expr_attr_values[":has_image"] = has_image
    
    if metadata is not None:
        update_expr_parts.append("metadata = :metadata")
        expr_attr_values[":metadata"] = metadata
    
    update_expr = "SET " + ", ".join(update_expr_parts)
    
    # Only include ExpressionAttributeNames if we have any
    update_params = {
        "Key": {"resource_id": resource_id},
        "UpdateExpression": update_expr,
        "ExpressionAttributeValues": expr_attr_values,
        "ReturnValues": "ALL_NEW"
    }
    
    if expr_attr_names:
        update_params["ExpressionAttributeNames"] = expr_attr_names
    
    response = resources_table.update_item(**update_params)
    
    return response.get("Attributes", {})


def delete_resource(resource_id: str) -> bool:
    """Delete a resource and invalidate related DTMs"""
    try:
        # Get resource to find taste_id before deleting
        resource = get_resource(resource_id)
        if not resource:
            return False
        
        taste_id = resource.get("taste_id")
        
        # Delete from database
        resources_table.delete_item(Key={"resource_id": resource_id})
        
        # Invalidate DTMs if taste_id exists
        if taste_id:
            try:
                from app.dtm import storage as dtm_storage
                # Delete global DTM (will be rebuilt on next use)
                dtm_storage.invalidate_global_dtm(taste_id)
                # Delete subset DTMs containing this resource
                dtm_storage.delete_subsets_containing_resource(taste_id, resource_id)
            except Exception as e:
                print(f"⚠️  Warning: Failed to invalidate DTMs: {e}")
                # Don't fail the deletion if DTM cleanup fails
        
        return True
    except ClientError:
        return False


# ============================================================================
# PROJECT OPERATIONS
# ============================================================================

def create_project(
    owner_id: str,
    name: str,
    task_description: str = "",
    selected_taste_id: str = None,
    selected_resource_ids: List[str] = None,
    inspiration_image_keys: List[str] = None,  # S3 keys for inspiration images
    device_info: dict = None,  # Device settings when project was created
    rendering_mode: str = None,  # 'react' or 'parametric'
    image_generation_mode: str = "image_url",  # 'ai' or 'image_url'
    flow_mode: bool = True,  # NEW: Flow mode flag
    max_screens: int = 5,  # NEW: Max screens in flow
    screen_definitions: List[dict] = None,  # NEW: Screen definitions from user
    metadata: dict = None,
    project_id: str = None  # Optional: pass explicit ID for S3 consistency
) -> Dict[str, Any]:
    """Create a new project"""
    if project_id is None:
        project_id = generate_uuid()
    now = get_timestamp()
    
    item = {
        "project_id": project_id,
        "owner_id": owner_id,
        "name": name,
        "task_description": task_description,
        "selected_taste_id": selected_taste_id or "",
        "selected_resource_ids": selected_resource_ids or [],
        "inspiration_image_keys": inspiration_image_keys or [],  # S3 keys
        "device_info": device_info or {},  # Store device settings
        "rendering_mode": rendering_mode or "react",  # Store rendering mode
        "image_generation_mode": image_generation_mode,  # Store image generation mode
        "flow_mode": flow_mode,  # NEW: Store flow mode
        "max_screens": max_screens,  # NEW: Store max screens
        "screen_definitions": screen_definitions or [],  # NEW: Store screen definitions
        "flow_graph": {},  # NEW: Initialize empty flow graph
        "outputs": [],
        "metadata": metadata or {},
        "created_at": now,
        "updated_at": now
    }
    
    projects_table.put_item(Item=item)
    return item


def get_project(project_id: str) -> Optional[Dict[str, Any]]:
    """Get project by ID"""
    try:
        response = projects_table.get_item(Key={"project_id": project_id})
        item = response.get("Item")
        return convert_decimals(item) if item else None
    except ClientError:
        return None


def list_projects_for_owner(owner_id: str) -> List[Dict[str, Any]]:
    """List all projects for a specific owner"""
    try:
        response = projects_table.query(
            IndexName="owner_id-index",
            KeyConditionExpression=Key('owner_id').eq(owner_id)
        )
        items = response.get("Items", [])
        return [convert_decimals(item) for item in items]
    except ClientError as e:
        print(f"Error querying projects: {e}")
        return []


def update_project(
    project_id: str,
    name: str = None,
    task_description: str = None,
    selected_taste_id: str = None,
    selected_resource_ids: List[str] = None,  # ✅ CHANGED: Now a list
    metadata: dict = None
) -> Dict[str, Any]:
    """Update a project"""
    now = get_timestamp()
    update_expr_parts = ["updated_at = :updated"]
    expr_attr_values = {":updated": now}
    
    if name is not None:
        update_expr_parts.append("name = :name")
        expr_attr_values[":name"] = name
    
    if task_description is not None:
        update_expr_parts.append("task_description = :desc")
        expr_attr_values[":desc"] = task_description
    
    if selected_taste_id is not None:
        update_expr_parts.append("selected_taste_id = :taste")
        expr_attr_values[":taste"] = selected_taste_id
    
    if selected_resource_ids is not None:  # ✅ CHANGED: Handle list
        update_expr_parts.append("selected_resource_ids = :resources")
        expr_attr_values[":resources"] = selected_resource_ids
    
    if metadata is not None:
        update_expr_parts.append("metadata = :metadata")
        expr_attr_values[":metadata"] = metadata
    
    update_expr = "SET " + ", ".join(update_expr_parts)
    
    response = projects_table.update_item(
        Key={"project_id": project_id},
        UpdateExpression=update_expr,
        ExpressionAttributeValues=expr_attr_values,
        ReturnValues="ALL_NEW"
    )
    
    return response.get("Attributes", {})


def add_project_output(project_id: str, output_key: str) -> Dict[str, Any]:
    """Add an output S3 key to a project's outputs list"""
    now = get_timestamp()
    
    response = projects_table.update_item(
        Key={"project_id": project_id},
        UpdateExpression="SET outputs = list_append(if_not_exists(outputs, :empty_list), :output), updated_at = :updated",
        ExpressionAttributeValues={
            ":output": [output_key],
            ":empty_list": [],
            ":updated": now
        },
        ReturnValues="ALL_NEW"
    )
    
    return response.get("Attributes", {})


def delete_project(project_id: str) -> bool:
    """Delete a project"""
    try:
        projects_table.delete_item(Key={"project_id": project_id})
        return True
    except ClientError:
        return False


def update_project_flow_graph(project_id: str, flow_graph: dict) -> Dict[str, Any]:
    """Update project's flow_graph"""
    now = get_timestamp()
    
    response = projects_table.update_item(
        Key={"project_id": project_id},
        UpdateExpression="SET flow_graph = :flow_graph, updated_at = :updated",
        ExpressionAttributeValues={
            ":flow_graph": flow_graph,
            ":updated": now
        },
        ReturnValues="ALL_NEW"
    )
    
    return response.get("Attributes", {})


# ============================================================================
# DESIGN MUTATIONS OPERATIONS
# ============================================================================

def create_design_mutation(
    project_id: str,
    screen_id: str,
    mutation_type: str,
    element_path: str,
    element_index: int,
    mutation_data: dict
) -> Dict[str, Any]:
    """Create a new design mutation"""
    mutation_id = generate_uuid()
    now = get_timestamp()
    
    item = {
        "mutation_id": mutation_id,
        "project_id": project_id,
        "screen_id": screen_id,
        "mutation_type": mutation_type,
        "element_path": element_path,
        "element_index": element_index,
        "mutation_data": mutation_data,
        "created_at": now,
        "updated_at": now
    }
    
    design_mutations_table.put_item(Item=item)
    return item


def get_design_mutations_for_screen(
    project_id: str,
    screen_id: str
) -> List[Dict[str, Any]]:
    """Get all design mutations for a specific screen"""
    try:
        response = design_mutations_table.query(
            IndexName="project_id-screen_id-index",
            KeyConditionExpression=Key('project_id').eq(project_id) & Key('screen_id').eq(screen_id)
        )
        items = response.get("Items", [])
        return [convert_decimals(item) for item in items]
    except ClientError as e:
        print(f"Error querying design mutations: {e}")
        # If index doesn't exist, fall back to scan (slower but works)
        try:
            response = design_mutations_table.scan(
                FilterExpression=Attr('project_id').eq(project_id) & Attr('screen_id').eq(screen_id)
            )
            items = response.get("Items", [])
            return [convert_decimals(item) for item in items]
        except ClientError as e2:
            print(f"Error scanning design mutations: {e2}")
            return []


def delete_design_mutations_for_screen(
    project_id: str,
    screen_id: str
) -> int:
    """Delete all design mutations for a specific screen"""
    mutations = get_design_mutations_for_screen(project_id, screen_id)
    deleted_count = 0
    
    for mutation in mutations:
        try:
            design_mutations_table.delete_item(
                Key={"mutation_id": mutation["mutation_id"]}
            )
            deleted_count += 1
        except ClientError as e:
            print(f"Error deleting mutation {mutation['mutation_id']}: {e}")
    
    return deleted_count


def delete_design_mutation(mutation_id: str) -> bool:
    """Delete a specific design mutation"""
    try:
        design_mutations_table.delete_item(Key={"mutation_id": mutation_id})
        return True
    except ClientError:
        return False


# ============================================================================
# FLOW VERSION MANAGEMENT
# ============================================================================

def get_next_flow_version(project_id: str) -> int:
    """Get the next version number for a project's flow"""
    project = get_project(project_id)
    if not project:
        return 1
    
    metadata = project.get("metadata", {})
    current_version = metadata.get("flow_version", 0)
    return current_version + 1


def update_project_flow_version(project_id: str, version: int):
    """Update project's flow version number in metadata"""
    now = get_timestamp()
    
    # Get current project to merge metadata
    project = get_project(project_id)
    metadata = project.get("metadata", {})
    metadata["flow_version"] = version
    metadata["status"] = "completed"
    
    response = projects_table.update_item(
        Key={"project_id": project_id},
        UpdateExpression="SET metadata = :metadata, updated_at = :updated",
        ExpressionAttributeValues={
            ":metadata": metadata,
            ":updated": now
        },
        ReturnValues="ALL_NEW"
    )
    
    return response.get("Attributes", {})