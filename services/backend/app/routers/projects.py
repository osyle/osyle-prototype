"""
Projects API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form
from typing import List, Optional
from app.auth import get_current_user
from app import db, storage
from app.models import (
    ProjectCreate,
    ProjectOut,
    ProjectUpdate,
    MessageResponse
)
import json
import uuid


router = APIRouter(prefix="/api/projects", tags=["projects"])


# ============================================================================
# PROJECT ENDPOINTS
# ============================================================================

@router.post("/", response_model=ProjectOut, status_code=201)
async def create_project(
    name: str = Form(...),
    task_description: Optional[str] = Form(""),
    selected_taste_id: Optional[str] = Form(None),
    selected_resource_ids: Optional[List[str]] = Form(None),
    inspiration_images: List[UploadFile] = File(default=[]),
    metadata: Optional[str] = Form(None),
    user: dict = Depends(get_current_user)
):
    """
    Create a new project
    
    - **name**: Name of the project
    - **task_description**: Optional description of the task
    - **selected_taste_id**: Optional ID of selected taste
    - **selected_resource_ids**: Optional list of resource IDs (must all belong to selected_taste)
    - **inspiration_images**: Optional list of image files for visual inspiration (max 5)
    - **metadata**: Optional JSON metadata
    """
    # Ensure user exists in database
    db.ensure_user(
        user_id=user["user_id"],
        email=user["email"],
        name=user.get("name"),
        picture=user.get("picture")
    )
    
    # Parse metadata if provided
    metadata_dict = json.loads(metadata) if metadata else {}
    
    # Parse selected_resource_ids if it's a string
    resource_ids = selected_resource_ids or []
    
    # Validate taste ownership if provided
    if selected_taste_id:
        taste = db.get_taste(selected_taste_id)
        if not taste:
            raise HTTPException(status_code=404, detail="Selected taste not found")
        if taste.get("owner_id") != user["user_id"]:
            raise HTTPException(status_code=403, detail="Selected taste does not belong to you")
    
    # Validate multiple resources
    if resource_ids:
        if not selected_taste_id:
            raise HTTPException(
                status_code=400,
                detail="Cannot select resources without selecting a taste"
            )
        
        # Validate each resource
        for resource_id in resource_ids:
            resource = db.get_resource(resource_id)
            if not resource:
                raise HTTPException(
                    status_code=404, 
                    detail=f"Resource {resource_id} not found"
                )
            if resource.get("owner_id") != user["user_id"]:
                raise HTTPException(
                    status_code=403, 
                    detail=f"Resource {resource_id} does not belong to you"
                )
            if resource.get("taste_id") != selected_taste_id:
                raise HTTPException(
                    status_code=400,
                    detail=f"Resource {resource_id} does not belong to the selected taste"
                )
    
    # Handle inspiration images
    project_id = str(uuid.uuid4())  # Generate ID upfront for S3 consistency
    inspiration_keys = []
    
    if inspiration_images:
        # Validate max 5 images
        if len(inspiration_images) > 5:
            raise HTTPException(
                status_code=400,
                detail="Maximum 5 inspiration images allowed"
            )
        
        for idx, image_file in enumerate(inspiration_images):
            # Validate it's an image
            if not image_file.content_type or not image_file.content_type.startswith('image/'):
                raise HTTPException(
                    status_code=400,
                    detail=f"File {image_file.filename} is not an image"
                )
            
            # Get file extension
            ext = image_file.filename.split('.')[-1] if '.' in image_file.filename else 'png'
            filename = f"img_{idx}.{ext}"
            
            # Generate S3 key
            s3_key = storage.get_inspiration_image_key(
                user["user_id"],
                project_id,
                filename
            )
            
            # Upload to S3
            try:
                content = await image_file.read()
                storage.s3_client.put_object(
                    Bucket=storage.S3_BUCKET,
                    Key=s3_key,
                    Body=content,
                    ContentType=image_file.content_type
                )
                inspiration_keys.append(s3_key)
            except Exception as e:
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to upload image {image_file.filename}: {str(e)}"
                )
    
    # Create project with explicit project_id
    project = db.create_project(
        owner_id=user["user_id"],
        name=name,
        task_description=task_description,
        selected_taste_id=selected_taste_id,
        selected_resource_ids=resource_ids,
        inspiration_image_keys=inspiration_keys,
        metadata=metadata_dict,
        project_id=project_id
    )
    
    return project


@router.get("/", response_model=List[ProjectOut])
async def list_projects(user: dict = Depends(get_current_user)):
    """
    List all projects for the authenticated user
    """
    projects = db.list_projects_for_owner(user["user_id"])
    return projects


@router.get("/{project_id}", response_model=ProjectOut)
async def get_project(
    project_id: str,
    user: dict = Depends(get_current_user)
):
    """
    Get a specific project by ID
    """
    project = db.get_project(project_id)
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if project.get("owner_id") != user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return project


@router.patch("/{project_id}", response_model=ProjectOut)
async def update_project(
    project_id: str,
    payload: ProjectUpdate,
    user: dict = Depends(get_current_user)
):
    """
    Update a project
    """
    # Check ownership
    project = db.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if project.get("owner_id") != user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Validate taste ownership if being updated
    if payload.selected_taste_id is not None:
        if payload.selected_taste_id:  # Not empty string
            taste = db.get_taste(payload.selected_taste_id)
            if not taste:
                raise HTTPException(status_code=404, detail="Selected taste not found")
            if taste.get("owner_id") != user["user_id"]:
                raise HTTPException(status_code=403, detail="Selected taste does not belong to you")
    
    # ✅ CHANGED: Validate multiple resources if being updated
    if payload.selected_resource_ids is not None:
        if payload.selected_resource_ids:  # Not empty list
            # Get the taste_id (either from payload or existing project)
            taste_id = payload.selected_taste_id if payload.selected_taste_id is not None else project.get("selected_taste_id")
            
            if not taste_id:
                raise HTTPException(
                    status_code=400,
                    detail="Cannot select resources without selecting a taste"
                )
            
            # Validate each resource
            for resource_id in payload.selected_resource_ids:
                resource = db.get_resource(resource_id)
                if not resource:
                    raise HTTPException(
                        status_code=404, 
                        detail=f"Resource {resource_id} not found"
                    )
                if resource.get("owner_id") != user["user_id"]:
                    raise HTTPException(
                        status_code=403, 
                        detail=f"Resource {resource_id} does not belong to you"
                    )
                if resource.get("taste_id") != taste_id:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Resource {resource_id} does not belong to the selected taste"
                    )
    
    # Update project
    updated = db.update_project(
        project_id=project_id,
        name=payload.name,
        task_description=payload.task_description,
        selected_taste_id=payload.selected_taste_id,
        selected_resource_ids=payload.selected_resource_ids,  # ✅ CHANGED
        metadata=payload.metadata
    )
    
    return updated


@router.delete("/{project_id}", response_model=MessageResponse)
async def delete_project(
    project_id: str,
    user: dict = Depends(get_current_user)
):
    """
    Delete a project and all its output files
    """
    # Check ownership
    project = db.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if project.get("owner_id") != user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Delete output files from S3
    if project.get("outputs"):
        storage.delete_project_outputs(
            owner_id=user["user_id"],
            project_id=project_id,
            output_keys=project["outputs"]
        )
    
    # Delete project from DB
    db.delete_project(project_id)
    
    return {"message": "Project deleted successfully"}


# ============================================================================
# PROJECT OUTPUT MANAGEMENT
# ============================================================================

@router.post("/{project_id}/outputs", response_model=dict)
async def add_project_output(
    project_id: str,
    filename: str,
    user: dict = Depends(get_current_user)
):
    """
    Generate a presigned PUT URL for uploading a project output file
    
    - **filename**: Name of the file to upload
    
    Returns a presigned PUT URL for direct upload to S3
    """
    # Check ownership
    project = db.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if project.get("owner_id") != user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Generate S3 key
    output_key = storage.get_project_output_key(
        owner_id=user["user_id"],
        project_id=project_id,
        filename=filename
    )
    
    # Generate presigned PUT URL (detect content type from extension)
    content_type = "application/octet-stream"
    if filename.endswith(".json"):
        content_type = "application/json"
    elif filename.endswith(".png"):
        content_type = "image/png"
    elif filename.endswith(".jpg") or filename.endswith(".jpeg"):
        content_type = "image/jpeg"
    elif filename.endswith(".pdf"):
        content_type = "application/pdf"
    
    put_url = storage.generate_presigned_put_url(output_key, content_type)
    
    if not put_url:
        raise HTTPException(status_code=500, detail="Failed to generate upload URL")
    
    return {
        "output_key": output_key,
        "upload_url": put_url,
        "filename": filename
    }


@router.post("/{project_id}/outputs/{filename}/confirm", response_model=ProjectOut)
async def confirm_output_upload(
    project_id: str,
    filename: str,
    user: dict = Depends(get_current_user)
):
    """
    Confirm that a file has been uploaded and add it to the project's outputs list
    
    Call this after successfully uploading a file using the presigned URL
    """
    # Check ownership
    project = db.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if project.get("owner_id") != user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Generate the full S3 key
    output_key = storage.get_project_output_key(
        owner_id=user["user_id"],
        project_id=project_id,
        filename=filename
    )
    
    # Verify the file exists in S3
    if not storage.check_object_exists(output_key):
        raise HTTPException(status_code=404, detail="File not found in S3. Upload may have failed.")
    
    # Add to project's outputs list
    updated = db.add_project_output(project_id, output_key)
    
    return updated


@router.get("/{project_id}/outputs/{filename}/download", response_model=dict)
async def get_output_download_url(
    project_id: str,
    filename: str,
    user: dict = Depends(get_current_user)
):
    """
    Get a presigned GET URL for downloading a project output file
    """
    # Check ownership
    project = db.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if project.get("owner_id") != user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Generate the full S3 key
    output_key = storage.get_project_output_key(
        owner_id=user["user_id"],
        project_id=project_id,
        filename=filename
    )
    
    # Verify the key is in the project's outputs
    if output_key not in project.get("outputs", []):
        raise HTTPException(status_code=404, detail="File not found in project outputs")
    
    # Generate presigned GET URL
    download_url = storage.generate_presigned_get_url(output_key)
    
    if not download_url:
        raise HTTPException(status_code=500, detail="Failed to generate download URL")
    
    return {
        "download_url": download_url,
        "filename": filename
    }