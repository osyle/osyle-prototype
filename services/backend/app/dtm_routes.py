"""
DTM API endpoints - Designer Taste Model management
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from app.auth import get_current_user
from app import db, storage
from app.llm import get_llm_service, LLMService

from app.dtm_builder import DTMBuilder
from app.dtm_updater import DTMIncrementalUpdater
from app.dtm_context_filter import DTMContextFilter

router = APIRouter(prefix="/api/dtm", tags=["dtm"])


# ============================================================================
# REQUEST MODELS
# ============================================================================

class BuildDTMRequest(BaseModel):
    """Request to build DTM from taste"""
    taste_id: str


class UpdateDTMRequest(BaseModel):
    """Request to update DTM with new resource"""
    taste_id: str
    resource_id: str
    resynthesize: Optional[bool] = False  # Full LLM update vs fast


class FilterDTMRequest(BaseModel):
    """Request to get filtered DTM"""
    taste_id: str
    selected_resource_ids: Optional[List[str]] = None
    keywords: Optional[List[str]] = None


# ============================================================================
# DTM ENDPOINTS
# ============================================================================

@router.post("/build")
async def build_dtm(
    request: BuildDTMRequest,
    user: dict = Depends(get_current_user),
    llm: LLMService = Depends(get_llm_service)
):
    """
    Build DTM from all DTRs in a taste
    
    Triggered when: User adds 2nd+ resource to taste
    """
    user_id = user["user_id"]
    
    # Check taste ownership
    taste = db.get_taste(request.taste_id)
    if not taste or taste.get("owner_id") != user_id:
        raise HTTPException(status_code=404, detail="Taste not found")
    
    # Get all resources with DTRs
    resources = db.list_resources_for_taste(request.taste_id)
    
    if len(resources) < 1:
        raise HTTPException(
            status_code=400,
            detail="Need at least 1 resource with DTR to build DTM"
        )
    
    # Load DTRs from S3
    dtrs = []
    for resource in resources:
        try:
            dtr = storage.get_resource_dtr(
                user_id,
                request.taste_id,
                resource["resource_id"]
            )
            if dtr:
                dtrs.append(dtr)
        except Exception as e:
            print(f"Warning: Could not load DTR for {resource['resource_id']}: {e}")
    
    if not dtrs:
        raise HTTPException(
            status_code=400,
            detail="No DTRs found. Please build DTRs first for each resource."
        )
    
    print(f"Building DTM from {len(dtrs)} DTRs...")
    
    # Build DTM
    builder = DTMBuilder(llm)
    dtm = await builder.build_dtm(
        dtrs=dtrs,
        taste_id=request.taste_id,
        owner_id=user_id,
        use_llm=True
    )
    
    # Save DTM to S3
    storage.put_taste_dtm(user_id, request.taste_id, dtm)
    
    summary = builder.get_dtm_summary(dtm)
    
    return {
        "message": "DTM built successfully",
        "taste_id": request.taste_id,
        "total_resources": len(dtrs),
        "confidence": dtm["meta"]["overall_confidence"],
        "summary": summary
    }


@router.post("/update")
async def update_dtm(
    request: UpdateDTMRequest,
    user: dict = Depends(get_current_user),
    llm: LLMService = Depends(get_llm_service)
):
    """
    Incrementally update DTM with new DTR
    
    Triggered when: User adds 3rd+ resource to taste
    """
    user_id = user["user_id"]
    
    # Check taste ownership
    taste = db.get_taste(request.taste_id)
    if not taste or taste.get("owner_id") != user_id:
        raise HTTPException(status_code=404, detail="Taste not found")
    
    # Get existing DTM
    try:
        dtm = storage.get_taste_dtm(user_id, request.taste_id)
    except:
        # DTM doesn't exist yet - build from scratch
        return await build_dtm(
            BuildDTMRequest(taste_id=request.taste_id),
            user,
            llm
        )
    
    # Get new DTR
    try:
        new_dtr = storage.get_resource_dtr(
            user_id,
            request.taste_id,
            request.resource_id
        )
        if not new_dtr:
            raise HTTPException(
                status_code=400,
                detail="DTR not found for this resource. Build DTR first."
            )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to load DTR: {str(e)}")
    
    print(f"Updating DTM with new resource {request.resource_id}...")
    
    # Incremental update
    updater = DTMIncrementalUpdater(llm if request.resynthesize else None)
    updated_dtm = await updater.update_dtm(
        existing_dtm=dtm,
        new_dtr=new_dtr,
        resynthesize_semantic=request.resynthesize
    )
    
    # Save updated DTM
    storage.put_taste_dtm(user_id, request.taste_id, updated_dtm)
    
    return {
        "message": "DTM updated successfully",
        "taste_id": request.taste_id,
        "total_resources": updated_dtm["meta"]["total_resources"],
        "confidence": updated_dtm["meta"]["overall_confidence"],
        "incremental": not request.resynthesize
    }


@router.get("/{taste_id}")
async def get_dtm(
    taste_id: str,
    user: dict = Depends(get_current_user),
    selected_resource_ids: Optional[str] = None,  # Comma-separated
    keywords: Optional[str] = None  # Comma-separated
):
    """
    Get DTM, optionally filtered
    
    Query params:
    - selected_resource_ids: Comma-separated resource IDs to filter by
    - keywords: Comma-separated keywords to filter by
    """
    user_id = user["user_id"]
    
    # Check taste ownership
    taste = db.get_taste(taste_id)
    if not taste or taste.get("owner_id") != user_id:
        raise HTTPException(status_code=404, detail="Taste not found")
    
    # Get DTM
    try:
        dtm = storage.get_taste_dtm(user_id, taste_id)
    except Exception as e:
        raise HTTPException(
            status_code=404,
            detail="DTM not found. Build DTM first."
        )
    
    # Apply filters if requested
    if selected_resource_ids or keywords:
        filter = DTMContextFilter()
        
        if selected_resource_ids:
            resource_ids = [r.strip() for r in selected_resource_ids.split(",")]
            dtm = filter.filter_by_resources(
                dtm=dtm,
                selected_resource_ids=resource_ids,
                fallback_to_all=True
            )
        
        if keywords:
            kw_list = [k.strip() for k in keywords.split(",")]
            dtm = filter.filter_by_keywords(dtm=dtm, keywords=kw_list)
    
    return dtm


@router.delete("/{taste_id}")
async def delete_dtm(
    taste_id: str,
    user: dict = Depends(get_current_user)
):
    """Delete DTM for a taste"""
    user_id = user["user_id"]
    
    # Check taste ownership
    taste = db.get_taste(taste_id)
    if not taste or taste.get("owner_id") != user_id:
        raise HTTPException(status_code=404, detail="Taste not found")
    
    # Delete DTM from S3
    storage.delete_taste_dtm(user_id, taste_id)
    
    return {"message": "DTM deleted successfully"}


@router.get("/{taste_id}/summary")
async def get_dtm_summary(
    taste_id: str,
    user: dict = Depends(get_current_user)
):
    """Get human-readable DTM summary"""
    user_id = user["user_id"]
    
    # Check taste ownership
    taste = db.get_taste(taste_id)
    if not taste or taste.get("owner_id") != user_id:
        raise HTTPException(status_code=404, detail="Taste not found")
    
    # Get DTM
    try:
        dtm = storage.get_taste_dtm(user_id, taste_id)
    except:
        raise HTTPException(status_code=404, detail="DTM not found")
    
    # Generate summary
    builder = DTMBuilder()
    summary = builder.get_dtm_summary(dtm)
    
    return {
        "taste_id": taste_id,
        "summary": summary
    }