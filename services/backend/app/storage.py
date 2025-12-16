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
