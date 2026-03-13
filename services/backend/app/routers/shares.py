"""
Project Sharing API endpoints

Flow:
  POST /api/shares/               — send a share (deep-copies project to recipient)
  GET  /api/shares/inbox          — list shares received by the current user
  GET  /api/shares/sent           — list shares sent by the current user
  DELETE /api/shares/{share_id}   — delete a share record (sender or recipient)
  GET  /api/users/                — list all users for the share dropdown
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from typing import List
import uuid

from app.core.auth import get_current_user
from app.core import db, storage

router = APIRouter(tags=["shares"])


# ============================================================================
# USER LISTING  (needed for the share-to dropdown)
# ============================================================================

@router.get("/api/users/", response_model=List[dict])
async def list_users(user: dict = Depends(get_current_user)):
    """
    Return minimal user info for everyone in the system.
    Used to populate the recipient dropdown when sharing a project.
    """
    users = db.list_all_users()
    # Exclude the requesting user so you can't share with yourself
    return [
        {
            "user_id": u["user_id"],
            "email": u.get("email", ""),
            "name": u.get("name", ""),
            "picture": u.get("picture", ""),
        }
        for u in users
        if u["user_id"] != user["user_id"]
    ]


# ============================================================================
# SHARE ENDPOINTS
# ============================================================================

@router.post("/api/shares/", status_code=201)
async def create_share(
    request: Request,
    user: dict = Depends(get_current_user),
):
    """
    Share a project with another user.

    Multipart form fields:
      project_id      — UUID of the project to share
      recipient_id    — UUID of the recipient user
      description     — markdown description / bug report (optional)
      screenshots     — 0-5 image files (optional)

    The project is deep-copied into the recipient's account so it is
    fully independent from this point forward.
    """
    form = await request.form()

    project_id = form.get("project_id")
    recipient_id = form.get("recipient_id")
    description = form.get("description", "")

    if not project_id:
        raise HTTPException(status_code=400, detail="project_id is required")
    if not recipient_id:
        raise HTTPException(status_code=400, detail="recipient_id is required")
    if recipient_id == user["user_id"]:
        raise HTTPException(status_code=400, detail="Cannot share a project with yourself")

    # Verify project ownership
    project = db.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.get("owner_id") != user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")

    # Verify recipient exists
    recipient = db.get_user(recipient_id)
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient user not found")

    share_id = str(uuid.uuid4())
    new_project_id = str(uuid.uuid4())

    # ------------------------------------------------------------------
    # Upload screenshots (if any)
    # ------------------------------------------------------------------
    screenshot_keys: List[str] = []
    screenshots = form.getlist("screenshots")
    screenshots = [f for f in screenshots if f and hasattr(f, "read")]

    if len(screenshots) > 5:
        raise HTTPException(status_code=400, detail="Maximum 5 screenshots allowed")

    for idx, img in enumerate(screenshots):
        if not img.content_type or not img.content_type.startswith("image/"):
            raise HTTPException(
                status_code=400,
                detail=f"File {getattr(img, 'filename', idx)} is not an image",
            )
        ext = (getattr(img, "filename", "img") or "img").rsplit(".", 1)[-1]
        filename = f"screenshot_{idx}.{ext}"
        key = storage.get_share_screenshot_key(user["user_id"], share_id, filename)
        content = await img.read()
        storage.s3_client.put_object(
            Bucket=storage.S3_BUCKET,
            Key=key,
            Body=content,
            ContentType=img.content_type,
        )
        screenshot_keys.append(key)

    # ------------------------------------------------------------------
    # Deep-copy the project record into the recipient's account
    # ------------------------------------------------------------------
    new_project = db.create_project(
        owner_id=recipient_id,
        name=project.get("name", "Shared Project"),
        task_description=project.get("task_description", ""),
        selected_taste_id=None,          # Taste belongs to sender — not copied
        selected_resource_ids=[],
        inspiration_image_keys=[],       # Don't copy inspiration images
        device_info=project.get("device_info"),
        rendering_mode=project.get("rendering_mode", "react"),
        image_generation_mode=project.get("image_generation_mode", "image_url"),
        flow_mode=project.get("flow_mode", True),
        max_screens=project.get("max_screens", 5),
        screen_definitions=project.get("screen_definitions", []),
        metadata={
            **project.get("metadata", {}),
            "shared_from_project_id": project_id,
            "shared_from_user_id": user["user_id"],
            "share_id": share_id,
        },
        project_id=new_project_id,
    )

    # Copy the flow_graph reference into the new project row
    flow_graph = project.get("flow_graph")
    if flow_graph:
        db.update_project_flow_graph(new_project_id, flow_graph)

    # Deep-copy S3 files (flow_vN.json, conversation_vN.json, etc.)
    try:
        storage.copy_project_flow_for_recipient(
            sender_id=user["user_id"],
            recipient_id=recipient_id,
            original_project_id=project_id,
            new_project_id=new_project_id,
        )
    except Exception as e:
        # Don't fail the whole share if S3 copy fails — project record exists
        print(f"⚠️  S3 copy warning for share {share_id}: {e}")

    # ------------------------------------------------------------------
    # Persist share metadata
    # ------------------------------------------------------------------
    share = db.create_project_share(
        share_id=share_id,
        project_id=new_project_id,   # Points to the COPY in recipient's account
        sender_id=user["user_id"],
        recipient_id=recipient_id,
        description=description,
        screenshot_keys=screenshot_keys,
    )

    sender = db.get_user(user["user_id"]) or {}

    return {
        "share_id": share["share_id"],
        "new_project_id": new_project_id,
        "recipient_id": recipient_id,
        "sender_name": sender.get("name") or sender.get("email", "Someone"),
        "created_at": share["created_at"],
    }


@router.get("/api/shares/inbox")
async def list_inbox(user: dict = Depends(get_current_user)):
    """
    List all project shares sent TO the current user.
    Returns shares enriched with sender info and the copied project data.
    """
    shares = db.list_shares_for_recipient(user["user_id"])

    result = []
    for share in shares:
        # Enrich with sender info
        sender = db.get_user(share["sender_id"]) or {}

        # The copied project lives under original_project_id in the share record
        project_id = share.get("project_id") or share.get("original_project_id")

        # Enrich with project info (the copy in recipient's account)
        project = db.get_project(project_id) if project_id else None

        # Generate presigned URLs for screenshots
        screenshot_urls = []
        for key in share.get("screenshot_keys", []):
            url = storage.generate_presigned_get_url(key)
            if url:
                screenshot_urls.append(url)

        result.append({
            "share_id": share["share_id"],
            "project_id": project_id,
            "description": share.get("description", ""),
            "screenshot_urls": screenshot_urls,
            "created_at": share["created_at"],
            "sender": {
                "user_id": share["sender_id"],
                "name": sender.get("name", ""),
                "email": sender.get("email", ""),
                "picture": sender.get("picture", ""),
            },
            "project": {
                "name": project.get("name") if project else "Unknown project",
                "task_description": project.get("task_description") if project else "",
                "flow_graph": project.get("flow_graph") if project else None,
                "rendering_mode": project.get("rendering_mode") if project else "react",
                "created_at": project.get("created_at") if project else None,
            } if project else None,
        })

    # Newest first
    result.sort(key=lambda x: x["created_at"], reverse=True)
    return result


@router.get("/api/shares/sent")
async def list_sent(user: dict = Depends(get_current_user)):
    """List all shares sent BY the current user."""
    shares = db.list_shares_sent_by(user["user_id"])

    result = []
    for share in shares:
        recipient = db.get_user(share["recipient_id"]) or {}
        sent_project_id = share.get("project_id") or share.get("original_project_id")
        project = db.get_project(sent_project_id) if sent_project_id else None

        result.append({
            "share_id": share["share_id"],
            "project_id": sent_project_id,
            "description": share.get("description", ""),
            "created_at": share["created_at"],
            "recipient": {
                "user_id": share["recipient_id"],
                "name": recipient.get("name", ""),
                "email": recipient.get("email", ""),
                "picture": recipient.get("picture", ""),
            },
            "project": {
                "name": project.get("name") if project else "Unknown project",
                "task_description": project.get("task_description") if project else "",
            } if project else None,
        })

    result.sort(key=lambda x: x["created_at"], reverse=True)
    return result


@router.delete("/api/shares/{share_id}")
async def delete_share(share_id: str, user: dict = Depends(get_current_user)):
    """
    Delete a share record.  Only the sender or recipient may delete.
    Does NOT delete the copied project — that remains in the recipient's account.
    """
    share = db.get_share(share_id)
    if not share:
        raise HTTPException(status_code=404, detail="Share not found")

    if user["user_id"] not in (share["sender_id"], share["recipient_id"]):
        raise HTTPException(status_code=403, detail="Access denied")

    db.delete_share(share_id)
    return {"message": "Share deleted"}