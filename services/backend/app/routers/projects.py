"""
Projects API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form, Request
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
    request: Request,
    user: dict = Depends(get_current_user),
):
    """
    Create a new project
    
    - **name**: Name of the project
    - **task_description**: Optional description of the task
    - **selected_taste_id**: Optional ID of selected taste
    - **selected_resource_ids**: Optional list of resource IDs (must all belong to selected_taste)
    - **inspiration_images**: Optional list of image files for visual inspiration (max 5)
    - **screen_definitions**: Optional JSON array of screen definitions
    - **device_info**: Optional JSON string of device settings (platform, screen dimensions)
    - **rendering_mode**: Optional rendering mode ('react' or 'parametric')
    - **metadata**: Optional JSON metadata
    - **screen_N_figma**: Optional figma.json file for screen N
    - **screen_N_image_M**: Optional image M for screen N
    """
    # Parse multipart form data
    form_data = await request.form()
    
    # Extract basic fields
    name = form_data.get('name')
    if not name:
        raise HTTPException(status_code=400, detail="Name is required")
    
    task_description = form_data.get('task_description', '')
    selected_taste_id = form_data.get('selected_taste_id')
    device_info_str = form_data.get('device_info')
    rendering_mode = form_data.get('rendering_mode')
    max_screens = int(form_data.get('max_screens', 5))
    metadata_str = form_data.get('metadata')
    screen_definitions_str = form_data.get('screen_definitions')
    
    # Parse selected_resource_ids
    selected_resource_ids_raw = form_data.getlist('selected_resource_ids')
    resource_ids = [id for id in selected_resource_ids_raw if id] if selected_resource_ids_raw else []
    
    # Parse metadata if provided
    metadata_dict = json.loads(metadata_str) if metadata_str else {}
    
    # Parse device_info if provided
    device_info_dict = json.loads(device_info_str) if device_info_str else None
    
    # Parse screen_definitions if provided
    screen_defs = json.loads(screen_definitions_str) if screen_definitions_str else []
    
    # Ensure user exists in database
    db.ensure_user(
        user_id=user["user_id"],
        email=user["email"],
        name=user.get("name"),
        picture=user.get("picture")
    )
    
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
    
    # Generate project ID upfront for S3 consistency
    project_id = str(uuid.uuid4())
    
    # Handle screen reference files if screen_definitions provided
    if screen_defs:
        for screen_idx, screen_def in enumerate(screen_defs):
            # Handle figma.json file for this screen
            if screen_def.get('has_figma', False):
                figma_field_name = f'screen_{screen_idx}_figma'
                figma_file = form_data.get(figma_field_name)
                
                if figma_file and hasattr(figma_file, 'read'):
                    # Upload to S3
                    s3_key = storage.get_screen_reference_figma_key(
                        user["user_id"],
                        project_id,
                        screen_idx
                    )
                    
                    try:
                        content = await figma_file.read()
                        storage.s3_client.put_object(
                            Bucket=storage.S3_BUCKET,
                            Key=s3_key,
                            Body=content,
                            ContentType='application/json'
                        )
                    except Exception as e:
                        raise HTTPException(
                            status_code=500,
                            detail=f"Failed to upload figma.json for screen {screen_idx}: {str(e)}"
                        )
            
            # Handle reference images for this screen
            image_count = screen_def.get('image_count', 0)
            for img_idx in range(image_count):
                image_field_name = f'screen_{screen_idx}_image_{img_idx}'
                image_file = form_data.get(image_field_name)
                
                if image_file and hasattr(image_file, 'read'):
                    # Validate it's an image
                    if not image_file.content_type or not image_file.content_type.startswith('image/'):
                        raise HTTPException(
                            status_code=400,
                            detail=f"File for screen {screen_idx} image {img_idx} is not an image"
                        )
                    
                    # Upload to S3
                    s3_key = storage.get_screen_reference_image_key(
                        user["user_id"],
                        project_id,
                        screen_idx,
                        img_idx
                    )
                    
                    try:
                        content = await image_file.read()
                        storage.s3_client.put_object(
                            Bucket=storage.S3_BUCKET,
                            Key=s3_key,
                            Body=content,
                            ContentType=image_file.content_type
                        )
                    except Exception as e:
                        raise HTTPException(
                            status_code=500,
                            detail=f"Failed to upload image {img_idx} for screen {screen_idx}: {str(e)}"
                        )
    
    # Handle inspiration images
    inspiration_keys = []
    inspiration_images = form_data.getlist('inspiration_images')
    
    if inspiration_images:
        # Filter out empty entries
        inspiration_images = [img for img in inspiration_images if img and hasattr(img, 'read')]
        
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
        device_info=device_info_dict,
        rendering_mode=rendering_mode,
        flow_mode=True,  # Always use flow mode
        max_screens=max_screens,
        screen_definitions=screen_defs,
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


@router.patch("/{project_id}/flow-graph")
async def update_project_flow_graph(
    project_id: str,
    flow_graph: dict,
    user: dict = Depends(get_current_user)
):
    """
    Update project's flow_graph (including display_title and display_description)
    """
    # Check ownership
    project = db.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if project.get("owner_id") != user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Update flow_graph in database
    updated = db.update_project_flow_graph(project_id, flow_graph)
    
    return {
        "status": "success",
        "message": "Flow graph updated successfully",
        "flow_graph": updated.get("flow_graph")
    }


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


# ============================================================================
# INSPIRATION IMAGES ENDPOINTS
# ============================================================================

@router.get("/{project_id}/inspiration-images", response_model=List[dict])
async def get_inspiration_images(
    project_id: str,
    user: dict = Depends(get_current_user)
):
    """
    Get all inspiration images for a project with presigned download URLs
    
    Returns list of objects with: { key, url, filename }
    """
    # Check ownership
    project = db.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if project.get("owner_id") != user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get inspiration image keys from project
    image_keys = project.get("inspiration_image_keys", [])
    
    # Generate presigned URLs for each image
    images = []
    for key in image_keys:
        url = storage.generate_presigned_get_url(key)
        if url:
            # Extract filename from key (projects/{user}/{project}/inspiration/{filename})
            filename = key.split('/')[-1]
            images.append({
                "key": key,
                "url": url,
                "filename": filename
            })
    
    return images


@router.post("/{project_id}/inspiration-images", response_model=ProjectOut)
async def add_inspiration_images(
    project_id: str,
    inspiration_images: List[UploadFile] = File(...),
    user: dict = Depends(get_current_user)
):
    """
    Add new inspiration images to an existing project
    
    - **inspiration_images**: List of image files to add (max 5 total per project)
    """
    # Check ownership
    project = db.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if project.get("owner_id") != user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get current inspiration image count
    current_images = project.get("inspiration_image_keys", [])
    current_count = len(current_images)
    
    # Validate max 5 images total
    if current_count + len(inspiration_images) > 5:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum 5 inspiration images allowed. Currently have {current_count}, trying to add {len(inspiration_images)}"
        )
    
    # Upload new images
    new_keys = []
    for idx, image_file in enumerate(inspiration_images):
        # Validate it's an image
        if not image_file.content_type or not image_file.content_type.startswith('image/'):
            raise HTTPException(
                status_code=400,
                detail=f"File {image_file.filename} is not an image"
            )
        
        # Get file extension
        ext = image_file.filename.split('.')[-1] if '.' in image_file.filename else 'png'
        filename = f"img_{current_count + idx}.{ext}"
        
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
            new_keys.append(s3_key)
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to upload image {image_file.filename}: {str(e)}"
            )
    
    # Update project with new image keys
    updated_keys = current_images + new_keys
    
    response = db.projects_table.update_item(
        Key={"project_id": project_id},
        UpdateExpression="SET inspiration_image_keys = :keys, updated_at = :updated",
        ExpressionAttributeValues={
            ":keys": updated_keys,
            ":updated": db.get_timestamp()
        },
        ReturnValues="ALL_NEW"
    )
    
    return response.get("Attributes", {})


# ============================================================================
# CONVERSATION ENDPOINTS
# ============================================================================

@router.get("/{project_id}/conversation")
async def get_conversation(
    project_id: str,
    version: Optional[int] = None,
    user: dict = Depends(get_current_user)
):
    """
    Get conversation history for a specific project version
    
    - **version**: Optional version number (defaults to current version)
    
    Returns:
        List of message objects: [{"id": str, "type": "user"|"ai", "content": str, "timestamp": str, "screen": str}, ...]
    """
    # Check ownership
    project = db.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if project.get("owner_id") != user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get version (default to current)
    if version is None:
        version = project.get("metadata", {}).get("flow_version", 1)
    
    # Load conversation from S3
    conversation = storage.get_project_conversation(
        user["user_id"],
        project_id,
        version
    )
    
    return {
        "conversation": conversation,
        "version": version
    }


@router.post("/{project_id}/conversation")
async def save_conversation(
    project_id: str,
    request: Request,
    user: dict = Depends(get_current_user)
):
    """
    Save conversation history for a specific project version
    
    Request body:
        {
            "conversation": [...],  # Array of message objects
            "version": 1  # Version number
        }
    """
    # Check ownership
    project = db.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if project.get("owner_id") != user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Parse request
    data = await request.json()
    conversation = data.get("conversation", [])
    version = data.get("version", 1)
    
    # Validate conversation format
    if not isinstance(conversation, list):
        raise HTTPException(status_code=400, detail="Conversation must be an array")
    
    # Save to S3
    try:
        storage.put_project_conversation(
            user["user_id"],
            project_id,
            conversation,
            version
        )
        
        return {
            "status": "success",
            "message": f"Saved conversation for version {version}",
            "message_count": len(conversation)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save conversation: {str(e)}")