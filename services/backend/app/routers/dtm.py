"""
DTM API Routes
REST endpoints for Design Taste Model operations.

NOTE ON LLM ENDPOINTS
---------------------
The three synthesis endpoints that used to live here
  POST /api/dtm/build
  POST /api/dtm/{taste_id}/rebuild
  POST /api/dtm/{taste_id}/get-or-build

…have been moved to the WebSocket handler (app/websockets/handler.py) as
actions "get-or-build-dtm" and "rebuild-dtm".

Reason: all three endpoints call synthesizer.synthesize_dtm() which makes
multiple sequential LLM calls and routinely takes 30-120 seconds.  API
Gateway enforces a hard 29-second timeout on HTTP responses, so those
endpoints always returned 503 in production even when Lambda finished
successfully.

WebSocket connections through API Gateway WS have no such per-message
timeout (the connection can stay open up to 2 hours), so long-running LLM
synthesis works correctly there.
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from pydantic import BaseModel
from app.core.auth import get_current_user
from app.core import db
from app.dtm import storage as dtm_storage

router = APIRouter(prefix="/api/dtm", tags=["dtm"])


# ============================================================================
# RESPONSE MODELS (kept so any external tooling that imports them still works)
# ============================================================================

class DTMStatusResponse(BaseModel):
    """DTM status for a taste"""
    exists: bool
    resource_count: int = 0
    created_at: Optional[str] = None
    confidence: Optional[float] = None
    needs_rebuild: bool = False


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.get("/{taste_id}/status", response_model=DTMStatusResponse)
async def get_dtm_status(
    taste_id: str,
    user: dict = Depends(get_current_user)
):
    """
    Get DTM status for a taste.
    Fast — does not call any LLM; reads DB metadata and optionally S3.
    """
    taste = db.get_taste(taste_id)
    if not taste:
        raise HTTPException(status_code=404, detail="Taste not found")

    if taste.get("owner_id") != user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")

    metadata = taste.get("metadata", {})
    has_dtm = metadata.get("has_dtm", False)
    needs_rebuild = metadata.get("needs_dtm_rebuild", False)

    print(f"📊 DTM Status Check for {taste_id}: has_dtm={has_dtm}, needs_rebuild={needs_rebuild}")

    if not has_dtm:
        return DTMStatusResponse(exists=False, resource_count=0, needs_rebuild=needs_rebuild)

    dtm = dtm_storage.load_dtm(taste_id)

    if not dtm:
        # DB says yes but file is gone — fix the inconsistency
        metadata["has_dtm"] = False
        db.update_taste(taste_id, metadata=metadata)
        return DTMStatusResponse(exists=False, resource_count=0, needs_rebuild=needs_rebuild)

    return DTMStatusResponse(
        exists=True,
        resource_count=len(dtm.resource_ids),
        created_at=dtm.created_at,
        confidence=dtm.generation_guidance.confidence_by_domain.get("overall", 0.75),
        needs_rebuild=needs_rebuild,
    )


@router.delete("/{taste_id}")
async def delete_dtm(
    taste_id: str,
    user: dict = Depends(get_current_user)
):
    """
    Delete DTM for a taste.
    Fast — no LLM calls.
    """
    taste = db.get_taste(taste_id)
    if not taste:
        raise HTTPException(status_code=404, detail="Taste not found")

    if taste.get("owner_id") != user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")

    dtm_storage.delete_dtm(taste_id)

    try:
        metadata = taste.get("metadata", {})
        metadata["has_dtm"] = False
        metadata.pop("dtm_resource_count", None)
        metadata.pop("dtm_last_updated", None)
        db.update_taste(taste_id, metadata=metadata)
    except Exception as e:
        print(f"Warning: Failed to update database after DTM delete: {e}")

    return {"message": "DTM deleted successfully"}

@router.get("/{taste_id}/data")
async def get_dtm_data(
    taste_id: str,
    user: dict = Depends(get_current_user),
):
    """
    Get full DTM data for a taste.
    Used by Taste Studio to render the taste profile visualization.
    """
    taste = db.get_taste(taste_id)
    if not taste:
        raise HTTPException(status_code=404, detail="Taste not found")
    if taste.get("owner_id") != user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")

    dtm = dtm_storage.load_dtm(taste_id)
    if not dtm:
        raise HTTPException(status_code=404, detail="DTM not found. Build the taste model first.")

    return dtm.model_dump()