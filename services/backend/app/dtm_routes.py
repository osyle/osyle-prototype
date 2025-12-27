"""
DTM API endpoints - Designer Taste Model management
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from app.auth import get_current_user
from app import db, storage
from app.llm import get_llm_service, LLMService

# V2 imports - new three-tier architecture
from app.dtm_builder_v2 import DTMBuilderV2
from app.dtm_updater_v3 import DTMUpdaterV3
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
    Manually build DTM from all DTRs in a taste (force rebuild)
    
    Use this to rebuild DTM from scratch (e.g., after deleting and re-adding resources)
    """
    user_id = user["user_id"]
    
    # Check taste ownership
    taste = db.get_taste(request.taste_id)
    if not taste or taste.get("owner_id") != user_id:
        raise HTTPException(status_code=404, detail="Taste not found")
    
    # Get all resources with DTRs
    resources = db.list_resources_for_taste(request.taste_id)
    
    print(f"📊 Found {len(resources)} resources in taste")
    for i, resource in enumerate(resources):
        print(f"  [{i+1}] {resource['resource_id'][:8]}... - {resource.get('name', 'unnamed')}")
    
    if len(resources) < 1:
        raise HTTPException(
            status_code=400,
            detail="Need at least 1 resource with DTR to build DTM"
        )
    
    # Load DTRs from S3
    dtrs = []
    loaded_resource_ids = []
    for resource in resources:
        try:
            resource_id = resource["resource_id"]
            dtr = storage.get_resource_dtr(
                user_id,
                request.taste_id,
                resource_id
            )
            if dtr:
                dtrs.append(dtr)
                loaded_resource_ids.append(resource_id)
                print(f"  ✓ Loaded DTR for {resource_id[:8]}...")
        except Exception as e:
            print(f"  ✗ Could not load DTR for {resource['resource_id'][:8]}...: {e}")
    
    print(f"\n📊 Loaded {len(dtrs)} DTRs from {len(loaded_resource_ids)} unique resources")
    
    if not dtrs:
        raise HTTPException(
            status_code=400,
            detail="No DTRs found. Please build DTRs first for each resource."
        )
    
    print(f"Building DTM v2 from {len(dtrs)} DTRs...")
    
    # Build DTM v2
    builder = DTMBuilderV2(llm)
    dtm = await builder.build_dtm(
        dtrs=dtrs,
        taste_id=request.taste_id,
        owner_id=user_id
    )
    
    # Save DTM to S3
    storage.put_taste_dtm(user_id, request.taste_id, dtm)
    
    # Simple summary (v2 doesn't have get_dtm_summary method)
    summary = {
        "total_resources": dtm["meta"]["total_resources"],
        "confidence": dtm["meta"]["overall_confidence"],
        "signature_patterns": len(dtm.get("signature_patterns", [])),
        "visual_examples": len(dtm.get("visual_library", {}).get("all_resources", []))
    }
    
    return {
        "status": "built",
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
    Smart DTM update after DTR is built
    
    Automatically called by frontend after each DTR learning completes.
    
    Logic:
    - 0-1 resources: Returns { status: "skipped" } → FE doesn't show DTM modal
    - 2 resources: Builds initial DTM { status: "built" } → FE shows training modal
    - 3+ resources: Updates DTM incrementally { status: "updated" } → FE shows training modal
    """
    user_id = user["user_id"]
    
    # Check taste ownership
    taste = db.get_taste(request.taste_id)
    if not taste or taste.get("owner_id") != user_id:
        raise HTTPException(status_code=404, detail="Taste not found")
    
    # Count resources with DTRs
    resources = db.list_resources_for_taste(request.taste_id)
    resources_with_dtr = []
    
    for resource in resources:
        if storage.resource_dtr_exists(user_id, request.taste_id, resource["resource_id"]):
            resources_with_dtr.append(resource)
    
    total_dtrs = len(resources_with_dtr)
    
    print(f"DTM Update: {total_dtrs} DTRs in taste {request.taste_id}")
    
    # CASE 1: 0-1 resources → Skip (not enough to build DTM)
    if total_dtrs < 2:
        print("→ Only 1 DTR, skipping DTM (need 2+ for pattern detection)")
        return {
            "status": "skipped",
            "reason": "Need at least 2 resources to build DTM",
            "total_resources": total_dtrs,  # Consistent with built/updated
            "message": "DTM will be built when you add a second design resource"
        }
    
    # CASE 2: Check if DTM exists
    dtm_exists = storage.taste_dtm_exists(user_id, request.taste_id)
    
    # CASE 3: 2+ resources, no DTM → Build initial DTM
    if not dtm_exists:
        print(f"→ Building initial DTM with {total_dtrs} resources...")
        
        try:
            # Load all DTRs
            dtrs = []
            for resource in resources_with_dtr:
                dtr = storage.get_resource_dtr(
                    user_id,
                    request.taste_id,
                    resource["resource_id"]
                )
                if dtr:
                    dtrs.append(dtr)
            
            if not dtrs:
                raise HTTPException(
                    status_code=400,
                    detail="No DTRs could be loaded"
                )
            
            # Build DTM v2
            builder = DTMBuilderV2(llm)
            dtm = await builder.build_dtm(
                dtrs=dtrs,
                taste_id=request.taste_id,
                owner_id=user_id
            )
            
            # Save DTM
            storage.put_taste_dtm(user_id, request.taste_id, dtm)
            
            print(f"✓ Initial DTM built (confidence: {dtm['meta']['overall_confidence']:.2f})")
            
            return {
                "status": "built",
                "message": "DTM v2 built successfully",
                "taste_id": request.taste_id,
                "total_resources": total_dtrs,
                "confidence": dtm["meta"]["overall_confidence"],
                "signature_patterns": len(dtm.get("signature_patterns", []))
            }
        
        except Exception as e:
            print(f"✗ DTM build failed: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to build DTM: {str(e)}")
    
    # CASE 4: DTM exists → Incremental update
    else:
        print(f"→ Updating DTM incrementally with resource {request.resource_id}...")
        
        try:
            # Get existing DTM
            dtm = storage.get_taste_dtm(user_id, request.taste_id)
            
            # Get new DTR
            new_dtr = storage.get_resource_dtr(
                user_id,
                request.taste_id,
                request.resource_id
            )
            
            if not new_dtr:
                raise HTTPException(
                    status_code=400,
                    detail="DTR not found for this resource"
                )
            
            # Incremental update with v2
            updater = DTMUpdaterV3()
            updated_dtm = await updater.update_dtm(
                existing_dtm=dtm,
                new_dtr=new_dtr
            )
            
            # Save updated DTM
            storage.put_taste_dtm(user_id, request.taste_id, updated_dtm)
            
            print(f"✓ DTM updated (confidence: {updated_dtm['meta']['overall_confidence']:.2f})")
            
            return {
                "status": "updated",
                "message": "DTM v2 updated successfully",
                "taste_id": request.taste_id,
                "total_resources": updated_dtm["meta"]["total_resources"],
                "confidence": updated_dtm["meta"]["overall_confidence"],
                "signature_patterns": len(updated_dtm.get("signature_patterns", [])),
                "incremental": True
            }
        
        except HTTPException:
            raise
        except Exception as e:
            print(f"✗ DTM update failed: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to update DTM: {str(e)}")


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
            detail="DTM not found. Build DTM first by adding 2+ resources."
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
    
    # Generate summary for v2
    summary = {
        "version": dtm.get("version", "2.0"),
        "total_resources": dtm["meta"]["total_resources"],
        "confidence": dtm["meta"]["overall_confidence"],
        "signature_patterns": len(dtm.get("signature_patterns", [])),
        "visual_examples": len(dtm.get("visual_library", {}).get("all_resources", [])),
        "contexts": list(dtm.get("visual_library", {}).get("by_context", {}).keys())
    }
    
    return {
        "taste_id": taste_id,
        "summary": summary
    }