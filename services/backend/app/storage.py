"""
S3 storage operations for Osyle
Provides presigned URL generation and file operations
"""
import os
import re
import json
import boto3
from botocore.config import Config
from botocore.exceptions import ClientError
from typing import Optional, List


# ============================================================================
# S3 SETUP
# ============================================================================

S3_REGION = os.getenv("AWS_REGION", "us-east-1")
S3_BUCKET = os.getenv("S3_BUCKET", "osyle-shared-assets")
S3_ENDPOINT = os.getenv("S3_ENDPOINT_URL")  # For local development (LocalStack)
PRESIGNED_EXPIRATION = int(os.getenv("PRESIGNED_EXPIRATION", "3600"))  # 1 hour default

# Initialize S3 client
if S3_ENDPOINT:
    s3_client = boto3.client(
        "s3",
        region_name=S3_REGION,
        endpoint_url=S3_ENDPOINT,
        config=Config(signature_version='s3v4')
    )
else:
    s3_client = boto3.client(
        "s3",
        region_name=S3_REGION,
        config=Config(signature_version='s3v4')
    )


# ============================================================================
# KEY GENERATION HELPERS
# ============================================================================

def get_figma_key(owner_id: str, taste_id: str, resource_id: str) -> str:
    """Generate S3 key for figma.json file"""
    return f"tastes/{owner_id}/{taste_id}/resources/{resource_id}/figma.json"


def get_image_key(owner_id: str, taste_id: str, resource_id: str) -> str:
    """Generate S3 key for image.png file"""
    return f"tastes/{owner_id}/{taste_id}/resources/{resource_id}/image.png"


def get_project_output_key(owner_id: str, project_id: str, filename: str) -> str:
    """Generate S3 key for project output file"""
    return f"projects/{owner_id}/{project_id}/outputs/{filename}"


def get_inspiration_image_key(owner_id: str, project_id: str, filename: str) -> str:
    """Generate S3 key for project inspiration image"""
    return f"projects/{owner_id}/{project_id}/inspiration/{filename}"


def get_screen_reference_figma_key(owner_id: str, project_id: str, screen_index: int) -> str:
    """Generate S3 key for screen reference figma.json"""
    return f"projects/{owner_id}/{project_id}/screens/screen_{screen_index}/figma.json"


def get_screen_reference_image_key(owner_id: str, project_id: str, screen_index: int, image_index: int = 0) -> str:
    """Generate S3 key for screen reference image"""
    return f"projects/{owner_id}/{project_id}/screens/screen_{screen_index}/image_{image_index}.png"


# ============================================================================
# PRESIGNED URL GENERATION
# ============================================================================

def generate_presigned_put_url(
    key: str,
    content_type: str,
    expires_in: int = PRESIGNED_EXPIRATION
) -> Optional[str]:
    """
    Generate a presigned PUT URL for uploading a file to S3
    
    Args:
        key: S3 object key
        content_type: MIME type of the file (e.g., 'application/json', 'image/png')
        expires_in: URL expiration time in seconds (default: 1 hour)
    
    Returns:
        Presigned PUT URL or None if error
    """
    try:
        url = s3_client.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': S3_BUCKET,
                'Key': key,
                'ContentType': content_type
            },
            ExpiresIn=expires_in,
            HttpMethod='PUT'
        )
        return url
    except ClientError as e:
        print(f"Error generating presigned PUT URL: {e}")
        return None


def generate_presigned_get_url(
    key: str,
    expires_in: int = PRESIGNED_EXPIRATION
) -> Optional[str]:
    """
    Generate a presigned GET URL for downloading a file from S3
    
    Args:
        key: S3 object key
        expires_in: URL expiration time in seconds (default: 1 hour)
    
    Returns:
        Presigned GET URL or None if error
    """
    try:
        url = s3_client.generate_presigned_url(
            'get_object',
            Params={
                'Bucket': S3_BUCKET,
                'Key': key
            },
            ExpiresIn=expires_in
        )
        return url
    except ClientError as e:
        print(f"Error generating presigned GET URL: {e}")
        return None


def generate_resource_upload_urls(
    owner_id: str,
    taste_id: str,
    resource_id: str
) -> dict:
    """
    Generate presigned PUT URLs for both figma.json and image.png
    
    Returns:
        Dictionary with 'figma' and 'image' presigned PUT URLs
    """
    figma_key = get_figma_key(owner_id, taste_id, resource_id)
    image_key = get_image_key(owner_id, taste_id, resource_id)
    
    figma_url = generate_presigned_put_url(figma_key, "application/json")
    image_url = generate_presigned_put_url(image_key, "image/png")
    
    return {
        "figma_key": figma_key,
        "image_key": image_key,
        "figma_put_url": figma_url,
        "image_put_url": image_url
    }


def generate_resource_download_urls(
    owner_id: str,
    taste_id: str,
    resource_id: str,
    has_figma: bool = True,
    has_image: bool = True
) -> dict:
    """
    Generate presigned GET URLs for figma.json and/or image.png
    
    Returns:
        Dictionary with 'figma' and 'image' presigned GET URLs (if they exist)
    """
    result = {}
    
    if has_figma:
        figma_key = get_figma_key(owner_id, taste_id, resource_id)
        figma_url = generate_presigned_get_url(figma_key)
        if figma_url:
            result["figma_get_url"] = figma_url
    
    if has_image:
        image_key = get_image_key(owner_id, taste_id, resource_id)
        image_url = generate_presigned_get_url(image_key)
        if image_url:
            result["image_get_url"] = image_url
    
    return result


# ============================================================================
# FILE OPERATIONS
# ============================================================================

def check_object_exists(key: str) -> bool:
    """
    Check if an object exists in S3
    
    Args:
        key: S3 object key
    
    Returns:
        True if object exists, False otherwise
    """
    try:
        s3_client.head_object(Bucket=S3_BUCKET, Key=key)
        return True
    except ClientError as e:
        if e.response['Error']['Code'] == '404':
            return False
        print(f"Error checking object existence: {e}")
        return False


def delete_object(key: str) -> bool:
    """
    Delete an object from S3
    
    Args:
        key: S3 object key
    
    Returns:
        True if deletion successful, False otherwise
    """
    try:
        s3_client.delete_object(Bucket=S3_BUCKET, Key=key)
        return True
    except ClientError as e:
        print(f"Error deleting object: {e}")
        return False


def delete_resource_files(owner_id: str, taste_id: str, resource_id: str) -> dict:
    """
    Delete both figma.json and image.png for a resource
    
    Returns:
        Dictionary with deletion status for each file
    """
    figma_key = get_figma_key(owner_id, taste_id, resource_id)
    image_key = get_image_key(owner_id, taste_id, resource_id)
    
    return {
        "figma_deleted": delete_object(figma_key),
        "image_deleted": delete_object(image_key)
    }


def delete_project_outputs(owner_id: str, project_id: str, output_keys: list) -> dict:
    """
    Delete multiple project output files
    
    Args:
        owner_id: User ID
        project_id: Project ID
        output_keys: List of output filenames or full keys
    
    Returns:
        Dictionary with deletion status
    """
    deleted = []
    failed = []
    
    for key in output_keys:
        # If it's just a filename, construct the full key
        if not key.startswith("projects/"):
            key = get_project_output_key(owner_id, project_id, key)
        
        if delete_object(key):
            deleted.append(key)
        else:
            failed.append(key)
    
    return {
        "deleted": deleted,
        "failed": failed
    }


# ============================================================================
# LLM-RELATED FUNCTIONS
# ============================================================================


def get_resource_figma(user_id: str, taste_id: str, resource_id: str) -> str:
    """Get Figma JSON content from resource"""
    key = f"tastes/{user_id}/{taste_id}/resources/{resource_id}/figma.json"
    
    try:
        response = s3_client.get_object(Bucket=S3_BUCKET, Key=key)
        content = response['Body'].read().decode('utf-8')
        return content
    except s3_client.exceptions.NoSuchKey:
        return None
    except Exception as e:
        print(f"Error getting Figma JSON: {e}")
        raise


def get_resource_image(user_id: str, taste_id: str, resource_id: str) -> bytes:
    """Get image bytes from resource"""
    key = f"tastes/{user_id}/{taste_id}/resources/{resource_id}/image.png"
    
    try:
        response = s3_client.get_object(Bucket=S3_BUCKET, Key=key)
        return response['Body'].read()
    except s3_client.exceptions.NoSuchKey:
        return None
    except Exception as e:
        print(f"Error getting image: {e}")
        raise


def get_inspiration_image(user_id: str, project_id: str, filename: str) -> bytes:
    """Get inspiration image bytes from project"""
    key = get_inspiration_image_key(user_id, project_id, filename)
    
    try:
        response = s3_client.get_object(Bucket=S3_BUCKET, Key=key)
        return response['Body'].read()
    except s3_client.exceptions.NoSuchKey:
        return None
    except Exception as e:
        print(f"Error getting inspiration image: {e}")
        raise


def get_resource_dtr(user_id: str, taste_id: str, resource_id: str) -> dict:
    """Get DTR JSON from resource"""
    key = f"tastes/{user_id}/{taste_id}/resources/{resource_id}/dtr.json"
    
    try:
        response = s3_client.get_object(Bucket=S3_BUCKET, Key=key)
        content = response['Body'].read().decode('utf-8')
        return json.loads(content)
    except s3_client.exceptions.NoSuchKey:
        return None
    except Exception as e:
        print(f"Error getting DTR: {e}")
        raise


def put_resource_dtr(user_id: str, taste_id: str, resource_id: str, dtr_json: dict):
    """Save DTR JSON to resource"""
    key = f"tastes/{user_id}/{taste_id}/resources/{resource_id}/dtr.json"
    
    try:
        s3_client.put_object(
            Bucket=S3_BUCKET,
            Key=key,
            Body=json.dumps(dtr_json, indent=2),
            ContentType='application/json'
        )
    except Exception as e:
        print(f"Error saving DTR: {e}")
        raise


def resource_dtr_exists(user_id: str, taste_id: str, resource_id: str) -> bool:
    """
    Check if DTR already exists for a resource.
    
    Args:
        user_id: User ID
        taste_id: Taste ID
        resource_id: Resource ID
        
    Returns:
        True if dtr.json exists, False otherwise
    """
    key = f"tastes/{user_id}/{taste_id}/resources/{resource_id}/dtr.json"
    return check_object_exists(key)


def get_project_ui(user_id: str, project_id: str, version: int = 1) -> dict:
    """Get UI JSON from project (specific version)"""
    key = f"projects/{user_id}/{project_id}/ui_v{version}.json"
    
    try:
        response = s3_client.get_object(Bucket=S3_BUCKET, Key=key)
        content = response['Body'].read().decode('utf-8')
        return json.loads(content)
    except s3_client.exceptions.NoSuchKey:
        return None
    except Exception as e:
        print(f"Error getting UI: {e}")
        raise


def put_project_ui(user_id: str, project_id: str, ui_json: dict, version: int = 1):
    """Save UI JSON to project (versioned)"""
    key = f"projects/{user_id}/{project_id}/ui_v{version}.json"
    
    try:
        s3_client.put_object(
            Bucket=S3_BUCKET,
            Key=key,
            Body=json.dumps(ui_json, indent=2),
            ContentType='application/json'
        )
    except Exception as e:
        print(f"Error saving UI: {e}")
        raise


def list_project_ui_versions(user_id: str, project_id: str) -> list:
    """List all UI versions for a project"""
    prefix = f"projects/{user_id}/{project_id}/"
    
    try:
        response = s3_client.list_objects_v2(
            Bucket=S3_BUCKET,
            Prefix=prefix
        )
        
        versions = []
        for obj in response.get('Contents', []):
            key = obj['Key']
            if key.endswith('.json') and 'ui_v' in key:
                # Extract version number from ui_v1.json, ui_v2.json, etc.
                match = re.search(r'ui_v(\d+)\.json', key)
                if match:
                    versions.append(int(match.group(1)))
        
        return sorted(versions)
    except Exception as e:
        print(f"Error listing UI versions: {e}")
        return []


def get_inspiration_images(user_id: str, project_id: str, image_keys: List[str]) -> List[dict]:
    """
    Get inspiration images for a project
    
    Returns list of dicts with base64 data and media_type
    """
    images = []
    
    for key in image_keys:
        try:
            response = s3_client.get_object(Bucket=S3_BUCKET, Key=key)
            image_bytes = response['Body'].read()
            
            # Encode as base64
            import base64
            base64_data = base64.b64encode(image_bytes).decode('utf-8')
            
            # Get content type
            content_type = response.get('ContentType', 'image/png')
            
            images.append({
                'data': base64_data,
                'media_type': content_type
            })
        except Exception as e:
            print(f"Error loading inspiration image {key}: {e}")
    
    return images


def get_screen_reference_files(user_id: str, project_id: str, screen_index: int, has_figma: bool, image_count: int) -> dict:
    """
    Get screen reference files (figma.json and images)
    
    Returns dict with figma_data and images list
    """
    result = {
        'figma_data': None,
        'images': []
    }
    
    # Get figma.json if available
    if has_figma:
        try:
            figma_key = get_screen_reference_figma_key(user_id, project_id, screen_index)
            response = s3_client.get_object(Bucket=S3_BUCKET, Key=figma_key)
            figma_str = response['Body'].read().decode('utf-8')
            result['figma_data'] = json.loads(figma_str)
        except Exception as e:
            print(f"Error loading screen {screen_index} figma: {e}")
    
    # Get images if available
    for img_idx in range(image_count):
        try:
            img_key = get_screen_reference_image_key(user_id, project_id, screen_index, img_idx)
            response = s3_client.get_object(Bucket=S3_BUCKET, Key=img_key)
            image_bytes = response['Body'].read()
            
            import base64
            base64_data = base64.b64encode(image_bytes).decode('utf-8')
            content_type = response.get('ContentType', 'image/png')
            
            result['images'].append({
                'data': base64_data,
                'media_type': content_type
            })
        except Exception as e:
            print(f"Error loading screen {screen_index} image {img_idx}: {e}")
    
    return result


# ============================================================================
# FLOW VERSIONING FUNCTIONS
# ============================================================================

def get_project_flow(user_id: str, project_id: str, version: int = 1) -> dict:
    """Get flow graph from project (specific version)"""
    key = f"projects/{user_id}/{project_id}/flow_v{version}.json"
    
    try:
        response = s3_client.get_object(Bucket=S3_BUCKET, Key=key)
        content = response['Body'].read().decode('utf-8')
        return json.loads(content)
    except s3_client.exceptions.NoSuchKey:
        return None
    except Exception as e:
        print(f"Error getting flow: {e}")
        raise


def put_project_flow(user_id: str, project_id: str, flow_graph: dict, version: int = 1):
    """Save flow graph to project (versioned)"""
    key = f"projects/{user_id}/{project_id}/flow_v{version}.json"
    
    try:
        # ✅ Validate JSON serialization (catches Decimal objects)
        json_str = json.dumps(flow_graph, indent=2)
        
        s3_client.put_object(
            Bucket=S3_BUCKET,
            Key=key,
            Body=json_str,
            ContentType='application/json'
        )
        print(f"✅ Successfully saved flow version {version} to S3")
    except TypeError as e:
        print(f"❌ JSON serialization error (likely Decimal objects): {e}")
        print(f"❌ flow_graph keys: {list(flow_graph.keys())}")
        raise ValueError(f"Cannot save flow_graph: contains non-JSON-serializable objects. Did you convert Decimals to floats first?")
    except Exception as e:
        print(f"❌ Error saving flow to S3: {e}")
        raise


def list_project_flow_versions(user_id: str, project_id: str) -> list:
    """List all flow versions for a project"""
    prefix = f"projects/{user_id}/{project_id}/"
    
    try:
        response = s3_client.list_objects_v2(
            Bucket=S3_BUCKET,
            Prefix=prefix
        )
        
        versions = []
        for obj in response.get('Contents', []):
            key = obj['Key']
            if key.endswith('.json') and 'flow_v' in key:
                # Extract version number from flow_v1.json, flow_v2.json, etc.
                match = re.search(r'flow_v(\d+)\.json', key)
                if match:
                    versions.append(int(match.group(1)))
        
        return sorted(versions)
    except Exception as e:
        print(f"Error listing flow versions: {e}")
        return []


def delete_project_flow_version(user_id: str, project_id: str, version: int) -> bool:
    """
    Delete a specific flow version
    
    Args:
        user_id: User ID
        project_id: Project ID
        version: Version number to delete
    
    Returns:
        True if deletion successful, False otherwise
    """
    flow_key = f"projects/{user_id}/{project_id}/flow_v{version}.json"
    conversation_key = f"projects/{user_id}/{project_id}/conversation_v{version}.json"
    
    try:
        # Delete flow file
        flow_deleted = delete_object(flow_key)
        
        # Delete conversation file (if exists)
        conversation_deleted = delete_object(conversation_key)
        
        print(f"✅ Deleted version {version}: flow={flow_deleted}, conversation={conversation_deleted}")
        return flow_deleted  # Return True if at least flow was deleted
    except Exception as e:
        print(f"❌ Error deleting version {version}: {e}")
        return False


# ============================================================================
# CONVERSATION VERSIONING FUNCTIONS
# ============================================================================

def get_project_conversation(user_id: str, project_id: str, version: int = 1) -> list:
    """
    Get conversation history from project (specific version)
    
    Returns:
        List of message objects: [{"id": str, "type": "user"|"ai", "content": str, "timestamp": str, "screen": str}, ...]
        Returns empty list if no conversation exists
    """
    key = f"projects/{user_id}/{project_id}/conversation_v{version}.json"
    
    try:
        response = s3_client.get_object(Bucket=S3_BUCKET, Key=key)
        content = response['Body'].read().decode('utf-8')
        return json.loads(content)
    except s3_client.exceptions.NoSuchKey:
        # No conversation exists for this version (e.g., initial generation)
        return []
    except Exception as e:
        print(f"Error getting conversation: {e}")
        return []


def put_project_conversation(user_id: str, project_id: str, conversation: list, version: int = 1):
    """
    Save conversation history to project (versioned)
    
    Args:
        user_id: User ID
        project_id: Project ID
        conversation: List of message objects
        version: Version number
    """
    key = f"projects/{user_id}/{project_id}/conversation_v{version}.json"
    
    try:
        # Validate JSON serialization
        json_str = json.dumps(conversation, indent=2)
        
        s3_client.put_object(
            Bucket=S3_BUCKET,
            Key=key,
            Body=json_str,
            ContentType='application/json'
        )
        print(f"✅ Successfully saved conversation version {version} to S3")
    except Exception as e:
        print(f"❌ Error saving conversation to S3: {e}")
        raise


# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def get_bucket_name() -> str:
    """Get the configured S3 bucket name"""
    return S3_BUCKET


def validate_key_ownership(key: str, owner_id: str) -> bool:
    """
    Validate that a key belongs to the specified owner
    
    Args:
        key: S3 object key
        owner_id: User ID to validate against
    
    Returns:
        True if key contains owner_id in the path, False otherwise
    """
    # Keys should follow pattern: tastes/{owner_id}/... or projects/{owner_id}/...
    return f"/{owner_id}/" in key or key.startswith(f"tastes/{owner_id}/") or key.startswith(f"projects/{owner_id}/")


"""
DTM Storage Functions
These functions manage DTM (Designer Taste Model) storage in S3
"""

def get_dtm_key(user_id: str, taste_id: str) -> str:
    """Generate S3 key for DTM JSON"""
    return f"tastes/{user_id}/{taste_id}/dtm.json"


def get_taste_dtm(user_id: str, taste_id: str) -> dict:
    """Get DTM JSON from taste"""
    key = get_dtm_key(user_id, taste_id)
    
    try:
        response = s3_client.get_object(Bucket=S3_BUCKET, Key=key)
        content = response['Body'].read().decode('utf-8')
        return json.loads(content)
    except s3_client.exceptions.NoSuchKey:
        return None
    except Exception as e:
        print(f"Error getting DTM: {e}")
        raise


def put_taste_dtm(user_id: str, taste_id: str, dtm_json: dict):
    """Save DTM JSON to taste"""
    key = get_dtm_key(user_id, taste_id)
    
    try:
        s3_client.put_object(
            Bucket=S3_BUCKET,
            Key=key,
            Body=json.dumps(dtm_json, indent=2),
            ContentType='application/json'
        )
    except Exception as e:
        print(f"Error saving DTM: {e}")
        raise


def delete_taste_dtm(user_id: str, taste_id: str) -> bool:
    """Delete DTM for a taste"""
    key = get_dtm_key(user_id, taste_id)
    return delete_object(key)


def taste_dtm_exists(user_id: str, taste_id: str) -> bool:
    """Check if DTM exists for a taste"""
    key = get_dtm_key(user_id, taste_id)
    return check_object_exists(key)


# ============================================================================
# DTR/DTM JSON STORAGE HELPERS
# ============================================================================

def save_json_to_s3(key: str, data: dict) -> bool:
    """
    Save JSON data to S3
    
    Args:
        key: S3 object key
        data: Dictionary to save as JSON
    
    Returns:
        True if successful, False otherwise
    """
    try:
        s3_client.put_object(
            Bucket=S3_BUCKET,
            Key=key,
            Body=json.dumps(data, indent=2, default=str),
            ContentType='application/json'
        )
        return True
    except Exception as e:
        print(f"Error saving JSON to S3 ({key}): {e}")
        return False


def load_json_from_s3(key: str) -> Optional[dict]:
    """
    Load JSON data from S3
    
    Args:
        key: S3 object key
    
    Returns:
        Dictionary if successful, None if not found
    """
    try:
        response = s3_client.get_object(Bucket=S3_BUCKET, Key=key)
        content = response['Body'].read().decode('utf-8')
        return json.loads(content)
    except s3_client.exceptions.NoSuchKey:
        return None
    except Exception as e:
        print(f"Error loading JSON from S3 ({key}): {e}")
        return None


# ============================================================================
# DTR S3 KEY GENERATION
# ============================================================================

def get_dtr_pass_key(owner_id: str, taste_id: str, resource_id: str, pass_name: str) -> str:
    """Generate S3 key for DTR pass output (latest version)"""
    return f"resources/{owner_id}/{taste_id}/{resource_id}/dtr/{pass_name}_latest.json"


def get_dtr_pass_versioned_key(owner_id: str, taste_id: str, resource_id: str, pass_name: str, timestamp: str) -> str:
    """Generate S3 key for timestamped DTR pass output"""
    return f"resources/{owner_id}/{taste_id}/{resource_id}/dtr/versions/{pass_name}_{timestamp}.json"


def get_dtr_extraction_status_key(owner_id: str, taste_id: str, resource_id: str) -> str:
    """Generate S3 key for extraction status"""
    return f"resources/{owner_id}/{taste_id}/{resource_id}/dtr/extraction_status.json"


# ============================================================================
# DTM S3 KEY GENERATION (Pass 7)
# ============================================================================

def get_dtm_complete_key(owner_id: str, taste_id: str) -> str:
    """Generate S3 key for complete DTM (latest version)"""
    return f"tastes/{owner_id}/{taste_id}/dtm/complete_dtm_latest.json"


def get_dtm_versioned_key(owner_id: str, taste_id: str, timestamp: str) -> str:
    """Generate S3 key for timestamped DTM"""
    return f"tastes/{owner_id}/{taste_id}/dtm/versions/complete_dtm_{timestamp}.json"


def get_dtm_metadata_key(owner_id: str, taste_id: str) -> str:
    """Generate S3 key for DTM metadata"""
    return f"tastes/{owner_id}/{taste_id}/dtm/dtm_metadata.json"


def get_dtm_fingerprint_key(owner_id: str, taste_id: str, resource_id: str) -> str:
    """Generate S3 key for resource fingerprint"""
    return f"tastes/{owner_id}/{taste_id}/dtm_fingerprints/{resource_id}_fingerprint.json"


def get_dtm_subset_key(owner_id: str, taste_id: str, subset_hash: str) -> str:
    """Generate S3 key for subset DTM"""
    return f"tastes/{owner_id}/{taste_id}/dtm_subsets/{subset_hash}.json"


def get_dtm_subset_index_key(owner_id: str, taste_id: str) -> str:
    """Generate S3 key for subset index"""
    return f"tastes/{owner_id}/{taste_id}/dtm_subsets/subset_index.json"