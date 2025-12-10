"""
LLM Endpoints for DTR and UI generation
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
import base64

from app.auth import get_current_user
from app.llm import get_llm_service, LLMService
from app import db
from app import storage

router = APIRouter(prefix="/api/llm", tags=["llm"])


class BuildDTRRequest(BaseModel):
    """Request body for building DTR"""
    resource_id: str
    taste_id: str


class DeviceScreen(BaseModel):
    width: int
    height: int


class DeviceInfo(BaseModel):
    platform: str  # 'web' | 'phone'
    screen: DeviceScreen


class GenerateUIRequest(BaseModel):
    project_id: str
    task_description: str
    model: Optional[str] = "haiku"

    # NEW
    device_info: Optional[DeviceInfo] = None
    rendering_mode: Optional[str] = "design-ml"  # 'design-ml' | 'react'



@router.post("/build-dtr")
async def build_dtr(
    request: BuildDTRRequest,
    user: dict = Depends(get_current_user),
    llm: LLMService = Depends(get_llm_service),
):
    """
    Build Design Taste Representation (DTR) from resource files
    """
    user_id = user.get("user_id")
    
    try:
        # Get resource from database
        resource = db.get_resource(request.resource_id)
        
        if not resource:
            raise HTTPException(status_code=404, detail="Resource not found")

        if storage.resource_dtr_exists(user_id, request.taste_id, request.resource_id):
            return {
                "status": "skipped",
                "reason": "DTR already exists for this resource"
            }
        
        # DEBUG: Print resource details
        print(f"=== BUILD DTR DEBUG ===")
        print(f"User ID: {user_id}")
        print(f"Taste ID: {request.taste_id}")
        print(f"Resource ID: {request.resource_id}")
        print(f"Resource data: {resource}")
        print(f"has_figma: {resource.get('has_figma')}")
        print(f"has_image: {resource.get('has_image')}")
        
        # Build message content with figma JSON and/or image
        content = []
        
        # Add Figma JSON if available
        if resource.get("has_figma"):
            try:
                print(f"Attempting to load figma.json from S3...")
                figma_json = storage.get_resource_figma(
                    user_id, request.taste_id, request.resource_id
                )
                if figma_json:
                    print(f"✅ Loaded figma.json ({len(figma_json)} chars)")
                    content.append({
                        "type": "text",
                        "text": f"Figma Design JSON:\n{figma_json}"
                    })
                else:
                    print(f"⚠️ figma.json returned None")
            except Exception as e:
                print(f"❌ Could not load figma.json: {e}")
        else:
            print("ℹ️ Resource has_figma is False, skipping")
        
        # Add image if available
        if resource.get("has_image"):
            try:
                print(f"Attempting to load image.png from S3...")
                image_bytes = storage.get_resource_image(
                    user_id, request.taste_id, request.resource_id
                )
                if image_bytes:
                    print(f"✅ Loaded image.png ({len(image_bytes)} bytes)")
                    image_base64 = base64.b64encode(image_bytes).decode("utf-8")
                    content.append({
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": "image/png",
                            "data": image_base64
                        }
                    })
                else:
                    print(f"⚠️ image.png returned None")
            except Exception as e:
                print(f"❌ Could not load image: {e}")
        else:
            print("ℹ️ Resource has_image is False, skipping")
        
        print(f"Content blocks collected: {len(content)}")
        
        if not content:
            raise HTTPException(
                status_code=400,
                detail="Resource has no figma.json or image.png to build DTR from"
            )
        
        # Call Claude to build DTR
        response = await llm.call_claude(
            prompt_name="build_dtr_v2",
            user_message=content,
            model="haiku",
            parse_json=True,
        )
        
        dtr_json = response["json"]
        
        # Update resource metadata to mark has_dtr
        metadata = resource.get("metadata", {})
        metadata["has_dtr"] = True
        db.update_resource(
            request.resource_id,
            metadata=metadata
        )
        
        # Save DTR file to S3
        storage.put_resource_dtr(
            user_id,
            request.taste_id,
            request.resource_id,
            dtr_json
        )
        
        return {
            "status": "success",
            "dtr": dtr_json
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ BUILD DTR ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to build DTR: {str(e)}"
        )


@router.get("/resource/{resource_id}/dtr-exists")
async def check_dtr_exists(
    resource_id: str,
    taste_id: str,
    user: dict = Depends(get_current_user),
):
    """
    Check if DTR exists for a resource
    """
    user_id = user.get("user_id")

    exists = storage.resource_dtr_exists(
        user_id=user_id,
        taste_id=taste_id,
        resource_id=resource_id
    )

    return { 
        "resource_id": resource_id,
        "dtr_exists": exists
    }


@router.post("/generate-ui")
async def generate_ui(
    request: GenerateUIRequest,
    user: dict = Depends(get_current_user),
    llm: LLMService = Depends(get_llm_service),
):
    """
    Generate UI from task description and project context
    """
    user_id = user.get("user_id")
    
    try:
        project = db.get_project(request.project_id)
        
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        if project.get("owner_id") != user_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # Load DTR from resource if available
        dtr_json = None
        if project.get("selected_resource_id"):
            try:
                dtr_json = storage.get_resource_dtr(
                    user_id,
                    project["selected_taste_id"],
                    project["selected_resource_id"]
                )
            except Exception as e:
                print(f"Warning: Could not load DTR: {e}")
        
        device_block = ""

        if request.device_info:
            device_block = f"""
Device Context:
- Platform: {request.device_info.platform}
- Screen Width: {request.device_info.screen.width}px
- Screen Height: {request.device_info.screen.height}px

Hard Constraints:
- The root FRAME must be exactly {request.device_info.screen.width}px wide and {request.device_info.screen.height}px tall.
- All children must fit within this frame.
- Design must be appropriate for a {request.device_info.platform} device.
"""

        system_suffix = f"""
Task Description:
{request.task_description}

Rendering Mode:
{request.rendering_mode}

{device_block}

{f'DTR JSON: {dtr_json}' if dtr_json else 'No DTR available - generate from scratch.'}
"""

        prompt_name = "generate_ui_dml"  # default for DesignML

        if request.rendering_mode == "react":
            prompt_name = "generate_ui_react"

        parse_json_flag = request.rendering_mode == "design-ml"

        response = await llm.call_claude(
            prompt_name=prompt_name,
            user_message=request.task_description,
            model=request.model,
            system_suffix=system_suffix,
            parse_json=parse_json_flag,
        )
        
        if request.rendering_mode == "design-ml":
            ui_output = response["json"]
        else:  # react mode
            ui_output = response["text"]  # raw React code string

        current_version = project.get("metadata", {}).get("ui_version", 0)
        new_version = current_version + 1
        
        storage.put_project_ui(
            user_id,
            request.project_id,
            ui_output,
            version=new_version
        )
        
        metadata = project.get("metadata", {})
        metadata["ui_version"] = new_version
        metadata["has_ui"] = True
        
        db.update_project(
            request.project_id,
            metadata=metadata
        )
        
        return {
            "status": "success",
            "type": request.rendering_mode,
            "ui": ui_output,
            "version": new_version
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate UI: {str(e)}"
        )


@router.get("/ui/get")
async def get_ui(
    project_id: str,
    version: Optional[int] = None,
    user: dict = Depends(get_current_user),
):
    """Get UI JSON for a project"""
    user_id = user.get("user_id")
    
    try:
        project = db.get_project(project_id)
        
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        if project.get("owner_id") != user_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        if not project.get("metadata", {}).get("has_ui"):
            raise HTTPException(status_code=404, detail="Project has no UI generated yet")
        
        target_version = version or project.get("metadata", {}).get("ui_version", 1)
        
        ui_json = storage.get_project_ui(
            user_id,
            project_id,
            version=target_version
        )
        
        if not ui_json:
            raise HTTPException(status_code=404, detail="UI not found")
        
        ui_output = storage.get_project_ui(user_id, project_id, version=target_version)
        ui_type = "dml" if isinstance(ui_output, dict) else "react"

        return {
            "status": "success",
            "type": ui_type,
            "ui": ui_output,
            "version": target_version
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get UI: {str(e)}"
        )


@router.get("/ui/versions")
async def get_ui_versions(
    project_id: str,
    user: dict = Depends(get_current_user),
):
    """Get list of available UI versions for a project"""
    user_id = user.get("user_id")
    
    try:
        project = db.get_project(project_id)
        
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        if project.get("owner_id") != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        current_version = project.get("metadata", {}).get("ui_version", 0)
        
        return {
            "status": "success",
            "current_version": current_version,
            "versions": list(range(1, current_version + 1))
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get versions: {str(e)}"
        )


@router.get("/ui/get/test")
async def get_test_ui(
    user: dict = Depends(get_current_user),
):
    """Get a random UI from current user's projects (for testing)"""
    user_id = user.get("user_id")
    
    try:
        projects = db.list_projects_for_owner(user_id)
        projects_with_ui = [p for p in projects if p.get("metadata", {}).get("has_ui")]
        
        if not projects_with_ui:
            raise HTTPException(
                status_code=404,
                detail="No projects with generated UI found"
            )
        
        import random
        project = random.choice(projects_with_ui)
        
        ui_json = storage.get_project_ui(
            user_id,
            project["project_id"],
            version=project.get("metadata", {}).get("ui_version", 1)
        )
        
        return {
            "status": "success",
            "type": "dml",
            "ui": ui_json,
            "project_id": project["project_id"],
            "project_name": project["name"],
            "version": project.get("metadata", {}).get("ui_version", 1)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get test UI: {str(e)}"
        )
