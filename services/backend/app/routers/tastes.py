"""
Tastes and Resources API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import List
from datetime import datetime
from app.core.auth import get_current_user
from app.core import db, storage
from app.dtr import storage as dtr_storage
from app.core.models import (
    TasteCreate,
    TasteOut,
    TasteUpdate,
    ResourceCreate,
    ResourceOut,
    ResourceWithUrls,
    ResourceUpdate,
    MessageResponse
)


router = APIRouter(prefix="/api/tastes", tags=["tastes"])


# ============================================================================
# TASTE ENDPOINTS
# ============================================================================

@router.post("/", response_model=TasteOut, status_code=201)
async def create_taste(
    payload: TasteCreate,
    user: dict = Depends(get_current_user)
):
    """
    Create a new taste
    
    - **name**: Name of the taste
    - **metadata**: Optional metadata dictionary
    """
    # Ensure user exists in database
    db.ensure_user(
        user_id=user["user_id"],
        email=user["email"],
        name=user.get("name"),
        picture=user.get("picture")
    )
    
    # Create taste
    taste = db.create_taste(
        owner_id=user["user_id"],
        name=payload.name,
        metadata=payload.metadata
    )
    
    # Add resource count
    taste["resource_count"] = 0
    
    return taste


@router.get("/", response_model=List[TasteOut])
async def list_tastes(user: dict = Depends(get_current_user)):
    """
    List all tastes for the authenticated user
    """
    tastes = db.list_tastes_for_owner(user["user_id"])
    
    # Add resource counts
    for taste in tastes:
        resources = db.list_resources_for_taste(taste["taste_id"])
        taste["resource_count"] = len(resources)
    
    return tastes


@router.get("/{taste_id}", response_model=TasteOut)
async def get_taste(
    taste_id: str,
    user: dict = Depends(get_current_user)
):
    """
    Get a specific taste by ID
    """
    taste = db.get_taste(taste_id)
    
    if not taste:
        raise HTTPException(status_code=404, detail="Taste not found")
    
    if taste.get("owner_id") != user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Add resource count
    resources = db.list_resources_for_taste(taste_id)
    taste["resource_count"] = len(resources)
    
    return taste


@router.patch("/{taste_id}", response_model=TasteOut)
async def update_taste(
    taste_id: str,
    payload: TasteUpdate,
    user: dict = Depends(get_current_user)
):
    """
    Update a taste
    """
    # Check ownership
    taste = db.get_taste(taste_id)
    if not taste:
        raise HTTPException(status_code=404, detail="Taste not found")
    
    if taste.get("owner_id") != user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Update taste
    updated = db.update_taste(
        taste_id=taste_id,
        name=payload.name,
        metadata=payload.metadata
    )
    
    # Add resource count
    resources = db.list_resources_for_taste(taste_id)
    updated["resource_count"] = len(resources)
    
    return updated


@router.delete("/{taste_id}", response_model=MessageResponse)
async def delete_taste(
    taste_id: str,
    user: dict = Depends(get_current_user)
):
    """
    Delete a taste and all its resources
    """
    # Check ownership
    taste = db.get_taste(taste_id)
    if not taste:
        raise HTTPException(status_code=404, detail="Taste not found")
    
    if taste.get("owner_id") != user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Delete all resources in this taste
    resources = db.list_resources_for_taste(taste_id)
    for resource in resources:
        # Delete S3 files
        storage.delete_resource_files(
            owner_id=user["user_id"],
            taste_id=taste_id,
            resource_id=resource["resource_id"]
        )
        # Delete DTR outputs
        try:
            dtr_storage.delete_resource_dtr(resource["resource_id"])
        except Exception as e:
            print(f"Warning: Failed to delete DTR for resource {resource['resource_id']}: {e}")
        # Delete resource from DB
        db.delete_resource(resource["resource_id"])
    
    # Delete taste
    db.delete_taste(taste_id)
    
    return {"message": "Taste deleted successfully"}


# ============================================================================
# RESOURCE ENDPOINTS
# ============================================================================

@router.post("/{taste_id}/resources", response_model=ResourceWithUrls, status_code=201)
async def create_resource(
    taste_id: str,
    payload: ResourceCreate,
    user: dict = Depends(get_current_user)
):
    """
    Create a new resource in a taste
    
    Returns the resource object and presigned PUT URLs for uploading files
    """
    # Check taste ownership
    taste = db.get_taste(taste_id)
    if not taste:
        raise HTTPException(status_code=404, detail="Taste not found")
    
    if taste.get("owner_id") != user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # ✅ FIX: Generate resource_id ONCE and pass it to db.create_resource
    resource_id = db.generate_uuid()
    figma_key = storage.get_figma_key(user["user_id"], taste_id, resource_id)
    image_key = storage.get_image_key(user["user_id"], taste_id, resource_id)
    
    # Create resource in database with the SAME resource_id
    resource = db.create_resource(
        resource_id=resource_id,  # ✅ PASS THE ID HERE
        taste_id=taste_id,
        owner_id=user["user_id"],
        name=payload.name,
        figma_key=figma_key,
        image_key=image_key,
        metadata=payload.metadata
    )
    
    # Generate presigned PUT URLs using the SAME resource_id
    upload_urls = storage.generate_resource_upload_urls(
        owner_id=user["user_id"],
        taste_id=taste_id,
        resource_id=resource_id  # ✅ Uses same ID
    )
    
    return {
        "resource": resource,
        "upload_urls": {
            "figma_put_url": upload_urls.get("figma_put_url"),
            "image_put_url": upload_urls.get("image_put_url")
        }
    }


@router.get("/{taste_id}/resources", response_model=List[ResourceOut])
async def list_resources(
    taste_id: str,
    user: dict = Depends(get_current_user)
):
    """
    List all resources in a taste
    """
    # Check taste ownership
    taste = db.get_taste(taste_id)
    if not taste:
        raise HTTPException(status_code=404, detail="Taste not found")
    
    if taste.get("owner_id") != user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    resources = db.list_resources_for_taste(taste_id)
    return resources


@router.get("/{taste_id}/resources/{resource_id}", response_model=ResourceOut)
async def get_resource(
    taste_id: str,
    resource_id: str,
    user: dict = Depends(get_current_user),
    include_download_urls: bool = False
):
    """
    Get a specific resource
    
    - **include_download_urls**: If true, include presigned GET URLs for files
    """
    resource = db.get_resource(resource_id)
    
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    
    if resource.get("owner_id") != user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if resource.get("taste_id") != taste_id:
        raise HTTPException(status_code=400, detail="Resource does not belong to this taste")
    
    # Optionally add download URLs
    if include_download_urls:
        download_urls = storage.generate_resource_download_urls(
            owner_id=user["user_id"],
            taste_id=taste_id,
            resource_id=resource_id,
            has_figma=resource.get("has_figma", False),
            has_image=resource.get("has_image", False)
        )
        resource["download_urls"] = download_urls
    
    return resource


@router.patch("/{taste_id}/resources/{resource_id}", response_model=ResourceOut)
async def update_resource(
    taste_id: str,
    resource_id: str,
    payload: ResourceUpdate,
    user: dict = Depends(get_current_user)
):
    """
    Update a resource
    
    Use this endpoint to mark files as uploaded (has_figma, has_image)
    """
    # Check ownership
    resource = db.get_resource(resource_id)
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    
    if resource.get("owner_id") != user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if resource.get("taste_id") != taste_id:
        raise HTTPException(status_code=400, detail="Resource does not belong to this taste")
    
    # Update resource
    updated = db.update_resource(
        resource_id=resource_id,
        name=payload.name,
        has_figma=payload.has_figma,
        has_image=payload.has_image,
        metadata=payload.metadata
    )
    
    return updated


@router.delete("/{taste_id}/resources/{resource_id}", response_model=MessageResponse)
async def delete_resource(
    taste_id: str,
    resource_id: str,
    user: dict = Depends(get_current_user)
):
    """
    Delete a resource and its files from S3
    Sets needs_dtm_rebuild flag instead of triggering immediate rebuild
    """
    # Check ownership
    resource = db.get_resource(resource_id)
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    
    if resource.get("owner_id") != user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if resource.get("taste_id") != taste_id:
        raise HTTPException(status_code=400, detail="Resource does not belong to this taste")
    
    # Delete S3 files
    storage.delete_resource_files(
        owner_id=user["user_id"],
        taste_id=taste_id,
        resource_id=resource_id
    )
    
    # Delete DTR outputs
    try:
        dtr_storage.delete_resource_dtr(resource_id)
    except Exception as e:
        print(f"Warning: Failed to delete DTR for resource {resource_id}: {e}")
    
    # Delete resource from DB
    db.delete_resource(resource_id)
    print(f"✓ Deleted resource {resource_id} from database")
    
    # Set needs_dtm_rebuild flag on taste (if it has or had DTM)
    taste = db.get_taste(taste_id)
    if taste:
        metadata = taste.get("metadata", {})
        has_dtm = metadata.get("has_dtm")
        
        print(f"📊 Taste {taste_id} metadata: has_dtm={has_dtm}, current needs_rebuild={metadata.get('needs_dtm_rebuild')}")
        
        # Only set rebuild flag if taste has/had DTM
        # (no point rebuilding if there was never a DTM)
        if has_dtm:
            metadata["needs_dtm_rebuild"] = True
            metadata["last_deleted_at"] = datetime.utcnow().isoformat()
            db.update_taste(taste_id, metadata=metadata)
            print(f"✓ Marked taste {taste_id} as needing DTM rebuild (needs_dtm_rebuild=True)")
            
            # Verify the update
            updated_taste = db.get_taste(taste_id)
            updated_metadata = updated_taste.get("metadata", {})
            print(f"✓ Verification: needs_dtm_rebuild={updated_metadata.get('needs_dtm_rebuild')}")
        else:
            print(f"⊘ Taste {taste_id} has no DTM, skipping rebuild flag")
    else:
        print(f"⚠️  Warning: Could not find taste {taste_id} after resource deletion")
    
    return {"message": "Resource deleted successfully"}