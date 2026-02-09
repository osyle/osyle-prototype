"""
DTM API Routes
REST endpoints for Design Taste Model operations
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from app.auth import get_current_user
from app import db
from app.dtm import synthesizer, storage as dtm_storage
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
            db.update_taste(payload.taste_id, {"metadata": metadata})
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
    
    if not has_dtm:
        return DTMStatusResponse(
            exists=False,
            resource_count=0
        )
    
    # Load DTM to get details
    dtm = dtm_storage.load_dtm(taste_id)
    
    if not dtm:
        # Database says yes but file doesn't exist - inconsistency
        # Update database to match reality
        metadata["has_dtm"] = False
        db.update_taste(taste_id, {"metadata": metadata})
        
        return DTMStatusResponse(
            exists=False,
            resource_count=0
        )
    
    return DTMStatusResponse(
        exists=True,
        resource_count=len(dtm.resource_ids),
        created_at=dtm.created_at,
        confidence=dtm.generation_guidance.confidence_by_domain.get("overall", 0.75)
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
        db.update_taste(taste_id, {"metadata": metadata})
    except Exception as e:
        print(f"Warning: Failed to update database: {e}")
    
    return {"message": "DTM deleted successfully"}