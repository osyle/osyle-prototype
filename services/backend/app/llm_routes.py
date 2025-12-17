"""
LLM Endpoints for DTR v3 and UI generation with Designer Intelligence
Complete file with corrected build_dtr endpoint for plugin v3 format
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
import base64
import json
import re

from app.auth import get_current_user
from app.llm import get_llm_service, LLMService
from app import db
from app import storage

# Import DTR v3 modules
from app.code_based_analyzer import analyze_figma_design
from app.unified_dtr_builder import (
    build_unified_dtr,
    extract_llm_context,
    format_llm_context_for_prompt,
    prepare_figma_for_llm
)
from app.dtr_utils import extract_generative_rules


router = APIRouter(prefix="/api/llm", tags=["llm"])


# ============================================================================
# CONSTANTS
# ============================================================================

# Maximum number of inspiration images to include in LLM generation call
# If project has more images, we take the last N (most recent)
MAX_INSPIRATION_IMAGES_FOR_LLM = 5


# ============================================================================
# REQUEST MODELS
# ============================================================================

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
    device_info: Optional[DeviceInfo] = None
    rendering_mode: Optional[str] = "design-ml"  # 'design-ml' | 'react'


# ============================================================================
# BUILD DTR v3 ENDPOINT (UPDATED FOR PLUGIN v3)
# ============================================================================

@router.post("/build-dtr")
async def build_dtr(
    request: BuildDTRRequest,
    user: dict = Depends(get_current_user),
    llm: LLMService = Depends(get_llm_service),
):
    """
    Build Design Taste Representation (DTR) v3 using hybrid code+LLM analysis
    
    Flow:
    1. Load Figma JSON from plugin v3 (already compressed & intelligent)
    2. Run code-based quantitative analysis
    3. Extract LLM context from code analysis
    4. Send to LLM: Figma JSON + Code context + Image
    5. Merge LLM semantic DTR with code validation
    6. Save unified DTR v3
    """
    user_id = user.get("user_id")
    
    try:
        # Get resource from database
        resource = db.get_resource(request.resource_id)
        
        if not resource:
            raise HTTPException(status_code=404, detail="Resource not found")

        # Check if DTR already exists
        if storage.resource_dtr_exists(user_id, request.taste_id, request.resource_id):
            return {
                "status": "skipped",
                "reason": "DTR already exists for this resource"
            }
        
        print(f"\n{'='*60}")
        print(f"BUILD DTR v3 (HYBRID CODE+LLM)")
        print(f"{'='*60}")
        print(f"User: {user_id}")
        print(f"Taste: {request.taste_id}")
        print(f"Resource: {request.resource_id}")
        
        # ====================================================================
        # STEP 1: Load Figma JSON from S3
        # ====================================================================
        print(f"\n[1/9] Loading figma.json from S3...")
        try:
            figma_json_str = storage.get_resource_figma(
                user_id, request.taste_id, request.resource_id
            )
            
            if not figma_json_str:
                raise HTTPException(
                    status_code=400,
                    detail="Figma JSON not found. Please upload figma.json from the Figma plugin."
                )
            
            print(f"✓ Loaded figma.json: {len(figma_json_str):,} chars")
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Failed to load Figma JSON: {str(e)}"
            )
        
        # ====================================================================
        # STEP 2: Parse JSON (handle encoding issues)
        # ====================================================================
        print(f"\n[2/9] Parsing JSON...")
        
        # Handle encoding
        if isinstance(figma_json_str, bytes):
            figma_json_str = figma_json_str.decode('utf-8', errors='replace')
        
        # Remove control characters
        figma_json_str = re.sub(r'[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]', '', figma_json_str)
        
        figma_json = json.loads(figma_json_str)
        print(f"✓ JSON parsed successfully")
        
        # Check version
        version = figma_json.get('version', 'unknown')
        print(f"  Plugin version: {version}")
        
        if version != '3.0':
            print(f"  ⚠️  Warning: Expected plugin version 3.0, got {version}")
        
        # ====================================================================
        # STEP 3: Run code-based quantitative analysis
        # ====================================================================
        print(f"\n[3/9] Running code-based analysis...")
        
        code_analysis = analyze_figma_design(figma_json)
        code_conf = code_analysis.get('overall_confidence', 0)
        
        print(f"✓ Code analysis complete")
        print(f"  Overall confidence: {code_conf:.2f}")
        print(f"  Colors found: {code_analysis.get('color_analysis', {}).get('total_colors', 0)}")
        print(f"  Spacing quantum: {code_analysis.get('spacing_analysis', {}).get('spacing_quantum', 'N/A')}")
        print(f"  Type scale ratio: {code_analysis.get('typography_analysis', {}).get('type_scale_ratio', 'N/A')}")
        
        # ====================================================================
        # STEP 4: Extract LLM context from code analysis
        # ====================================================================
        print(f"\n[4/9] Extracting LLM context from code analysis...")
        
        llm_context = extract_llm_context(code_analysis)
        llm_context_formatted = format_llm_context_for_prompt(llm_context)
        
        print(f"✓ LLM context extracted: {len(llm_context_formatted):,} chars")
        
        # ====================================================================
        # STEP 5: Prepare Figma JSON for LLM
        # ====================================================================
        print(f"\n[5/9] Preparing Figma JSON for LLM...")
        
        figma_for_llm = prepare_figma_for_llm(figma_json, max_depth=5)
        
        print(f"✓ Figma JSON prepared: {len(figma_for_llm):,} chars")
        print(f"  Token estimate: ~{len(figma_for_llm) // 4:,} tokens")
        
        # ====================================================================
        # STEP 6: Build message content for LLM
        # ====================================================================
        print(f"\n[6/9] Building message for LLM...")
        
        content = []
        
        # Add Figma design structure
        content.append({
            "type": "text",
            "text": f"FIGMA DESIGN STRUCTURE:\n\n{figma_for_llm}"
        })
        
        # Add quantitative analysis context
        content.append({
            "type": "text",
            "text": f"\n\n{llm_context_formatted}"
        })
        
        # Add image if available
        image_included = False
        if resource.get("has_image"):
            try:
                image_bytes = storage.get_resource_image(
                    user_id, request.taste_id, request.resource_id
                )
                if image_bytes:
                    print(f"  ✓ Adding image: {len(image_bytes):,} bytes")
                    image_base64 = base64.b64encode(image_bytes).decode("utf-8")
                    content.append({
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": "image/png",
                            "data": image_base64
                        }
                    })
                    image_included = True
            except Exception as e:
                print(f"  ⚠ Could not load image (non-critical): {e}")
        
        print(f"✓ Message built: {len(content)} parts (image: {image_included})")
        
        # ====================================================================
        # STEP 7: Call LLM with DTR v3 prompt
        # ====================================================================
        print(f"\n[7/9] Calling LLM (DTR v3 prompt)...")
        
        response = await llm.call_claude(
            prompt_name="build_dtr_v4",
            user_message=content,
            parse_json=True,
        )
        
        llm_dtr = response["json"]
        print(f"✓ LLM analysis complete")
        
        # ====================================================================
        # STEP 8: Merge LLM + code analyses into unified DTR v3
        # ====================================================================
        print(f"\n[8/9] Merging LLM and code analyses...")
        
        unified_dtr = build_unified_dtr(llm_dtr, code_analysis)
        
        confidence_scores = unified_dtr.get('meta', {}).get('confidence_scores', {})
        overall_conf = confidence_scores.get('overall', 0)
        
        print(f"✓ Unified DTR v3 built")
        print(f"  Overall confidence: {overall_conf:.2f}")
        print(f"  Spatial: {confidence_scores.get('spatial', 0):.2f}")
        print(f"  Color: {confidence_scores.get('color', 0):.2f}")
        print(f"  Typography: {confidence_scores.get('typography', 0):.2f}")
        print(f"  Forms: {confidence_scores.get('forms', 0):.2f}")
        
        # ====================================================================
        # STEP 9: Save to S3 and update database
        # ====================================================================
        print(f"\n[9/9] Saving DTR v3...")
        
        storage.put_resource_dtr(
            user_id,
            request.taste_id,
            request.resource_id,
            unified_dtr
        )

        # Update resource metadata
        metadata = resource.get("metadata", {})
        metadata["has_dtr"] = True
        metadata["dtr_version"] = "3.0"
        db.update_resource(
            request.resource_id,
            metadata=metadata
        )
        
        print(f"✓ DTR v4 saved successfully")
        print(f"{'='*60}\n")
       
        return {
            "status": "success",
            "resource_id": request.resource_id,
            "dtr_version": "4.0",
            "confidence": overall_conf
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to build DTR v3: {str(e)}"
        )


# ============================================================================
# CHECK DTR EXISTS ENDPOINT
# ============================================================================

@router.get("/resource/{resource_id}/dtr-exists")
async def check_dtr_exists(
    resource_id: str,
    taste_id: str,
    user: dict = Depends(get_current_user),
):
    """Check if DTR exists for a resource"""
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


# ============================================================================
# GENERATE UI ENDPOINT (USES DTR v3)
# ============================================================================

@router.post("/generate-ui")
async def generate_ui(
    request: GenerateUIRequest,
    user: dict = Depends(get_current_user),
    llm: LLMService = Depends(get_llm_service),
):
    """
    Generate UI from task description using DTM (Designer Taste Model)
    
    Flow:
    1. Check if DTM exists for selected taste
    2. If yes: Use filtered DTM (prioritizing selected resources)
    3. If no: Fall back to individual DTRs (legacy behavior)
    4. Extract task-relevant rules from DTM
    5. Generate UI with DTM guidance
    
    Supports both React and Design ML v2 rendering modes
    """
    user_id = user.get("user_id")
    
    try:
        project = db.get_project(request.project_id)
        
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        if project.get("owner_id") != user_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        print(f"\n{'='*60}")
        print(f"GENERATE UI with DTM")
        print(f"{'='*60}")
        print(f"Project: {request.project_id}")
        print(f"Task: {request.task_description[:80]}...")
        print(f"Rendering mode: {request.rendering_mode}")
        
        # Import DTM modules
        from app.dtm_context_filter import DTMContextFilter
        from app.dtm_for_generation import DTMForGeneration
        
        # Get selected resources and taste
        selected_resource_ids = project.get("selected_resource_ids", [])
        selected_taste_id = project.get("selected_taste_id")
        
        dtm_guidance = None
        
        # STRATEGY 1: Try to use DTM (preferred)
        if selected_taste_id:
            try:
                print(f"Checking for DTM in taste {selected_taste_id}...")
                
                # Get DTM from storage
                dtm = storage.get_taste_dtm(user_id, selected_taste_id)
                
                if dtm:
                    print(f"✓ DTM found (version {dtm.get('version', '1.0')})")
                    print(f"  Total resources: {dtm.get('meta', {}).get('total_resources', 0)}")
                    
                    # Filter DTM by selected resources if specified
                    if selected_resource_ids:
                        print(f"  Filtering DTM by {len(selected_resource_ids)} selected resource(s)")
                        filter = DTMContextFilter()
                        dtm = filter.filter_by_resources(
                            dtm=dtm,
                            selected_resource_ids=selected_resource_ids,
                            fallback_to_all=True
                        )
                        print(f"  ✓ DTM filtered")
                    
                    # Build device context for task inference
                    platform = "web"
                    if request.device_info:
                        platform = request.device_info.platform
                    
                    # Extract relevant rules for this task
                    print(f"  Extracting task-relevant rules...")
                    extractor = DTMForGeneration()
                    relevant_rules = extractor.extract_for_task(
                        dtm=dtm,
                        task_description=request.task_description,
                        platform=platform
                    )
                    
                    # Format for prompt
                    dtm_guidance = extractor.format_for_prompt(relevant_rules)
                    
                    print(f"✓ DTM guidance prepared ({len(dtm_guidance):,} chars)")
                    print(f"  Invariants: {len(relevant_rules.get('invariants', []))}")
                    print(f"  Contextual rules: {len(relevant_rules.get('contextual_rules', []))}")
                    print(f"  Meta-rules: {len(relevant_rules.get('meta_rules', []))}")
                
                else:
                    print(f"⚠️  No DTM found for taste {selected_taste_id}")
            
            except Exception as e:
                print(f"⚠️  Could not load DTM: {e}")
        
        # STRATEGY 2: Fall back to individual DTRs (legacy)
        if not dtm_guidance and selected_resource_ids and selected_taste_id:
            print(f"Falling back to individual DTRs...")
            print(f"Loading DTRs for {len(selected_resource_ids)} resource(s)")
            
            dtr_sections = []
            
            for idx, resource_id in enumerate(selected_resource_ids):
                try:
                    dtr_json = storage.get_resource_dtr(
                        user_id,
                        selected_taste_id,
                        resource_id
                    )
                    
                    if dtr_json:
                        dtr_version = dtr_json.get('version', 'unknown')
                        print(f"✓ Loaded DTR {idx+1}/{len(selected_resource_ids)} (version: {dtr_version})")
                        
                        # Extract rules for this resource
                        rules = extract_generative_rules(dtr_json)
                        
                        # Add header for multi-resource case
                        if len(selected_resource_ids) > 1:
                            resource = db.get_resource(resource_id)
                            resource_name = resource.get("name", f"Resource {idx+1}") if resource else f"Resource {idx+1}"
                            dtr_sections.append(f"\n=== DTR from: {resource_name} ===\n{rules}")
                        else:
                            dtr_sections.append(rules)
                    else:
                        print(f"⚠️  No DTR found for resource {resource_id}")
                        
                except Exception as e:
                    print(f"⚠️  Could not load DTR for resource {resource_id}: {e}")
            
            # Combine all DTR sections
            if dtr_sections:
                if len(dtr_sections) > 1:
                    dtm_guidance = "\n\n".join(dtr_sections)
                    dtm_guidance = f"MULTIPLE DESIGN REFERENCES:\nYou have been provided with {len(dtr_sections)} different design styles. Synthesize the best elements from each to create a cohesive design.\n\n{dtm_guidance}"
                else:
                    dtm_guidance = dtr_sections[0]
                
                print(f"✓ Combined DTR rules ({len(dtm_guidance):,} chars)")
        
        # Build device context
        device_dict = None
        if request.device_info:
            device_dict = {
                "platform": request.device_info.platform,
                "width": request.device_info.screen.width,
                "height": request.device_info.screen.height
            }
            print(f"Device: {device_dict['platform']} {device_dict['width']}x{device_dict['height']}")
        
        # Determine prompt name based on rendering mode
        # Use v3 prompts (DTM-aware)
        if request.rendering_mode == "react":
            prompt_name = "generate_ui_react_v3_dtm"
            parse_json = False
        else:  # design-ml
            prompt_name = "generate_ui_dml_v3_dtm"
            parse_json = True
        
        # Build user message with structured data
        user_message_parts = [
            f"Task: {request.task_description}"
        ]
        
        if dtm_guidance:
            user_message_parts.append(f"\n\n{dtm_guidance}")
        else:
            user_message_parts.append("\n\n(No DTM/DTR available - generate from scratch with best practices)")
        
        if device_dict:
            user_message_parts.append(f"\n\nDevice Context:\n{json.dumps(device_dict, indent=2)}")
        
        user_message = "\n".join(user_message_parts)
        
        # Load inspiration images if they exist
        inspiration_images = []
        inspiration_keys = project.get("inspiration_image_keys", [])
        if inspiration_keys:
            # Limit to last N images (most recent)
            limited_keys = inspiration_keys[-MAX_INSPIRATION_IMAGES_FOR_LLM:]
            
            if len(inspiration_keys) > MAX_INSPIRATION_IMAGES_FOR_LLM:
                print(f"Project has {len(inspiration_keys)} images, using last {MAX_INSPIRATION_IMAGES_FOR_LLM}")
            else:
                print(f"Loading {len(limited_keys)} inspiration image(s)...")
            
            inspiration_images = storage.get_inspiration_images(
                user_id,
                request.project_id,
                limited_keys
            )
            print(f"✓ Loaded {len(inspiration_images)} inspiration image(s)")

        
        # Build message content with images if present
        if inspiration_images:
            # If images exist, use content array format
            message_content = [{"type": "text", "text": user_message}]
            
            # Add separator text with clear instructions
            message_content.append({
                "type": "text",
                "text": "\n\n=== INSPIRATION IMAGES (CONTENT REFERENCE ONLY) ===\n\nThe following images are provided by the user to help you understand what UI components, layout, and content structure they want. Use these images ONLY for:\n- Understanding what components to include (buttons, cards, charts, forms, etc.)\n- Layout structure and information hierarchy\n- Content organization and placement\n\nIMPORTANT: Do NOT copy visual style, colors, typography, spacing, or design aesthetic from these images. ALL design decisions must come from the DTM/DTR provided above.\n\nInspiration images:"
            })
            
            # Add each inspiration image
            for img in inspiration_images:
                message_content.append({
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": img['media_type'],
                        "data": img['data']
                    }
                })
        else:
            # No images, use simple text message
            message_content = user_message
        
        # Call LLM with appropriate prompt
        print(f"Calling LLM with {prompt_name}...")
        response = await llm.call_claude(
            prompt_name=prompt_name,
            user_message=message_content,
            parse_json=parse_json,
        )
        
        # Extract output based on mode
        if request.rendering_mode == "design-ml":
            ui_output = response["json"]
            ui_confidence = ui_output.get('meta', {}).get('generation_confidence', 0)
            print(f"✓ Generated Design ML v2 (confidence: {ui_confidence:.2f})")
        else:  # react mode
            ui_output = response["text"]
            print(f"✓ Generated React component ({len(ui_output):,} chars)")
        
        # Save UI to storage
        current_version = project.get("metadata", {}).get("ui_version", 0)
        new_version = current_version + 1
        
        storage.put_project_ui(
            user_id,
            request.project_id,
            ui_output,
            version=new_version
        )
        
        # Update project metadata
        updated_metadata = project.get("metadata", {})
        updated_metadata["ui_version"] = new_version
        db.update_project(
            project_id=request.project_id,
            metadata=updated_metadata
        )
        
        print(f"✓ UI saved (version {new_version})")
        
        return {
            "status": "success",
            "project_id": request.project_id,
            "rendering_mode": request.rendering_mode,
            "ui_output": ui_output,
            "version": new_version,
            "used_dtm": bool(dtm_guidance and 'DTM' in dtm_guidance)  # Indicate if DTM was used
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error generating UI: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to generate UI: {str(e)}")


# ============================================================================
# GET UI ENDPOINT
# ============================================================================

@router.get("/ui/get")
async def get_ui(
    project_id: str,
    version: Optional[int] = None,
    user: dict = Depends(get_current_user),
):
    """Get UI JSON/code for a project"""
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
        
        ui_output = storage.get_project_ui(
            user_id,
            project_id,
            version=target_version
        )
        
        if not ui_output:
            raise HTTPException(status_code=404, detail="UI not found")
        
        # Determine type
        ui_type = "design-ml" if isinstance(ui_output, dict) else "react"
        
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


# ============================================================================
# GET UI VERSIONS ENDPOINT
# ============================================================================

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


# ============================================================================
# REVERT TO UI VERSION ENDPOINT
# ============================================================================

@router.post("/ui/revert")
async def revert_to_version(
    project_id: str,
    version: int,
    user: dict = Depends(get_current_user),
):
    """
    Revert to a previous UI version by making it the new current version
    Creates a new version that is a copy of the specified old version
    """
    user_id = user.get("user_id")
    
    try:
        project = db.get_project(project_id)
        
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        if project.get("owner_id") != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        current_version = project.get("metadata", {}).get("ui_version", 0)
        
        # Validate version exists
        if version < 1 or version > current_version:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid version {version}. Valid range: 1-{current_version}"
            )
        
        # Get the old version UI
        old_ui = storage.get_project_ui(user_id, project_id, version=version)
        
        if not old_ui:
            raise HTTPException(
                status_code=404,
                detail=f"Version {version} not found"
            )
        
        # Create new version as copy of old version
        new_version = current_version + 1
        storage.put_project_ui(user_id, project_id, old_ui, version=new_version)
        
        # Update project metadata
        updated_metadata = project.get("metadata", {})
        updated_metadata["ui_version"] = new_version
        db.update_project(
            project_id=project_id,
            metadata=updated_metadata
        )
        
        return {
            "status": "success",
            "message": f"Reverted to version {version}",
            "old_version": version,
            "new_version": new_version,
            "ui": old_ui
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to revert version: {str(e)}"
        )


# ============================================================================
# GET RANDOM UI ENDPOINT
# ============================================================================

@router.get("/ui/random")
async def get_random_ui(
    rendering_mode: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    """
    Get a random UI from current user's projects
    Optional: filter by rendering_mode ('react' or 'design-ml')
    """
    user_id = user.get("user_id")
    
    try:
        projects = db.list_projects_for_owner(user_id)
        projects_with_ui = [p for p in projects if p.get("metadata", {}).get("has_ui")]
        
        # Filter by rendering mode if specified
        if rendering_mode:
            projects_with_ui = [
                p for p in projects_with_ui 
                if p.get("metadata", {}).get("rendering_mode") == rendering_mode
            ]
        
        if not projects_with_ui:
            detail = "No projects with generated UI found"
            if rendering_mode:
                detail = f"No projects with {rendering_mode} UI found"
            raise HTTPException(status_code=404, detail=detail)
        
        import random
        project = random.choice(projects_with_ui)
        
        ui_output = storage.get_project_ui(
            user_id,
            project["project_id"],
            version=project.get("metadata", {}).get("ui_version", 1)
        )
        
        ui_type = "design-ml" if isinstance(ui_output, dict) else "react"
        
        return {
            "status": "success",
            "type": ui_type,
            "ui": ui_output,
            "project_id": project["project_id"],
            "project_name": project["name"],
            "version": project.get("metadata", {}).get("ui_version", 1)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get random UI: {str(e)}"
        )