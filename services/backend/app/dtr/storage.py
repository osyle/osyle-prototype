"""
DTR Storage - S3-based storage for DTR extraction results
Migrated from local filesystem to S3 for production use
"""
import json
from typing import Dict, Any, Optional
from datetime import datetime
from app import storage as s3_storage
from app import db


def save_pass_result(
    resource_id: str,
    pass_name: str,
    data: Dict[str, Any]
) -> str:
    """
    Save pass result to S3
    
    Args:
        resource_id: Resource UUID
        pass_name: Pass name (e.g., "pass_1_structure")
        data: Pass result data
    
    Returns:
        S3 key of saved file
    """
    # Get resource to find owner_id and taste_id
    resource = db.get_resource(resource_id)
    if not resource:
        raise ValueError(f"Resource {resource_id} not found")
    
    owner_id = resource["owner_id"]
    taste_id = resource["taste_id"]
    
    # Generate timestamp
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    
    # Save latest version
    latest_key = s3_storage.get_dtr_pass_key(owner_id, taste_id, resource_id, pass_name)
    s3_storage.save_json_to_s3(latest_key, data)
    
    # Save timestamped version (S3 versioning will handle this, but we also save explicitly)
    versioned_key = s3_storage.get_dtr_pass_versioned_key(owner_id, taste_id, resource_id, pass_name, timestamp)
    s3_storage.save_json_to_s3(versioned_key, data)
    
    print(f"✅ Saved {pass_name} to S3: {latest_key}")
    return latest_key


def load_pass_result(
    resource_id: str,
    pass_name: str,
    version: str = "latest"
) -> Optional[Dict[str, Any]]:
    """
    Load pass result from S3
    
    Args:
        resource_id: Resource UUID
        pass_name: Pass name (e.g., "pass_1_structure")
        version: "latest" or specific timestamp
    
    Returns:
        Pass result data, or None if not found
    """
    # Get resource to find owner_id and taste_id
    resource = db.get_resource(resource_id)
    if not resource:
        return None
    
    owner_id = resource["owner_id"]
    taste_id = resource["taste_id"]
    
    if version == "latest":
        key = s3_storage.get_dtr_pass_key(owner_id, taste_id, resource_id, pass_name)
    else:
        key = s3_storage.get_dtr_pass_versioned_key(owner_id, taste_id, resource_id, pass_name, version)
    
    return s3_storage.load_json_from_s3(key)


def save_complete_dtr(
    resource_id: str,
    taste_id: str,
    dtr_data: Dict[str, Any]
) -> str:
    """
    Save complete DTR (all passes) to S3
    
    Args:
        resource_id: Resource UUID
        taste_id: Taste UUID
        dtr_data: Complete DTR data
    
    Returns:
        S3 key of saved file
    """
    # Get resource to find owner_id
    resource = db.get_resource(resource_id)
    if not resource:
        raise ValueError(f"Resource {resource_id} not found")
    
    owner_id = resource["owner_id"]
    
    # Add IDs and timestamp
    complete_data = {
        "resource_id": resource_id,
        "taste_id": taste_id,
        "completed_at": datetime.utcnow().isoformat(),
        **dtr_data
    }
    
    return save_pass_result(resource_id, "pass_6_complete_dtr", complete_data)


def load_complete_dtr(
    resource_id: str,
    version: str = "latest"
) -> Optional[Dict[str, Any]]:
    """
    Load complete DTR (Pass 6 output) from S3
    
    Args:
        resource_id: Resource UUID
        version: "latest" or specific timestamp
    
    Returns:
        Complete DTR data, or None if not found
    """
    return load_pass_result(resource_id, "pass_6_complete_dtr", version)


def list_resource_files(resource_id: str) -> list[str]:
    """
    List all DTR files for a resource
    
    Note: In S3 implementation, this would require listing objects
    which is expensive. For now, return empty list.
    Individual files can still be loaded by name.
    
    Args:
        resource_id: Resource UUID
    
    Returns:
        List of filenames (empty in S3 implementation)
    """
    # In S3 implementation, listing all files is expensive
    # Individual files can be loaded by name using load_pass_result
    return []


def delete_resource_dtr(resource_id: str):
    """
    Delete all DTR data for a resource from S3
    
    Args:
        resource_id: Resource UUID
    """
    # Get resource to find owner_id and taste_id
    resource = db.get_resource(resource_id)
    if not resource:
        return
    
    owner_id = resource["owner_id"]
    taste_id = resource["taste_id"]
    
    # Delete main DTR files (passes 1-6 and status)
    # Note: Versioned files remain in S3 for history
    passes = [
        "pass_1_structure",
        "pass_2_surface",
        "pass_3_typography",
        "pass_4_image_usage",
        "pass_5_components",
        "pass_6_complete_dtr"
    ]
    
    for pass_name in passes:
        key = s3_storage.get_dtr_pass_key(owner_id, taste_id, resource_id, pass_name)
        s3_storage.delete_object(key)
    
    # Delete extraction status
    status_key = s3_storage.get_dtr_extraction_status_key(owner_id, taste_id, resource_id)
    s3_storage.delete_object(status_key)
    
    print(f"✅ Deleted DTR files for resource {resource_id}")


def save_extraction_status(
    resource_id: str,
    status: str,
    current_pass: Optional[str] = None,
    error: Optional[str] = None,
    quality_tier: Optional[str] = None
):
    """
    Save extraction status to S3
    
    Args:
        resource_id: Resource UUID
        status: Status ("pending", "processing", "completed", "failed")
        current_pass: Current pass being processed
        error: Error message if failed
        quality_tier: Quality tier (base, corrected, approved) - set when Pass 6 completes
    """
    # Get resource to find owner_id and taste_id
    resource = db.get_resource(resource_id)
    if not resource:
        raise ValueError(f"Resource {resource_id} not found")
    
    owner_id = resource["owner_id"]
    taste_id = resource["taste_id"]
    
    status_data = {
        "resource_id": resource_id,
        "status": status,
        "current_pass": current_pass,
        "error": error,
        "quality_tier": quality_tier,
        "updated_at": datetime.utcnow().isoformat()
    }
    
    key = s3_storage.get_dtr_extraction_status_key(owner_id, taste_id, resource_id)
    s3_storage.save_json_to_s3(key, status_data)


def load_extraction_status(resource_id: str) -> Optional[Dict[str, Any]]:
    """
    Load extraction status from S3
    
    Args:
        resource_id: Resource UUID
    
    Returns:
        Status data, or None if not found
    """
    # Get resource to find owner_id and taste_id
    resource = db.get_resource(resource_id)
    if not resource:
        return None
    
    owner_id = resource["owner_id"]
    taste_id = resource["taste_id"]
    
    key = s3_storage.get_dtr_extraction_status_key(owner_id, taste_id, resource_id)
    return s3_storage.load_json_from_s3(key)