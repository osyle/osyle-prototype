"""
LLM Routes v2 - Using DTR v5 and DTM v2 Architecture
Redesigned for visual-first taste learning
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
import base64
import json
import re

from app.auth import get_current_user
from app.llm import get_llm_service, LLMService
from app import db, storage

# Import code analyzer (keep from v1)
from app.code_based_analyzer import analyze_figma_design

# Import NEW v5/v2 modules
from app.dtr_builder_v5 import DTRBuilderV5
from app.dtr_builder_v6 import DTRBuilderV6
from app.dtm_builder_v2 import DTMBuilderV2
from app.dtm_updater_v3 import DTMUpdaterV3
from app.dtm_context_filter_v2 import DTMContextFilterV2
from app.generation_orchestrator import GenerationOrchestrator

# Import helper for Figma compression
from app.unified_dtr_builder import prepare_figma_for_llm


router = APIRouter(prefix="/api/llm", tags=["llm"])


# ============================================================================
# CONSTANTS
# ============================================================================

# Maximum number of inspiration images to include in LLM generation call
# If project has more images, we take the last N (most recent)
MAX_INSPIRATION_IMAGES_FOR_LLM = 5


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def _convert_dtr_to_dtm(dtr: Dict[str, Any], taste_id: str, owner_id: str) -> Dict[str, Any]:
    """
    Convert single DTR to minimal DTM structure for generation
    
    This allows generation to work with 1 resource by creating a DTM-like
    structure from the DTR data
    """
    from datetime import datetime
    
    # Extract from DTR
    resource_id = dtr["meta"]["resource_id"]
    quantitative = dtr.get("quantitative", {})
    visual_patterns = dtr.get("visual_patterns", [])
    signature_patterns = dtr.get("signature_patterns", [])
    semantic = dtr.get("semantic", {})
    context = dtr["meta"].get("context", {})
    
    # Build minimal DTM structure
    minimal_dtm = {
        "version": "2.0",
        "taste_id": taste_id,
        "owner_id": owner_id,
        "meta": {
            "created_at": datetime.utcnow().isoformat() + "Z",
            "updated_at": datetime.utcnow().isoformat() + "Z",
            "total_resources": 1,
            "total_dtrs_analyzed": 1,
            "overall_confidence": dtr["meta"]["confidence_scores"]["overall"],
            "analysis_method": "single_dtr_conversion",
            "note": "Minimal DTM from single resource - add more resources for better patterns"
        },
        
        # Tier 1: Universal principles (standard)
        "universal_principles": {
            "accessibility": {
                "min_contrast_ratio": 4.5,
                "min_touch_target": 44,
                "note": "Based on WCAG 2.1 AA standards"
            },
            "usability": {
                "clear_hierarchy": "MUST",
                "consistent_spacing": "SHOULD",
                "predictable_interactions": "MUST"
            }
        },
        
        # Tier 2: Designer systems from quantitative data
        "designer_systems": {
            "spacing": {
                "by_context": {
                    context.get("primary_use_case", "general"): {
                        "quantum": quantitative.get("spacing", {}).get("quantum", 8),
                        "confidence": 1.0,
                        "evidence_count": 1
                    }
                },
                "default": quantitative.get("spacing", {}).get("quantum", 8)
            },
            "typography": {
                "scale_ratio": {
                    "mean": quantitative.get("typography", {}).get("scale_ratio", 1.5),
                    "range": [quantitative.get("typography", {}).get("scale_ratio", 1.5)],
                    "consistency": 1.0
                },
                "common_sizes": quantitative.get("typography", {}).get("common_sizes", [16]),
                "weights": quantitative.get("typography", {}).get("weights", ["Regular"])
            },
            "color_system": {
                "common_palette": quantitative.get("colors", {}).get("primary_palette", [])[:15],
                "temperature_preference": quantitative.get("colors", {}).get("temperature", {}),
                "saturation_preference": quantitative.get("colors", {}).get("saturation", {})
            },
            "form_language": {
                "common_radii": quantitative.get("forms", {}).get("common_radii", [8])
            }
        },
        
        # Tier 3: Signature patterns from DTR
        "signature_patterns": signature_patterns,
        
        # Visual library
        "visual_library": {
            "by_context": {
                context.get("primary_use_case", "general"): [resource_id]
            },
            "by_signature": {
                sig.get("pattern_type", "unknown"): [resource_id]
                for sig in signature_patterns
            },
            "all_resources": [resource_id]
        },
        
        # Context map
        "context_map": {
            resource_id: {
                "use_case": context.get("primary_use_case"),
                "platform": context.get("platform"),
                "content_density": context.get("content_density"),
                "confidence": dtr["meta"]["confidence_scores"]["overall"]
            }
        }
    }
    
    return minimal_dtm


# ============================================================================
# REQUEST MODELS
# ============================================================================

class BuildDTRRequest(BaseModel):
    """Request body for building DTR v5"""
    resource_id: str
    taste_id: str
    context_override: Optional[Dict[str, str]] = None


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
    max_visual_examples: Optional[int] = 3


# ============================================================================
# BUILD DTR v5 ENDPOINT
# ============================================================================

@router.post("/build-dtr")
async def build_dtr(
    request: BuildDTRRequest,
    user: dict = Depends(get_current_user),
    llm: LLMService = Depends(get_llm_service),
):
    """
    Build Design Taste Representation v5 - Visual-First Architecture
    
    Flow:
    1. Load Figma JSON and image
    2. Run code-based quantitative analysis (deterministic)
    3. Extract visual patterns from structure
    4. Build semantic understanding with LLM
    5. Save DTR v5
    6. Trigger DTM update (smart: skip/build/update)
    """
    user_id = user.get("user_id")
    
    try:
        # Get resource from database
        resource = db.get_resource(request.resource_id)
        
        if not resource:
            raise HTTPException(status_code=404, detail="Resource not found")
        
        if resource.get("owner_id") != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Check if DTR already exists
        if storage.resource_dtr_exists(user_id, request.taste_id, request.resource_id):
            return {
                "status": "skipped",
                "reason": "DTR already exists for this resource"
            }
        
        print(f"\n{'='*60}")
        print(f"BUILD DTR v5 - Visual-First Architecture")
        print(f"{'='*60}")
        print(f"User: {user_id}")
        print(f"Taste: {request.taste_id}")
        print(f"Resource: {request.resource_id}")
        
        # ====================================================================
        # STEP 1: Load Figma JSON from S3
        # ====================================================================
        print(f"\n[1/7] Loading figma.json from S3...")
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
        # STEP 2: Parse JSON
        # ====================================================================
        print(f"\n[2/7] Parsing JSON...")
        
        if isinstance(figma_json_str, bytes):
            figma_json_str = figma_json_str.decode('utf-8', errors='replace')
        
        figma_json_str = re.sub(r'[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]', '', figma_json_str)
        figma_json = json.loads(figma_json_str)
        
        print(f"✓ JSON parsed successfully")
        
        # ====================================================================
        # STEP 3: Load image if available
        # ====================================================================
        print(f"\n[3/7] Loading image...")
        
        image_base64 = None
        has_image = resource.get("has_image", False)
        
        if has_image:
            try:
                image_bytes = storage.get_resource_image(
                    user_id, request.taste_id, request.resource_id
                )
                if image_bytes:
                    image_base64 = base64.b64encode(image_bytes).decode("utf-8")
                    print(f"✓ Image loaded: {len(image_bytes):,} bytes")
                else:
                    print(f"⚠️  Image not found")
                    has_image = False
            except Exception as e:
                print(f"⚠️  Could not load image: {e}")
                has_image = False
        else:
            print(f"  No image available")
        
        # ====================================================================
        # STEP 4: Run code-based quantitative analysis
        # ====================================================================
        print(f"\n[4/7] Running code-based analysis...")
        
        code_analysis = analyze_figma_design(figma_json)
        code_conf = code_analysis.get('overall_confidence', 0)
        
        print(f"✓ Code analysis complete")
        print(f"  Overall confidence: {code_conf:.2f}")
        print(f"  Spacing quantum: {code_analysis.get('spacing_analysis', {}).get('spacing_quantum', 'N/A')}")
        print(f"  Colors found: {code_analysis.get('color_analysis', {}).get('total_colors', 0)}")
        
        # ====================================================================
        # STEP 5: Build DTR v6 using new builder with quirk analysis
        # ====================================================================
        print(f"\n[5/7] Building DTR v6 with quirks...")
        
        v5_builder = DTRBuilderV5(llm)
        dtr_builder = DTRBuilderV6(llm, v5_builder)
        
        dtr_v6 = await dtr_builder.build_dtr(
            figma_json=figma_json,
            code_analysis=code_analysis,
            resource_id=request.resource_id,
            taste_id=request.taste_id,
            has_image=has_image,
            image_base64=image_base64,
            context_override=request.context_override
        )
        
        print(f"✓ DTR v6 built")
        print(f"  Confidence: {dtr_v6['meta']['confidence_scores']['overall']:.2f}")
        print(f"  Visual patterns: {len(dtr_v6.get('visual_patterns', []))}")
        print(f"  Signatures detected: {len(dtr_v6.get('signature_patterns', []))}")
        
        # ====================================================================
        # STEP 6: Save DTR v6 to S3
        # ====================================================================
        print(f"\n[6/7] Saving DTR v6 to S3...")
        
        storage.put_resource_dtr(user_id, request.taste_id, request.resource_id, dtr_v6)
        
        print(f"✓ DTR v6 saved")
        
        # ====================================================================
        # STEP 7: Smart DTM update
        # ====================================================================
        print(f"\n[7/7] Smart DTM update...")
        
        dtm_result = await smart_dtm_update(
            user_id=user_id,
            taste_id=request.taste_id,
            new_resource_id=request.resource_id,
            llm=llm
        )
        
        print(f"✓ DTM update: {dtm_result['status']}")
        
        # ====================================================================
        # RETURN
        # ====================================================================
        
        return {
            "status": "success",
            "dtr_version": "6.0",
            "confidence": dtr_v6["meta"]["confidence_scores"]["overall"],
            "context": dtr_v6["meta"]["context"],
            "dtm_update": dtm_result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to build DTR: {str(e)}")


# ============================================================================
# SMART DTM UPDATE (Internal Function)
# ============================================================================

async def smart_dtm_update(
    user_id: str,
    taste_id: str,
    new_resource_id: str,
    llm: LLMService
) -> Dict[str, Any]:
    """
    Smart DTM update logic:
    - 1 resource: Skip (need 2+ for pattern detection)
    - 2 resources: Build initial DTM
    - 3+ resources: Incremental update
    
    Returns status dict for API response
    """
    
    # Count resources with DTRs
    resources = db.list_resources_for_taste(taste_id)
    resources_with_dtr = []
    
    for resource in resources:
        if storage.resource_dtr_exists(user_id, taste_id, resource["resource_id"]):
            resources_with_dtr.append(resource)
    
    total_dtrs = len(resources_with_dtr)
    
    print(f"\n  DTM Update Logic: {total_dtrs} DTRs in taste")
    
    # CASE 1: Only 1 resource → Skip
    if total_dtrs < 2:
        print(f"  → Skip (need 2+ resources for pattern detection)")
        return {
            "status": "skipped",
            "reason": "Need at least 2 resources to build DTM",
            "total_resources": total_dtrs
        }
    
    # Check if DTM exists
    dtm_exists = storage.taste_dtm_exists(user_id, taste_id)
    
    # CASE 2: 2+ resources, no DTM → Build
    if not dtm_exists:
        print(f"  → Building initial DTM v2...")
        
        try:
            # Load all DTRs
            dtrs = []
            for resource in resources_with_dtr:
                dtr = storage.get_resource_dtr(
                    user_id, taste_id, resource["resource_id"]
                )
                if dtr:
                    dtrs.append(dtr)
            
            if not dtrs:
                raise Exception("No DTRs could be loaded")
            
            # Build DTM v2
            dtm_builder = DTMBuilderV2(llm)
            dtm_v2 = await dtm_builder.build_dtm(
                dtrs=dtrs,
                taste_id=taste_id,
                owner_id=user_id
            )
            
            # Save DTM v2
            storage.put_taste_dtm(user_id, taste_id, dtm_v2)
            
            print(f"  ✓ Initial DTM v2 built (confidence: {dtm_v2['meta']['overall_confidence']:.2f})")
            
            return {
                "status": "built",
                "message": "Initial DTM v2 built successfully",
                "total_resources": total_dtrs,
                "confidence": dtm_v2["meta"]["overall_confidence"],
                "signature_patterns": len(dtm_v2.get("signature_patterns", []))
            }
        
        except Exception as e:
            print(f"  ✗ DTM build failed: {e}")
            return {
                "status": "failed",
                "error": str(e)
            }
    
    # CASE 3: DTM exists → Incremental update
    else:
        print(f"  → Updating DTM v2 incrementally...")
        
        try:
            # Load existing DTM
            dtm = storage.get_taste_dtm(user_id, taste_id)
            
            # Load new DTR
            new_dtr = storage.get_resource_dtr(user_id, taste_id, new_resource_id)
            
            if not new_dtr:
                raise Exception("New DTR not found")
            
            # Incremental update
            updater = DTMUpdaterV3()
            updated_dtm = await updater.update_dtm(
                existing_dtm=dtm,
                new_dtr=new_dtr
            )
            
            # Save updated DTM
            storage.put_taste_dtm(user_id, taste_id, updated_dtm)
            
            print(f"  ✓ DTM v2 updated (confidence: {updated_dtm['meta']['overall_confidence']:.2f})")
            
            return {
                "status": "updated",
                "message": "DTM v2 updated incrementally",
                "total_resources": total_dtrs,
                "confidence": updated_dtm["meta"]["overall_confidence"],
                "signature_patterns": len(updated_dtm.get("signature_patterns", []))
            }
        
        except Exception as e:
            print(f"  ✗ DTM update failed: {e}")
            return {
                "status": "failed",
                "error": str(e)
            }


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
# GENERATE UI v2 ENDPOINT
# ============================================================================

@router.post("/generate-ui")
async def generate_ui(
    request: GenerateUIRequest,
    user: dict = Depends(get_current_user),
    llm: LLMService = Depends(get_llm_service),
):
    """
    Generate UI using DTM v2 - Visual-First Generation
    
    Flow:
    1. Load project and selected resources
    2. Load/filter DTM v2
    3. Select relevant visual examples
    4. Extract three-tier rules
    5. Generate with LLM (rules + visual examples)
    6. Return React code
    """
    user_id = user.get("user_id")
    
    try:
        # Get project
        project = db.get_project(request.project_id)
        
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        if project.get("owner_id") != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        print(f"\n{'='*60}")
        print(f"GENERATE UI v2 - Visual-First Generation")
        print(f"{'='*60}")
        print(f"Project: {request.project_id}")
        print(f"Task: {request.task_description}")
        
        # Get taste and selected resources
        taste_id = project.get("selected_taste_id")
        selected_resource_ids = project.get("selected_resource_ids", [])
        
        if not taste_id:
            raise HTTPException(
                status_code=400,
                detail="No taste selected for this project"
            )
        
        print(f"Taste: {taste_id}")
        print(f"Selected resources: {len(selected_resource_ids)}")
        
        # ====================================================================
        # STEP 1: Load DTM v2
        # ====================================================================
        print(f"\n[1/3] Loading DTM v2...")
        
        try:
            dtm = storage.get_taste_dtm(user_id, taste_id)
        except:
            raise HTTPException(
                status_code=404,
                detail="DTM not found. Please add at least 2 resources to build taste model."
            )
        
        print(f"✓ DTM v2 loaded")
        print(f"  Total resources: {dtm['meta']['total_resources']}")
        print(f"  Confidence: {dtm['meta']['overall_confidence']:.2f}")
        print(f"  Signature patterns: {len(dtm.get('signature_patterns', []))}")
        
        # Filter DTM if specific resources are selected
        if selected_resource_ids:
            print(f"\n[1.5/3] Filtering DTM to selected resources...")
            dtm_filter = DTMContextFilterV2()
            dtm = dtm_filter.filter_by_resources(
                dtm=dtm,
                selected_resource_ids=selected_resource_ids
            )
        
        # ====================================================================
        # STEP 2: Setup device info
        # ====================================================================
        print(f"\n[2/3] Setting up device info...")
        
        device_info = request.device_info
        if not device_info:
            # Use project's stored device info or default
            stored_device = project.get("device_info", {})
            device_info = DeviceInfo(
                platform=stored_device.get("platform", "web"),
                screen=DeviceScreen(
                    width=stored_device.get("screen", {}).get("width", 1440),
                    height=stored_device.get("screen", {}).get("height", 900)
                )
            )
        
        device_dict = {
            "platform": device_info.platform,
            "screen": {
                "width": device_info.screen.width,
                "height": device_info.screen.height
            }
        }
        
        print(f"✓ Device: {device_info.platform} ({device_info.screen.width}x{device_info.screen.height}px)")
        
        # ====================================================================
        # STEP 3: Generate UI
        # ====================================================================
        print(f"\n[3/3] Generating UI...")
        
        orchestrator = GenerationOrchestrator(llm, storage)
        
        ui_code = await orchestrator.generate_ui(
            dtm=dtm,
            task_description=request.task_description,
            device_info=device_dict,
            user_id=user_id,
            taste_id=taste_id,
            selected_resource_ids=selected_resource_ids if selected_resource_ids else None,
            max_examples=request.max_visual_examples or 3
        )
        
        print(f"✓ UI generated")
        
        # ====================================================================
        # RETURN
        # ====================================================================
        
        return {
            "status": "success",
            "ui_code": ui_code,
            "device_info": device_dict,
            "generation_method": "three_tier_visual_first"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to generate UI: {str(e)}")


# ============================================================================
# DTM MANAGEMENT ENDPOINTS
# ============================================================================

@router.get("/dtm/{taste_id}")
async def get_dtm(
    taste_id: str,
    user: dict = Depends(get_current_user)
):
    """Get DTM v2 for a taste"""
    user_id = user.get("user_id")
    
    # Check taste ownership
    taste = db.get_taste(taste_id)
    if not taste or taste.get("owner_id") != user_id:
        raise HTTPException(status_code=404, detail="Taste not found")
    
    # Get DTM
    try:
        dtm = storage.get_taste_dtm(user_id, taste_id)
    except:
        raise HTTPException(
            status_code=404,
            detail="DTM not found. Build DTM by adding 2+ resources."
        )
    
    return {
        "status": "success",
        "dtm": dtm
    }


@router.post("/dtm/{taste_id}/rebuild")
async def rebuild_dtm(
    taste_id: str,
    user: dict = Depends(get_current_user),
    llm: LLMService = Depends(get_llm_service)
):
    """Force rebuild DTM from scratch"""
    user_id = user.get("user_id")
    
    # Check taste ownership
    taste = db.get_taste(taste_id)
    if not taste or taste.get("owner_id") != user_id:
        raise HTTPException(status_code=404, detail="Taste not found")
    
    # Get all resources with DTRs
    resources = db.list_resources_for_taste(taste_id)
    resources_with_dtr = []
    
    for resource in resources:
        if storage.resource_dtr_exists(user_id, taste_id, resource["resource_id"]):
            resources_with_dtr.append(resource)
    
    if len(resources_with_dtr) < 2:
        raise HTTPException(
            status_code=400,
            detail="Need at least 2 resources with DTRs to build DTM"
        )
    
    # Load all DTRs
    dtrs = []
    for resource in resources_with_dtr:
        dtr = storage.get_resource_dtr(user_id, taste_id, resource["resource_id"])
        if dtr:
            dtrs.append(dtr)
    
    if not dtrs:
        raise HTTPException(status_code=400, detail="No DTRs could be loaded")
    
    # Build DTM v2
    dtm_builder = DTMBuilderV2(llm)
    dtm_v2 = await dtm_builder.build_dtm(
        dtrs=dtrs,
        taste_id=taste_id,
        owner_id=user_id
    )
    
    # Save DTM v2
    storage.put_taste_dtm(user_id, taste_id, dtm_v2)
    
    return {
        "status": "success",
        "message": "DTM v2 rebuilt successfully",
        "total_resources": len(dtrs),
        "confidence": dtm_v2["meta"]["overall_confidence"],
        "signature_patterns": len(dtm_v2.get("signature_patterns", []))
    }


@router.post("/dtm/update")
async def update_dtm_endpoint(
    taste_id: str,
    resource_id: str,
    user: dict = Depends(get_current_user),
    llm: LLMService = Depends(get_llm_service)
):
    """Update DTM incrementally with new resource"""
    user_id = user.get("user_id")
    
    # Check taste ownership
    taste = db.get_taste(taste_id)
    if not taste or taste.get("owner_id") != user_id:
        raise HTTPException(status_code=404, detail="Taste not found")
    
    print(f"DTM Update: taste_id={taste_id}, resource_id={resource_id}")
    
    try:
        # Call smart update logic
        result = await smart_dtm_update(
            user_id=user_id,
            taste_id=taste_id,
            new_resource_id=resource_id,
            llm=llm
        )
        
        if result["status"] == "failed":
            raise HTTPException(status_code=500, detail=f"Failed to update DTM: {result.get('error', 'Unknown error')}")
        
        return result
    
    except Exception as e:
        print(f"DTM update error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update DTM: {str(e)}")


@router.delete("/dtm/{taste_id}")
async def delete_dtm(
    taste_id: str,
    user: dict = Depends(get_current_user)
):
    """Delete DTM for a taste"""
    user_id = user.get("user_id")
    
    # Check taste ownership
    taste = db.get_taste(taste_id)
    if not taste or taste.get("owner_id") != user_id:
        raise HTTPException(status_code=404, detail="Taste not found")
    
    # Delete DTM
    storage.delete_taste_dtm(user_id, taste_id)
    
    return {
        "status": "success",
        "message": "DTM deleted successfully"
    }


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
        
        current_version = int(project.get("metadata", {}).get("ui_version", 0))
        
        return {
            "status": "success",
            "current_version": current_version,
            "versions": list(range(1, int(current_version) + 1))
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
        
        current_version = int(project.get("metadata", {}).get("ui_version", 0))
        
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

        # Convert Decimal to int (DynamoDB returns Decimal for numbers)
        new_version = int(current_version) + 1

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

# ============================================================================
# FLOW GENERATION
# ============================================================================

@router.post("/generate-flow")
async def generate_flow(
    project_id: str,
    user: dict = Depends(get_current_user),
    llm: LLMService = Depends(get_llm_service),
):
    """Generate a multi-screen flow for a project with versioning"""
    import os
    import asyncio
    user_id = user.get("user_id")
    
    try:
        project = db.get_project(project_id)
        
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        if project.get("owner_id") != user_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        task_description = project.get("task_description", "")
        device_info = project.get("device_info", {})
        max_screens = project.get("max_screens", 5)
        screen_definitions = project.get("screen_definitions", [])  # NEW: Get screen definitions
        
        if not device_info:
            raise HTTPException(status_code=400, detail="Device info required")
        
        # Load DTM v2 if available (with DTR fallback)
        dtm_data = None
        selected_taste_id = project.get("selected_taste_id")
        
        if selected_taste_id:
            try:
                dtm_data = storage.get_taste_dtm(user_id, selected_taste_id)
                print(f"✓ DTM loaded: {len(dtm_data.get('signature_patterns', []))} signatures")
            except Exception as e:
                print(f"Could not load DTM: {e}")
                # Fallback: Try to load DTR and convert to minimal DTM
                try:
                    resources = db.list_resources_for_taste(selected_taste_id)
                    resources_with_dtr = []
                    
                    for resource in resources:
                        if storage.resource_dtr_exists(user_id, selected_taste_id, resource["resource_id"]):
                            dtr = storage.get_resource_dtr(user_id, selected_taste_id, resource["resource_id"])
                            if dtr:
                                resources_with_dtr.append(dtr)
                    
                    if resources_with_dtr:
                        # Convert single DTR to minimal DTM structure
                        dtm_data = _convert_dtr_to_dtm(resources_with_dtr[0], selected_taste_id, user_id)
                        print(f"✓ Using DTR from single resource (minimal DTM created)")
                except Exception as dtr_error:
                    print(f"Could not load DTR either: {dtr_error}")
        
        # Load inspiration images
        inspiration_images = []
        image_keys = project.get("inspiration_image_keys", [])
        
        if image_keys:
            limited_keys = image_keys[-MAX_INSPIRATION_IMAGES_FOR_LLM:]
            inspiration_images = storage.get_inspiration_images(user_id, project_id, limited_keys)
        
        # Generate flow architecture
        flow_arch_message = f"TASK: {task_description}\n\nDEVICE CONTEXT:\n{json.dumps(device_info, indent=2)}\n\nMAX SCREENS: {max_screens}"
        
        # Add screen definitions if provided
        if screen_definitions:
            flow_arch_message += f"\n\nSCREEN DEFINITIONS:\n{json.dumps(screen_definitions, indent=2)}"
        else:
            flow_arch_message += f"\n\nSCREEN DEFINITIONS: None provided - design the optimal flow from scratch based on the task."
        
        flow_arch_content = [
            {"type": "text", "text": flow_arch_message}
        ]
        
        # Add DTM data if available
        if dtm_data:
            dtm_guidance = f"DTM (Designer Taste Model):\n{json.dumps(dtm_data, indent=2)}"
            flow_arch_content.append({"type": "text", "text": f"\n\n{dtm_guidance}"})
        
        for img in inspiration_images:
            flow_arch_content.append({
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": img.get('media_type', 'image/png'),
                    "data": img['data']
                }
            })
        
        flow_arch_response = await llm.call_claude(
            prompt_name="generate_flow_architecture_v2",
            user_message=flow_arch_content,
            parse_json=True
        )
        
        flow_architecture = flow_arch_response["json"]
        
        # Generate UI for each screen using GenerationOrchestrator
        async def generate_screen_ui(screen, screen_index):
            outgoing_transitions = [
                t for t in flow_architecture.get('transitions', [])
                if t['from_screen_id'] == screen['screen_id']
            ]
            
            flow_context = {
                "flow_name": flow_architecture.get('flow_name'),
                "screen_id": screen['screen_id'],
                "screen_name": screen['name'],
                "position_in_flow": screen_index + 1,
                "total_screens": len(flow_architecture['screens']),
                "outgoing_transitions": outgoing_transitions
            }
            
            # Build task description with flow context
            screen_task = f"{screen['task_description']}\n\nFlow context: Screen {screen_index + 1} of {len(flow_architecture['screens'])} in '{flow_architecture.get('flow_name')}' flow"
            
            # NEW: Extract reference mode metadata
            user_provided = screen.get('user_provided', False)
            reference_mode = screen.get('reference_mode')
            screen_desc = screen.get('description', '')
            
            # Use GenerationOrchestrator if we have DTM
            if dtm_data:
                orchestrator = GenerationOrchestrator(llm, storage)
                
                ui_code = await orchestrator.generate_ui(
                    dtm=dtm_data,
                    task_description=screen_task,
                    device_info=device_info,
                    user_id=user_id,
                    taste_id=selected_taste_id,
                    selected_resource_ids=project.get("selected_resource_ids"),
                    max_examples=2,  # Fewer for faster flow generation
                    flow_context=flow_context  # NEW: Pass flow context for navigation
                )
            else:
                # Fallback: Generate without taste
                screen_message = f"TASK: {screen['task_description']}\n\nDEVICE CONTEXT:\n{json.dumps(device_info, indent=2)}\n\nFLOW CONTEXT:\n{json.dumps(flow_context, indent=2)}"
                
                # NEW: Add screen description if user-provided
                if user_provided and screen_desc:
                    screen_message += f"\n\nSCREEN DESCRIPTION: {screen_desc}"
                
                # NEW: Add reference mode
                if reference_mode:
                    screen_message += f"\n\nREFERENCE MODE: {reference_mode}"
                    
                    # NEW: Load screen reference files if available
                    user_screen_index = screen.get('user_screen_index')
                    if user_screen_index is not None and screen_definitions:
                        screen_def = screen_definitions[user_screen_index]
                        has_figma = screen_def.get('has_figma', False)
                        image_count = screen_def.get('image_count', 0)
                        
                        if has_figma or image_count > 0:
                            try:
                                ref_files = storage.get_screen_reference_files(
                                    user_id, project_id, user_screen_index, has_figma, image_count
                                )
                                
                                # Add figma data if available
                                if ref_files['figma_data']:
                                    compressed_figma = prepare_figma_for_llm(ref_files['figma_data'], max_depth=6)
                                    screen_message += f"\n\nREFERENCE FIGMA DATA:\n{compressed_figma}"
                            except Exception as e:
                                print(f"  ⚠ Error loading screen {user_screen_index} reference files: {e}")
                
                screen_content = [
                    {"type": "text", "text": screen_message}
                ]
                
                # NEW: Conditional image loading based on reference mode
                if reference_mode == "exact" and screen.get('user_screen_index') is not None:
                    # Load and add reference images for this specific screen
                    user_screen_index = screen.get('user_screen_index')
                    screen_def = screen_definitions[user_screen_index]
                    image_count = screen_def.get('image_count', 0)
                    if image_count > 0:
                        try:
                            ref_files = storage.get_screen_reference_files(
                                user_id, project_id, user_screen_index, False, image_count
                            )
                            for img in ref_files['images']:
                                screen_content.append({
                                    "type": "image",
                                    "source": {
                                        "type": "base64",
                                        "media_type": img.get('media_type', 'image/png'),
                                        "data": img['data']
                                    }
                                })
                        except Exception as e:
                            print(f"  ⚠ Error loading screen {user_screen_index} images: {e}")
                elif reference_mode == "inspiration" or reference_mode is None:
                    # Use general inspiration images
                    for img in inspiration_images:
                        screen_content.append({
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": img.get('media_type', 'image/png'),
                                "data": img['data']
                            }
                        })
                else:
                    # No reference mode - use general inspiration images
                    for img in inspiration_images:
                        screen_content.append({
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": img.get('media_type', 'image/png'),
                                "data": img['data']
                            }
                        })
                
                screen_response = await llm.call_claude(
                    prompt_name="generate_ui_v2",
                    user_message=screen_content
                )
                
                ui_code = screen_response["text"].strip()
            
            # Strip markdown code fences if present
            if ui_code.startswith("```jsx") or ui_code.startswith("```javascript") or ui_code.startswith("```tsx"):
                first_newline = ui_code.find('\n')
                if first_newline != -1:
                    ui_code = ui_code[first_newline + 1:]
            elif ui_code.startswith("```"):
                ui_code = ui_code[3:]
            if ui_code.endswith("```"):
                ui_code = ui_code[:-3]
            ui_code = ui_code.strip()
            
            return {"screen_id": screen['screen_id'], "ui_code": ui_code}
        
        screen_tasks = [
            generate_screen_ui(screen, i)
            for i, screen in enumerate(flow_architecture['screens'])
        ]
        screen_results = await asyncio.gather(*screen_tasks)
        
        for result in screen_results:
            for screen in flow_architecture['screens']:
                if screen['screen_id'] == result['screen_id']:
                    screen['ui_code'] = result['ui_code']
                    break
        
        # Calculate layout
        def calculate_layout(flow_arch):
            screens = flow_arch['screens']
            transitions = flow_arch.get('transitions', [])
            
            graph = {screen['screen_id']: [] for screen in screens}
            for trans in transitions:
                if trans['from_screen_id'] in graph:
                    graph[trans['from_screen_id']].append(trans['to_screen_id'])
            
            entry_id = flow_arch['entry_screen_id']
            depths = {entry_id: 0}
            visited = set()
            
            def assign_depth(screen_id, depth):
                if screen_id in visited:
                    return
                visited.add(screen_id)
                depths[screen_id] = depth
                for next_id in graph.get(screen_id, []):
                    if next_id not in depths or depths[next_id] > depth + 1:
                        assign_depth(next_id, depth + 1)
            
            assign_depth(entry_id, 0)
            
            for screen in screens:
                if screen['screen_id'] not in depths:
                    depths[screen['screen_id']] = 0
            
            depth_groups = {}
            for screen_id, depth in depths.items():
                if depth not in depth_groups:
                    depth_groups[depth] = []
                depth_groups[depth].append(screen_id)
            
            positions = {}
            for depth, screen_ids in sorted(depth_groups.items()):
                x = depth * 600
                for i, screen_id in enumerate(screen_ids):
                    y = i * (int(device_info.get('screen', {}).get('height', 812)) + 400)
                    positions[screen_id] = {"x": x, "y": y}
            
            return positions
        
        layout_positions = calculate_layout(flow_architecture)
        
        # Build flow graph
        flow_graph = {
            "flow_id": f"flow_{project_id}",
            "flow_name": flow_architecture.get('flow_name'),
            "description": task_description,
            "entry_screen_id": flow_architecture.get('entry_screen_id'),
            "screens": flow_architecture.get('screens', []),
            "transitions": flow_architecture.get('transitions', []),
            "layout_positions": layout_positions,
            "layout_algorithm": "hierarchical"
        }
        
        # === VERSIONING LOGIC ===
        # Get existing versions
        existing_versions = storage.list_project_flow_versions(user_id, project_id)
        new_version = max(existing_versions) + 1 if existing_versions else 1
        
        print(f"💾 Saving flow as version {new_version}")
        
        # Save versioned flow to S3
        storage.put_project_flow(user_id, project_id, flow_graph, new_version)
        
        # Update project's flow_graph in database
        db.update_project_flow_graph(project_id, flow_graph)
        
        return {
            "status": "success",
            "flow_graph": flow_graph,
            "version": new_version
        }
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to generate flow: {str(e)}")


# ============================================================================
# FLOW VERSIONING ENDPOINTS
# ============================================================================

@router.get("/flow/get")
async def get_flow(
    project_id: str,
    version: Optional[int] = None,
    user: dict = Depends(get_current_user),
):
    """
    Get a specific version of a flow for a project
    If version is not specified, returns the latest version
    """
    user_id = user.get("user_id")
    
    try:
        project = db.get_project(project_id)
        
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        if project.get("owner_id") != user_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # Get list of versions
        versions = storage.list_project_flow_versions(user_id, project_id)
        
        if not versions:
            raise HTTPException(status_code=404, detail="No flow versions found")
        
        # Use specified version or latest
        target_version = version if version is not None else max(versions)
        
        if target_version not in versions:
            raise HTTPException(
                status_code=404,
                detail=f"Version {target_version} not found"
            )
        
        # Load flow from S3
        flow_graph = storage.get_project_flow(user_id, project_id, target_version)
        
        if not flow_graph:
            raise HTTPException(status_code=404, detail="Flow data not found")
        
        return {
            "status": "success",
            "flow_graph": flow_graph,
            "version": target_version
        }
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to get flow: {str(e)}")


@router.get("/flow/versions")
async def get_flow_versions(
    project_id: str,
    user: dict = Depends(get_current_user),
):
    """Get all flow versions for a project"""
    user_id = user.get("user_id")
    
    try:
        project = db.get_project(project_id)
        
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        if project.get("owner_id") != user_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # Get list of versions
        versions = storage.list_project_flow_versions(user_id, project_id)
        
        current_version = max(versions) if versions else 0
        
        return {
            "status": "success",
            "current_version": current_version,
            "versions": versions
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get flow versions: {str(e)}"
        )


@router.post("/flow/revert")
async def revert_flow_version(
    project_id: str,
    version: int,
    user: dict = Depends(get_current_user),
):
    """
    Revert to a previous flow version by creating a new version as a copy
    This preserves history - the old version becomes the newest version
    """
    user_id = user.get("user_id")
    
    try:
        project = db.get_project(project_id)
        
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        if project.get("owner_id") != user_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # Get list of versions
        versions = storage.list_project_flow_versions(user_id, project_id)
        
        if not versions:
            raise HTTPException(status_code=404, detail="No flow versions found")
        
        if version not in versions:
            raise HTTPException(
                status_code=404,
                detail=f"Version {version} not found"
            )
        
        # Load the old version
        old_flow_graph = storage.get_project_flow(user_id, project_id, version)
        
        if not old_flow_graph:
            raise HTTPException(status_code=404, detail="Flow data not found")
        
        # Create new version number (max + 1)
        new_version = max(versions) + 1
        
        # Save as new version
        storage.put_project_flow(user_id, project_id, old_flow_graph, new_version)
        
        # Update project's flow_graph in database
        db.update_project_flow_graph(project_id, old_flow_graph)
        
        return {
            "status": "success",
            "message": f"Reverted to version {version} as new version {new_version}",
            "old_version": version,
            "new_version": new_version,
            "flow_graph": old_flow_graph
        }
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to revert flow version: {str(e)}"
        )