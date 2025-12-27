"""
WebSocket Handler for Long-Running LLM Operations - V2
Updated to use DTR v5 and DTM v2 with visual-first taste learning
Supports both single-screen and flow-based generation
"""
import json
import base64
import re
from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, Any, List

from app.llm import get_llm_service
from app import db, storage
from app.code_based_analyzer import analyze_figma_design

# NEW V2 imports
from app.dtr_builder_v5 import DTRBuilderV5
from app.dtr_builder_v6 import DTRBuilderV6
from app.dtm_builder_v2 import DTMBuilderV2
from app.dtm_updater_v3 import DTMUpdaterV3
from app.generation_orchestrator import GenerationOrchestrator


async def send_progress(websocket: WebSocket, stage: str, message: str, data: Dict[str, Any] = None):
    """Send progress update to client"""
    await websocket.send_json({
        "type": "progress",
        "stage": stage,
        "message": message,
        "data": data or {}
    })


async def send_error(websocket: WebSocket, error: str):
    """Send error to client"""
    await websocket.send_json({
        "type": "error",
        "error": error
    })


async def send_complete(websocket: WebSocket, result: Dict[str, Any]):
    """Send completion with result"""
    await websocket.send_json({
        "type": "complete",
        "result": result
    })


async def handle_build_dtr(websocket: WebSocket, data: Dict[str, Any], user_id: str):
    """
    Handle build-dtr WebSocket request using DTR v5
    """
    try:
        resource_id = data.get("resource_id")
        taste_id = data.get("taste_id")
        context_override = data.get("context_override")  # Optional manual context
        
        if not resource_id or not taste_id:
            await send_error(websocket, "Missing resource_id or taste_id")
            return
        
        # Get resource
        await send_progress(websocket, "init", "Loading resource...")
        resource = db.get_resource(resource_id)
        
        if not resource:
            await send_error(websocket, "Resource not found")
            return
        
        # Check if DTR exists
        if storage.resource_dtr_exists(user_id, taste_id, resource_id):
            await send_complete(websocket, {
                "status": "skipped",
                "reason": "DTR already exists for this resource"
            })
            return
        
        # Load Figma JSON
        await send_progress(websocket, "loading", "Loading Figma JSON from S3...")
        figma_json_str = storage.get_resource_figma(user_id, taste_id, resource_id)
        
        if not figma_json_str:
            await send_error(websocket, "Figma JSON not found")
            return
        
        # Parse JSON
        await send_progress(websocket, "parsing", "Parsing Figma data...")
        if isinstance(figma_json_str, bytes):
            figma_json_str = figma_json_str.decode('utf-8', errors='replace')
        figma_json_str = re.sub(r'[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]', '', figma_json_str)
        figma_json = json.loads(figma_json_str)
        
        # Load image if available
        await send_progress(websocket, "loading_image", "Loading image...")
        image_base64 = None
        has_image = resource.get("has_image", False)
        
        if has_image:
            try:
                image_bytes = storage.get_resource_image(user_id, taste_id, resource_id)
                if image_bytes:
                    image_base64 = base64.b64encode(image_bytes).decode("utf-8")
            except Exception:
                has_image = False
        
        # Run code analysis
        await send_progress(websocket, "analyzing", "Running code-based analysis...")
        code_analysis = analyze_figma_design(figma_json)
        
        # Build DTR v5
        await send_progress(
            websocket,
            "building_dtr",
            "Building DTR v6 with quirk analysis (this may take 1-2 minutes)..."
        )
        
        llm = get_llm_service()
        v5_builder = DTRBuilderV5(llm)
        dtr_builder = DTRBuilderV6(llm, v5_builder)
        
        dtr_v6 = await dtr_builder.build_dtr(
            figma_json=figma_json,
            code_analysis=code_analysis,
            resource_id=resource_id,
            taste_id=taste_id,
            has_image=has_image,
            image_base64=image_base64,
            context_override=context_override
        )
        
        # Save DTR v6
        await send_progress(websocket, "saving_dtr", "Saving DTR v6...")
        storage.put_resource_dtr(user_id, taste_id, resource_id, dtr_v6)
        
        # Update resource metadata
        metadata = resource.get("metadata", {})
        metadata["has_dtr"] = True
        metadata["dtr_version"] = "5.0"
        db.update_resource(resource_id, metadata=metadata)
        
        # Smart DTM update
        await send_progress(websocket, "updating_dtm", "Updating Designer Taste Model...")
        dtm_result = await smart_dtm_update(
            user_id=user_id,
            taste_id=taste_id,
            new_resource_id=resource_id,
            llm=llm,
            websocket=websocket
        )
        
        # Complete
        await send_complete(websocket, {
            "status": "success",
            "version": "6.0",
            "dtr": dtr_v6,
            "confidence": dtr_v6.get('meta', {}).get('confidence_scores', {}),
            "context": dtr_v6.get('meta', {}).get('context', {}),
            "dtm_update": dtm_result
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        await send_error(websocket, str(e))


async def smart_dtm_update(
    user_id: str,
    taste_id: str,
    new_resource_id: str,
    llm,
    websocket: WebSocket
) -> Dict[str, Any]:
    """
    Smart DTM update logic with progress updates
    - 1 resource: Skip
    - 2 resources: Build initial DTM v2
    - 3+ resources: Incremental update
    """
    
    # Count resources with DTRs
    resources = db.list_resources_for_taste(taste_id)
    resources_with_dtr = []
    
    for resource in resources:
        if storage.resource_dtr_exists(user_id, taste_id, resource["resource_id"]):
            resources_with_dtr.append(resource)
    
    total_dtrs = len(resources_with_dtr)
    
    # CASE 1: Only 1 resource → Skip
    if total_dtrs < 2:
        return {
            "status": "skipped",
            "reason": "Need at least 2 resources to build DTM",
            "total_resources": total_dtrs
        }
    
    # Check if DTM exists
    dtm_exists = storage.taste_dtm_exists(user_id, taste_id)
    
    # CASE 2: 2+ resources, no DTM → Build
    if not dtm_exists:
        await send_progress(
            websocket,
            "building_dtm",
            f"Building initial DTM v2 from {total_dtrs} resources..."
        )
        
        try:
            # Load all DTRs
            dtrs = []
            for resource in resources_with_dtr:
                dtr = storage.get_resource_dtr(user_id, taste_id, resource["resource_id"])
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
            
            return {
                "status": "built",
                "message": "Initial DTM v2 built successfully",
                "total_resources": total_dtrs,
                "confidence": dtm_v2["meta"]["overall_confidence"],
                "signature_patterns": len(dtm_v2.get("signature_patterns", []))
            }
        
        except Exception as e:
            print(f"DTM build failed: {e}")
            return {
                "status": "failed",
                "error": str(e)
            }
    
    # CASE 3: DTM exists → Incremental update
    else:
        await send_progress(
            websocket,
            "updating_dtm",
            f"Updating DTM v2 incrementally (now {total_dtrs} resources)..."
        )
        
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
            
            return {
                "status": "updated",
                "message": "DTM v2 updated incrementally",
                "total_resources": total_dtrs,
                "confidence": updated_dtm["meta"]["overall_confidence"],
                "signature_patterns": len(updated_dtm.get("signature_patterns", []))
            }
        
        except Exception as e:
            print(f"DTM update failed: {e}")
            return {
                "status": "failed",
                "error": str(e)
            }


async def handle_generate_ui(websocket: WebSocket, data: Dict[str, Any], user_id: str):
    """
    Handle generate-ui WebSocket request using DTM v2 with flow support
    
    Supports both:
    - Single screen generation (flow_mode=False)
    - Flow generation (flow_mode=True) - multiple screens
    """
    try:
        project_id = data.get("project_id")
        task_description = data.get("task_description")
        device_info = data.get("device_info")
        rendering_mode = data.get("rendering_mode", "design-ml")
        flow_mode = data.get("flow_mode", True)  # Default to flow
        max_screens = data.get("max_screens", 5)
        
        if not project_id or not task_description:
            await send_error(websocket, "Missing project_id or task_description")
            return
        
        # Get project
        await send_progress(websocket, "init", "Loading project...")
        project = db.get_project(project_id)
        
        if not project:
            await send_error(websocket, "Project not found")
            return
        
        if project.get("owner_id") != user_id:
            await send_error(websocket, "Not authorized")
            return
        
        # Get taste and selected resources
        taste_id = project.get("selected_taste_id")
        selected_resource_ids = project.get("selected_resource_ids", [])
        
        # Setup device dict
        device_dict = {
            "platform": device_info.get("platform", "web") if device_info else "web",
            "screen": {
                "width": device_info.get("screen", {}).get("width", 1440) if device_info else 1440,
                "height": device_info.get("screen", {}).get("height", 900) if device_info else 900
            }
        }
        
        # Load DTM v2 if taste selected
        dtm = None
        if taste_id:
            await send_progress(websocket, "loading_dtm", "Loading Designer Taste Model...")
            try:
                dtm = storage.get_taste_dtm(user_id, taste_id)
                await send_progress(
                    websocket,
                    "dtm_loaded",
                    f"DTM loaded: {len(dtm.get('signature_patterns', []))} signature patterns"
                )
            except Exception as e:
                print(f"Could not load DTM: {e}")
                # Fallback: Try to load DTRs and convert to minimal DTM
                await send_progress(websocket, "loading_dtr", "No DTM found, checking for DTRs...")
                try:
                    resources = db.list_resources_for_taste(taste_id)
                    resources_with_dtr = []
                    
                    for resource in resources:
                        if storage.resource_dtr_exists(user_id, taste_id, resource["resource_id"]):
                            dtr = storage.get_resource_dtr(user_id, taste_id, resource["resource_id"])
                            if dtr:
                                resources_with_dtr.append(dtr)
                    
                    if resources_with_dtr:
                        # Convert single DTR to minimal DTM structure
                        dtm = _convert_dtr_to_dtm(resources_with_dtr[0], taste_id, user_id)
                        await send_progress(
                            websocket,
                            "dtr_loaded",
                            f"Using DTR from single resource (minimal taste model)"
                        )
                except Exception as dtr_error:
                    print(f"Could not load DTR either: {dtr_error}")
                    # Continue without any taste data
        
        # FLOW MODE: Generate multiple screens
        if flow_mode:
            await handle_flow_generation(
                websocket=websocket,
                project_id=project_id,
                task_description=task_description,
                device_dict=device_dict,
                dtm=dtm,
                user_id=user_id,
                taste_id=taste_id,
                selected_resource_ids=selected_resource_ids,
                max_screens=max_screens,
                rendering_mode=rendering_mode
            )
        
        # SINGLE SCREEN MODE: Generate one screen
        else:
            await handle_single_screen_generation(
                websocket=websocket,
                project_id=project_id,
                task_description=task_description,
                device_dict=device_dict,
                dtm=dtm,
                user_id=user_id,
                taste_id=taste_id,
                selected_resource_ids=selected_resource_ids,
                rendering_mode=rendering_mode
            )
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        await send_error(websocket, str(e))


async def handle_single_screen_generation(
    websocket: WebSocket,
    project_id: str,
    task_description: str,
    device_dict: Dict,
    dtm: Dict,
    user_id: str,
    taste_id: str,
    selected_resource_ids: List[str],
    rendering_mode: str
):
    """Generate single screen using DTM v2 with visual examples"""
    
    if dtm:
        # Use GenerationOrchestrator with DTM v2
        await send_progress(
            websocket,
            "generating",
            "Generating UI with designer's taste (selecting visual examples)..."
        )
        
        llm = get_llm_service()
        orchestrator = GenerationOrchestrator(llm, storage)
        
        ui_code = await orchestrator.generate_ui(
            dtm=dtm,
            task_description=task_description,
            device_info=device_dict,
            user_id=user_id,
            taste_id=taste_id,
            selected_resource_ids=selected_resource_ids if selected_resource_ids else None,
            max_examples=3
        )
        
        # Save
        await send_progress(websocket, "saving", "Saving generated UI...")
        current_version = 1
        storage.put_project_ui(user_id, project_id, {"code": ui_code}, version=current_version)
        
        # Complete
        await send_complete(websocket, {
            "status": "success",
            "type": "react",
            "ui": ui_code,
            "version": current_version,
            "taste_applied": True
        })
    
    else:
        # Generate without DTM (from scratch)
        await send_progress(
            websocket,
            "generating",
            "Generating UI from scratch (no taste model available)..."
        )
        
        llm = get_llm_service()
        
        # Simple prompt without taste
        user_message = f"""Generate a React component for this task:

TASK: {task_description}

DEVICE: {device_dict["platform"]} ({device_dict["screen"]["width"]}x{device_dict["screen"]["height"]}px)

Return ONLY the React component code.
"""
        
        response = await llm.call_claude(
            prompt_name="generate_ui_react_v2",
            user_message=user_message,
            max_tokens=8000
        )
        
        ui_code = response.get("text", "")
        
        # Save
        await send_progress(websocket, "saving", "Saving generated UI...")
        storage.put_project_ui(user_id, project_id, {"code": ui_code}, version=1)
        
        # Complete
        await send_complete(websocket, {
            "status": "success",
            "type": "react",
            "ui": ui_code,
            "version": 1,
            "taste_applied": False
        })


async def handle_flow_generation(
    websocket: WebSocket,
    project_id: str,
    task_description: str,
    device_dict: Dict,
    dtm: Dict,
    user_id: str,
    taste_id: str,
    selected_resource_ids: List[str],
    max_screens: int,
    rendering_mode: str
):
    """
    Generate flow (multiple screens) using DTM v2
    
    Strategy:
    1. Generate flow architecture (screens + transitions)
    2. For each screen, generate UI using DTM v2 + visual examples
    3. Build flow graph
    """
    
    llm = get_llm_service()
    
    # Step 1: Generate flow architecture
    await send_progress(
        websocket,
        "planning_flow",
        f"Planning user flow (max {max_screens} screens)..."
    )
    
    flow_architecture_prompt = f"""Design a user flow for this task:

TASK: {task_description}

MAX SCREENS: {max_screens}

Design a logical flow with:
- Entry point
- Intermediate screens
- Success/error states
- Transitions between screens

Return JSON:
{{
  "flow_name": "...",
  "entry_screen_id": "screen_1",
  "screens": [
    {{
      "screen_id": "screen_1",
      "name": "...",
      "description": "...",
      "task_description": "Specific UI task for this screen",
      "screen_type": "entry|intermediate|success|error"
    }}
  ],
  "transitions": [
    {{
      "transition_id": "t1",
      "from_screen_id": "screen_1",
      "to_screen_id": "screen_2",
      "trigger": "User taps Submit",
      "trigger_type": "tap|submit|auto",
      "flow_type": "forward|back|error|success"
    }}
  ]
}}
"""
    
    response = await llm.call_claude(
        prompt_name="generate_flow_architecture",
        user_message=flow_architecture_prompt,
        max_tokens=4000,
        parse_json=True
    )
    
    flow_architecture = response.get("json", {})
    screens = flow_architecture.get("screens", [])
    
    await send_progress(
        websocket,
        "flow_planned",
        f"Flow planned: {len(screens)} screens",
        {"screen_count": len(screens)}
    )
    
    # Step 2: Generate UI for each screen
    for idx, screen in enumerate(screens, 1):
        screen_id = screen["screen_id"]
        screen_task = screen["task_description"]
        
        await send_progress(
            websocket,
            "generating_screen",
            f"Generating screen {idx}/{len(screens)}: {screen['name']}...",
            {"screen_id": screen_id, "progress": idx / len(screens)}
        )
        
        # Generate UI for this screen
        if dtm:
            # Use DTM v2 with visual examples
            orchestrator = GenerationOrchestrator(llm, storage)
            
            ui_code = await orchestrator.generate_ui(
                dtm=dtm,
                task_description=screen_task,
                device_info=device_dict,
                user_id=user_id,
                taste_id=taste_id,
                selected_resource_ids=selected_resource_ids if selected_resource_ids else None,
                max_examples=2  # Fewer examples for faster flow generation
            )
        else:
            # Generate without DTM
            simple_prompt = f"Generate React component: {screen_task}\nDevice: {device_dict}"
            response = await llm.call_claude(
                prompt_name="generate_ui_react_v2",
                user_message=simple_prompt,
                max_tokens=6000
            )
            ui_code = response.get("text", "")
        
        # Add UI to screen
        screen["ui_code"] = ui_code
        screen["ui_loading"] = False
        screen["ui_error"] = False
        screen["platform"] = device_dict["platform"]
        screen["dimensions"] = device_dict["screen"]
    
    # Step 3: Build flow graph
    await send_progress(websocket, "building_flow", "Building flow graph...")
    
    flow_graph = {
        "flow_id": f"flow_{project_id}",
        "flow_name": flow_architecture.get("flow_name", "User Flow"),
        "description": task_description,
        "entry_screen_id": flow_architecture.get("entry_screen_id"),
        "screens": screens,
        "transitions": flow_architecture.get("transitions", []),
        "layout_positions": {},  # Frontend will calculate
        "layout_algorithm": "hierarchical"
    }
    
    # Save flow
    await send_progress(websocket, "saving_flow", "Saving flow...")
    
    existing_versions = storage.list_project_flow_versions(user_id, project_id)
    new_version = max(existing_versions) + 1 if existing_versions else 1
    
    storage.put_project_flow(user_id, project_id, flow_graph, new_version)
    db.update_project_flow_graph(project_id, flow_graph)
    
    # Complete
    await send_complete(websocket, {
        "status": "success",
        "type": "flow",
        "flow_graph": flow_graph,
        "version": new_version,
        "screen_count": len(screens),
        "taste_applied": dtm is not None
    })


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


async def handle_websocket(websocket: WebSocket, user_id: str):
    """Main WebSocket handler"""
    await websocket.accept()
    
    try:
        while True:
            # Receive message
            message = await websocket.receive_json()
            action = message.get("action")
            data = message.get("data", {})
            
            if action == "build-dtr":
                await handle_build_dtr(websocket, data, user_id)
            elif action == "generate-ui":
                await handle_generate_ui(websocket, data, user_id)
            else:
                await send_error(websocket, f"Unknown action: {action}")
                
    except WebSocketDisconnect:
        print(f"WebSocket disconnected for user: {user_id}")
    except Exception as e:
        print(f"WebSocket error: {e}")
        try:
            await send_error(websocket, str(e))
        except:
            pass