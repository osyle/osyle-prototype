"""
DTM API Routes
REST endpoints for Design Taste Model operations
"""
from fastapi import APIRouter, Depends, HTTPException, Body
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from app.auth import get_current_user
from app import db
from app.dtm import synthesizer, storage as dtm_storage, builder
from app.dtr import storage as dtr_storage
from app.llm.service import LLMService


router = APIRouter(prefix="/api/dtm", tags=["dtm"])


# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================

class DTMBuildRequest(BaseModel):
    """Request to build DTM"""
    taste_id: str
    resource_ids: Optional[List[str]] = None  # If None, use all resources
    priority_mode: bool = False


class DTMBuildResponse(BaseModel):
    """Response from DTM build"""
    status: str
    dtm_id: str
    resource_count: int
    confidence: float
    duration_seconds: float


class DTMStatusResponse(BaseModel):
    """DTM status for a taste"""
    exists: bool
    resource_count: int = 0
    created_at: Optional[str] = None
    confidence: Optional[float] = None
    needs_rebuild: bool = False  # True if resources were deleted since last build


class GetOrBuildDTMRequest(BaseModel):
    """Request to get or build DTM for specific resources"""
    resource_ids: List[str]
    mode: str = "auto"  # auto, single, subset, full


class GetOrBuildDTMResponse(BaseModel):
    """Response from get_or_build_dtm"""
    status: str
    mode: str
    hash: Optional[str] = None
    was_cached: bool
    build_time_ms: int
    resource_ids: List[str]
    dtm: Optional[Dict[str, Any]] = None  # Full DTM object


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.post("/build", response_model=DTMBuildResponse)
async def build_dtm(
    payload: DTMBuildRequest,
    user: dict = Depends(get_current_user)
):
    """
    Build DTM for a taste (all resources or subset)
    """
    # Validate taste ownership
    taste = db.get_taste(payload.taste_id)
    if not taste:
        raise HTTPException(status_code=404, detail="Taste not found")
    
    if taste.get("owner_id") != user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get resources
    if payload.resource_ids:
        resource_ids = payload.resource_ids
    else:
        # Get all resources with DTRs
        resources = db.list_resources_for_taste(payload.taste_id)
        resource_ids = [
            r["resource_id"] 
            for r in resources 
            if r.get("metadata", {}).get("has_dtr")
        ]
    
    # Need at least 2 resources
    if len(resource_ids) < 2:
        raise HTTPException(
            status_code=400,
            detail=f"Need at least 2 resources with DTRs, found {len(resource_ids)}"
        )
    
    # Validate all DTRs exist
    for resource_id in resource_ids:
        dtr = dtr_storage.load_complete_dtr(resource_id)
        if not dtr:
            raise HTTPException(
                status_code=400,
                detail=f"No DTR found for resource {resource_id}"
            )
    
    # Synthesize DTM
    import time
    start_time = time.time()
    
    llm = LLMService()
    
    dtm = await synthesizer.synthesize_dtm(
        taste_id=payload.taste_id,
        resource_ids=resource_ids,
        llm=llm,
        priority_mode=payload.priority_mode,
        prioritized_resource_ids=payload.resource_ids if payload.priority_mode else None
    )
    
    duration = time.time() - start_time
    
    # Update database: Mark taste as having DTM (if this is full taste build)
    if not payload.resource_ids:  # Full taste build (all resources)
        try:
            metadata = taste.get("metadata", {})
            metadata["has_dtm"] = True
            metadata["dtm_resource_count"] = len(resource_ids)
            metadata["dtm_last_updated"] = dtm.created_at
            metadata["needs_dtm_rebuild"] = False  # Clear rebuild flag
            metadata.pop("last_deleted_at", None)  # Clear deletion timestamp
            db.update_taste(payload.taste_id, metadata=metadata)
        except Exception as e:
            print(f"Warning: Failed to update database: {e}")
    
    return DTMBuildResponse(
        status="success",
        dtm_id=dtm.taste_id,
        resource_count=len(resource_ids),
        confidence=dtm.generation_guidance.confidence_by_domain.get("overall", 0.75),
        duration_seconds=duration
    )


@router.post("/{taste_id}/rebuild", response_model=DTMBuildResponse)
async def rebuild_dtm(
    taste_id: str,
    user: dict = Depends(get_current_user)
):
    """
    Force rebuild DTM for entire taste (used after resource deletions)
    Clears needs_dtm_rebuild flag after successful rebuild
    """
    # Validate taste ownership
    taste = db.get_taste(taste_id)
    if not taste:
        raise HTTPException(status_code=404, detail="Taste not found")
    
    if taste.get("owner_id") != user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get all resources with DTRs
    resources = db.list_resources_for_taste(taste_id)
    resource_ids = [
        r["resource_id"] 
        for r in resources 
        if r.get("metadata", {}).get("has_dtr")
    ]
    
    # Need at least 2 resources
    if len(resource_ids) < 2:
        raise HTTPException(
            status_code=400,
            detail=f"Need at least 2 resources with DTRs, found {len(resource_ids)}"
        )
    
    # Validate all DTRs exist
    for resource_id in resource_ids:
        dtr = dtr_storage.load_complete_dtr(resource_id)
        if not dtr:
            raise HTTPException(
                status_code=400,
                detail=f"No DTR found for resource {resource_id}"
            )
    
    # Synthesize DTM
    import time
    start_time = time.time()
    
    llm = LLMService()
    
    dtm = await synthesizer.synthesize_dtm(
        taste_id=taste_id,
        resource_ids=resource_ids,
        llm=llm,
        priority_mode=False
    )
    
    duration = time.time() - start_time
    
    # Update database: Mark DTM as built and clear rebuild flag
    try:
        metadata = taste.get("metadata", {})
        metadata["has_dtm"] = True
        metadata["dtm_resource_count"] = len(resource_ids)
        metadata["dtm_last_updated"] = dtm.created_at
        metadata["needs_dtm_rebuild"] = False  # Clear the flag
        metadata.pop("last_deleted_at", None)  # Clear deletion timestamp
        db.update_taste(taste_id, metadata=metadata)
        print(f"✓ Cleared needs_dtm_rebuild flag for taste {taste_id}")
    except Exception as e:
        print(f"Warning: Failed to update database: {e}")
    
    return DTMBuildResponse(
        status="success",
        dtm_id=dtm.taste_id,
        resource_count=len(resource_ids),
        confidence=dtm.generation_guidance.confidence_by_domain.get("overall", 0.75),
        duration_seconds=duration
    )


@router.get("/{taste_id}/status", response_model=DTMStatusResponse)
async def get_dtm_status(
    taste_id: str,
    user: dict = Depends(get_current_user)
):
    """
    Get DTM status for a taste
    """
    # Validate ownership
    taste = db.get_taste(taste_id)
    if not taste:
        raise HTTPException(status_code=404, detail="Taste not found")
    
    if taste.get("owner_id") != user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Check database metadata first (faster)
    metadata = taste.get("metadata", {})
    has_dtm = metadata.get("has_dtm", False)
    needs_rebuild = metadata.get("needs_dtm_rebuild", False)
    
    print(f"📊 DTM Status Check for {taste_id}: has_dtm={has_dtm}, needs_rebuild={needs_rebuild}")
    
    if not has_dtm:
        return DTMStatusResponse(
            exists=False,
            resource_count=0,
            needs_rebuild=needs_rebuild
        )
    
    # Load DTM to get details
    dtm = dtm_storage.load_dtm(taste_id)
    
    if not dtm:
        # Database says yes but file doesn't exist - inconsistency
        # Update database to match reality
        metadata["has_dtm"] = False
        db.update_taste(taste_id, metadata=metadata)
        
        return DTMStatusResponse(
            exists=False,
            resource_count=0,
            needs_rebuild=needs_rebuild
        )
    
    return DTMStatusResponse(
        exists=True,
        resource_count=len(dtm.resource_ids),
        created_at=dtm.created_at,
        confidence=dtm.generation_guidance.confidence_by_domain.get("overall", 0.75),
        needs_rebuild=needs_rebuild
    )


@router.post("/{taste_id}/get-or-build", response_model=GetOrBuildDTMResponse)
async def get_or_build_dtm_endpoint(
    taste_id: str,
    payload: GetOrBuildDTMRequest,
    user: dict = Depends(get_current_user)
):
    """
    Get cached or build new DTM for specific resources.
    
    This is the smart DTM retrieval endpoint that:
    1. Determines mode (single/subset/full) based on resource count
    2. Checks cache for existing DTMs
    3. Builds new DTM if not cached
    4. Caches newly built DTMs
    
    Use cases:
    - UI generation with selected resources
    - Testing different resource combinations
    - Previewing taste before full build
    """
    # Validate taste ownership
    taste = db.get_taste(taste_id)
    if not taste:
        raise HTTPException(status_code=404, detail="Taste not found")
    
    if taste.get("owner_id") != user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Validate resource_ids are not empty
    if not payload.resource_ids:
        raise HTTPException(status_code=400, detail="resource_ids cannot be empty")
    
    # Validate all resources belong to this taste
    resources = db.list_resources_for_taste(taste_id)
    taste_resource_ids = {r["resource_id"] for r in resources}
    
    for resource_id in payload.resource_ids:
        if resource_id not in taste_resource_ids:
            raise HTTPException(
                status_code=400,
                detail=f"Resource {resource_id} does not belong to taste {taste_id}"
            )
    
    # Validate all resources have DTRs
    for resource_id in payload.resource_ids:
        resource = db.get_resource(resource_id)
        if not resource:
            raise HTTPException(status_code=404, detail=f"Resource {resource_id} not found")
        
        if not resource.get("metadata", {}).get("has_dtr"):
            raise HTTPException(
                status_code=400,
                detail=f"Resource {resource_id} does not have DTR yet"
            )
    
    # Call builder
    try:
        result = await builder.get_or_build_dtm(
            taste_id=taste_id,
            resource_ids=payload.resource_ids,
            mode=payload.mode
        )
        
        # Convert DTM to dict for response
        dtm_dict = result["dtm"].model_dump() if hasattr(result["dtm"], 'model_dump') else result["dtm"].dict()
        
        return GetOrBuildDTMResponse(
            status="success",
            mode=result["mode"],
            hash=result.get("hash"),
            was_cached=result["was_cached"],
            build_time_ms=result["build_time_ms"],
            resource_ids=result["resource_ids"],
            dtm=dtm_dict
        )
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"❌ Error in get_or_build_dtm: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to build DTM: {str(e)}")


@router.post("/{taste_id}/rebuild", response_model=DTMBuildResponse)
async def rebuild_dtm(
    taste_id: str,
    user: dict = Depends(get_current_user)
):
    """
    Force rebuild DTM for a taste
    
    Use cases:
    - After deleting resources (needs_dtm_rebuild flag set)
    - Manual rebuild to incorporate updated DTRs
    - Recovery from DTM corruption
    """
    import time
    from datetime import datetime
    
    # Validate ownership
    taste = db.get_taste(taste_id)
    if not taste:
        raise HTTPException(status_code=404, detail="Taste not found")
    
    if taste.get("owner_id") != user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    start_time = time.time()
    
    # Get all resources with DTRs
    resources = db.list_resources_for_taste(taste_id)
    resource_ids = [
        r["resource_id"] 
        for r in resources 
        if r.get("metadata", {}).get("has_dtr")
    ]
    
    if len(resource_ids) < 2:
        raise HTTPException(
            status_code=400, 
            detail=f"Need at least 2 resources with DTRs, found {len(resource_ids)}"
        )
    
    print(f"\n{'='*80}")
    print(f"🔄 MANUAL DTM REBUILD REQUESTED")
    print(f"Taste ID: {taste_id}")
    print(f"Resources: {len(resource_ids)}")
    print(f"{'='*80}\n")
    
    # Synthesize DTM
    llm = LLMService()
    dtm = await synthesizer.synthesize_dtm(
        taste_id=taste_id,
        resource_ids=resource_ids,
        llm=llm,
        priority_mode=False
    )
    
    # Save DTM
    dtm_storage.save_dtm(taste_id, dtm, resource_ids)
    
    # Update database metadata
    metadata = taste.get("metadata", {})
    metadata["has_dtm"] = True
    metadata["dtm_resource_count"] = len(resource_ids)
    metadata["dtm_last_updated"] = datetime.utcnow().isoformat()
    metadata["needs_dtm_rebuild"] = False  # Clear the flag
    db.update_taste(taste_id, metadata=metadata)
    
    duration = time.time() - start_time
    
    print(f"✅ Manual DTM rebuild complete")
    print(f"   Duration: {duration:.2f}s")
    print(f"   Confidence: {dtm.generation_guidance.confidence_by_domain.get('overall', 0.75)}\n")
    
    return DTMBuildResponse(
        status="success",
        dtm_id=taste_id,
        resource_count=len(resource_ids),
        confidence=dtm.generation_guidance.confidence_by_domain.get("overall", 0.75),
        duration_seconds=duration
    )


@router.delete("/{taste_id}")
async def delete_dtm(
    taste_id: str,
    user: dict = Depends(get_current_user)
):
    """
    Delete DTM for a taste
    """
    # Validate ownership
    taste = db.get_taste(taste_id)
    if not taste:
        raise HTTPException(status_code=404, detail="Taste not found")
    
    if taste.get("owner_id") != user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Delete DTM files
    dtm_storage.delete_dtm(taste_id)
    
    # Update database: Mark taste as NOT having DTM
    try:
        metadata = taste.get("metadata", {})
        metadata["has_dtm"] = False
        metadata.pop("dtm_resource_count", None)
        metadata.pop("dtm_last_updated", None)
        db.update_taste(taste_id, metadata=metadata)
    except Exception as e:
        print(f"Warning: Failed to update database: {e}")
    
    return {"message": "DTM deleted successfully"}