"""
DTR Storage

Local file storage for DTR extraction results.
For now, saves to local JSON files instead of database.
"""
import json
import os
from typing import Dict, Any, Optional
from pathlib import Path
from datetime import datetime


# Storage directory (mounted via Docker volume)
STORAGE_DIR = Path("/app/dtr_outputs")


def ensure_storage_dir():
    """Ensure storage directory exists"""
    STORAGE_DIR.mkdir(parents=True, exist_ok=True)


def get_resource_dir(resource_id: str) -> Path:
    """
    Get directory for a specific resource
    
    Args:
        resource_id: Resource UUID
    
    Returns:
        Path to resource directory
    """
    ensure_storage_dir()
    resource_dir = STORAGE_DIR / resource_id
    resource_dir.mkdir(parents=True, exist_ok=True)
    return resource_dir


def save_pass_result(
    resource_id: str,
    pass_name: str,
    data: Dict[str, Any]
) -> Path:
    """
    Save pass result to local JSON file
    
    Args:
        resource_id: Resource UUID
        pass_name: Pass name (e.g., "pass_1_structure")
        data: Pass result data
    
    Returns:
        Path to saved file
    """
    resource_dir = get_resource_dir(resource_id)
    
    # Create filename with timestamp
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    filename = f"{pass_name}_{timestamp}.json"
    filepath = resource_dir / filename
    
    # Also save as "latest"
    latest_filepath = resource_dir / f"{pass_name}_latest.json"
    
    # Save data
    with open(filepath, 'w') as f:
        json.dump(data, f, indent=2, default=str)
    
    # Save as latest
    with open(latest_filepath, 'w') as f:
        json.dump(data, f, indent=2, default=str)
    
    return filepath


def load_pass_result(
    resource_id: str,
    pass_name: str,
    version: str = "latest"
) -> Optional[Dict[str, Any]]:
    """
    Load pass result from local JSON file
    
    Args:
        resource_id: Resource UUID
        pass_name: Pass name (e.g., "pass_1_structure")
        version: "latest" or specific timestamp
    
    Returns:
        Pass result data, or None if not found
    """
    resource_dir = get_resource_dir(resource_id)
    
    if version == "latest":
        filepath = resource_dir / f"{pass_name}_latest.json"
    else:
        filepath = resource_dir / f"{pass_name}_{version}.json"
    
    if not filepath.exists():
        return None
    
    with open(filepath, 'r') as f:
        return json.load(f)


def save_complete_dtr(
    resource_id: str,
    taste_id: str,
    dtr_data: Dict[str, Any]
) -> Path:
    """
    Save complete DTR (all passes)
    
    Args:
        resource_id: Resource UUID
        taste_id: Taste UUID
        dtr_data: Complete DTR data
    
    Returns:
        Path to saved file
    """
    resource_dir = get_resource_dir(resource_id)
    
    # Add IDs and timestamp
    complete_data = {
        "resource_id": resource_id,
        "taste_id": taste_id,
        "completed_at": datetime.utcnow().isoformat(),
        **dtr_data
    }
    
    # Save with timestamp
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    filename = f"complete_dtr_{timestamp}.json"
    filepath = resource_dir / filename
    
    # Also save as "latest"
    latest_filepath = resource_dir / "complete_dtr_latest.json"
    
    with open(filepath, 'w') as f:
        json.dump(complete_data, f, indent=2, default=str)
    
    with open(latest_filepath, 'w') as f:
        json.dump(complete_data, f, indent=2, default=str)
    
    return filepath


def load_complete_dtr(
    resource_id: str,
    version: str = "latest"
) -> Optional[Dict[str, Any]]:
    """
    Load complete DTR (Pass 6 output)
    
    Args:
        resource_id: Resource UUID
        version: "latest" or specific timestamp
    
    Returns:
        Complete DTR data, or None if not found
    """
    resource_dir = get_resource_dir(resource_id)
    
    if version == "latest":
        # Pass 6 saves as "pass_6_complete_dtr_latest.json"
        filepath = resource_dir / "pass_6_complete_dtr_latest.json"
    else:
        filepath = resource_dir / f"pass_6_complete_dtr_{version}.json"
    
    if not filepath.exists():
        print(f"⚠️  DTR file not found: {filepath}")
        return None
    
    with open(filepath, 'r') as f:
        return json.load(f)


def list_resource_files(resource_id: str) -> list[str]:
    """
    List all DTR files for a resource
    
    Args:
        resource_id: Resource UUID
    
    Returns:
        List of filenames
    """
    resource_dir = get_resource_dir(resource_id)
    
    if not resource_dir.exists():
        return []
    
    return [f.name for f in resource_dir.iterdir() if f.is_file()]


def delete_resource_dtr(resource_id: str):
    """
    Delete all DTR data for a resource
    
    Args:
        resource_id: Resource UUID
    """
    resource_dir = get_resource_dir(resource_id)
    
    if resource_dir.exists():
        import shutil
        shutil.rmtree(resource_dir)


# ============================================================================
# EXTRACTION STATUS TRACKING
# ============================================================================

def save_extraction_status(
    resource_id: str,
    status: str,
    current_pass: Optional[str] = None,
    error: Optional[str] = None,
    quality_tier: Optional[str] = None
):
    """
    Save extraction status
    
    Args:
        resource_id: Resource UUID
        status: Status string (pending, processing, completed, failed)
        current_pass: Current pass being processed
        error: Error message if failed
        quality_tier: Quality tier (base, corrected, approved) - set when Pass 6 completes
    """
    resource_dir = get_resource_dir(resource_id)
    
    status_data = {
        "resource_id": resource_id,
        "status": status,
        "current_pass": current_pass,
        "error": error,
        "quality_tier": quality_tier,
        "updated_at": datetime.utcnow().isoformat()
    }
    
    filepath = resource_dir / "extraction_status.json"
    
    with open(filepath, 'w') as f:
        json.dump(status_data, f, indent=2)


def load_extraction_status(resource_id: str) -> Optional[Dict[str, Any]]:
    """
    Load extraction status
    
    Args:
        resource_id: Resource UUID
    
    Returns:
        Status data, or None if not found
    """
    resource_dir = get_resource_dir(resource_id)
    filepath = resource_dir / "extraction_status.json"
    
    if not filepath.exists():
        return None
    
    with open(filepath, 'r') as f:
        return json.load(f)