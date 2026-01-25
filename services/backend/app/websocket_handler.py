"""
WebSocket Handler for Long-Running LLM Operations - V2
Updated to use DTR v5 and DTM v2 with visual-first taste learning
Supports both single-screen and flow-based generation
"""
import json
import base64
import re
from decimal import Decimal
from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, Any, List

from app.llm import get_llm_service
from app import db, storage
from app.db import convert_decimals  # Import for Decimal conversion
from app.code_based_analyzer import analyze_figma_design

# NEW V2 imports
from app.dtr_builder_v5 import DTRBuilderV5
from app.dtr_builder_v6 import DTRBuilderV6
from app.dtm_builder_v2 import DTMBuilderV2
from app.dtm_updater_v3 import DTMUpdaterV3
from app.generation_orchestrator import GenerationOrchestrator
from app.parametric import ParametricGenerator

# Import helper for Figma compression
from app.unified_dtr_builder import prepare_figma_for_llm

# Import wireframe processor for redesign mode
from app.wireframe_processor import process_redesign_references, prepare_wireframe_for_llm

# Import rethink processor for rethink mode
from app.rethink_processor import RethinkProcessor

# Import progressive streaming
from app.progressive_streaming import generate_screen_ui_progressive

from app.feedback_router import FeedbackRouter
from app.feedback_applier import FeedbackApplier

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


def convert_floats_to_decimals(obj):
    """
    Recursively convert all float values to Decimal for DynamoDB compatibility.
    DynamoDB doesn't support Python float types, only Decimal.
    """
    if isinstance(obj, float):
        return Decimal(str(obj))
    elif isinstance(obj, dict):
        return {k: convert_floats_to_decimals(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_floats_to_decimals(item) for item in obj]
    else:
        return obj


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
                "message": "DTM v2 built successfully",
                "total_resources": total_dtrs,
                "confidence": dtm_v2["meta"]["overall_confidence"]
            }
            
        except Exception as e:
            return {
                "status": "error",
                "error": str(e)
            }
    
    # CASE 3: DTM exists → Incremental update
    else:
        await send_progress(
            websocket,
            "updating_dtm",
            f"Updating DTM v2 with new resource..."
        )
        
        try:
            # Get existing DTM
            dtm = storage.get_taste_dtm(user_id, taste_id)
            
            # Get new DTR
            new_dtr = storage.get_resource_dtr(user_id, taste_id, new_resource_id)
            
            if not new_dtr:
                raise Exception("DTR not found for new resource")
            
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
                "message": "DTM v2 updated successfully",
                "total_resources": updated_dtm["meta"]["total_resources"],
                "confidence": updated_dtm["meta"]["overall_confidence"]
            }
            
        except Exception as e:
            return {
                "status": "error",
                "error": str(e)
            }


async def handle_generate_ui(websocket: WebSocket, data: Dict[str, Any], user_id: str):
    """Handle generate-ui WebSocket request"""
    try:
        project_id = data.get("project_id")
        task_description = data.get("task_description")
        device_info = data.get("device_info")
        rendering_mode = data.get("rendering_mode", "react")
        
        if not project_id or not task_description or not device_info:
            await send_error(websocket, "Missing required fields")
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
        
        # Load DTM
        await send_progress(websocket, "loading_dtm", "Loading designer taste model...")
        
        dtm = None
        selected_taste_id = project.get("selected_taste_id")
        selected_resource_ids = project.get("selected_resource_ids", [])
        
        if selected_taste_id:
            try:
                dtm = storage.get_taste_dtm(user_id, selected_taste_id)
            except:
                # Try converting single DTR
                resources = db.list_resources_for_taste(selected_taste_id)
                resources_with_dtr = [
                    r for r in resources
                    if storage.resource_dtr_exists(user_id, selected_taste_id, r["resource_id"])
                ]
                
                if len(resources_with_dtr) == 1:
                    dtr = storage.get_resource_dtr(
                        user_id,
                        selected_taste_id,
                        resources_with_dtr[0]["resource_id"]
                    )
                    dtm = _convert_dtr_to_dtm(dtr, selected_taste_id, user_id)
        
        # Generate UI
        await send_progress(websocket, "generating", "Generating UI...")
        
        llm = get_llm_service()
        
        if dtm:
            # Use DTM with orchestrator
            orchestrator = GenerationOrchestrator(llm, storage)
            
            ui_code = await orchestrator.generate_ui(
                dtm=dtm,
                task_description=task_description,
                device_info=device_info,
                user_id=user_id,
                taste_id=selected_taste_id,
                selected_resource_ids=selected_resource_ids if selected_resource_ids else None,
                max_examples=3
            )
        else:
            # Generate without DTM
            simple_prompt = f"Generate React component: {task_description}\nDevice: {device_info}"
            response = await llm.call_claude(
                prompt_name="generate_ui_v2",
                user_message=simple_prompt,
                max_tokens=6000
            )
            ui_code = response.get("text", "")
        
        # Save output
        await send_progress(websocket, "saving", "Saving output...")
        storage.put_project_output(user_id, project_id, ui_code.encode('utf-8'))
        
        # Complete
        await send_complete(websocket, {
            "status": "success",
            "ui_code": ui_code,
            "rendering_mode": rendering_mode
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        await send_error(websocket, str(e))


async def handle_generate_flow(websocket: WebSocket, data: Dict[str, Any], user_id: str):
    """Handle generate-flow WebSocket request with progressive screen updates"""
    import asyncio
    
    try:
        project_id = data.get("project_id")
        
        if not project_id:
            await send_error(websocket, "Missing project_id")
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
        
        task_description = project.get("task_description", "")
        device_info = project.get("device_info", {})
        max_screens = project.get("max_screens", 5)
        screen_definitions = project.get("screen_definitions", [])  # NEW: Get screen definitions
        
        if not device_info:
            await send_error(websocket, "Device info required")
            return
        
        # Load DTM if available (with filtering for rethink mode)
        await send_progress(websocket, "loading_dtm", "Loading designer taste model...")
        dtm_guidance = None
        dtm = None  # Full DTM object for rethink mode
        selected_taste_id = project.get("selected_taste_id")
        selected_resource_ids = project.get("selected_resource_ids", [])
        
        if selected_taste_id:
            try:
                # Load raw DTM
                raw_dtm = storage.get_taste_dtm(user_id, selected_taste_id)
                
                if raw_dtm:
                    # Filter if specific resources selected
                    if selected_resource_ids and len(selected_resource_ids) > 0:
                        from app.dtm_context_filter_v2 import DTMContextFilterV2
                        
                        filter = DTMContextFilterV2()
                        dtm = filter.filter_by_resources(
                            dtm=raw_dtm,
                            selected_resource_ids=selected_resource_ids
                        )
                        print(f"  DTM filtered to {len(selected_resource_ids)} selected resources")
                    else:
                        dtm = raw_dtm
                        total_resources = dtm.get('meta', {}).get('total_resources', 0)
                        print(f"  DTM loaded ({total_resources} total resources)")
                    
                    # Create DTM guidance string for flow architecture (legacy)
                    dtm_guidance = f"DTM (Designer Taste Model):\n{json.dumps(dtm, indent=2)}"
            except Exception as e:
                print(f"  Warning: Could not load DTM: {e}")
        
        # Load inspiration images
        await send_progress(websocket, "loading_images", "Loading inspiration images...")
        inspiration_images = []
        image_keys = project.get("inspiration_image_keys", [])
        
        if image_keys:
            MAX_INSPIRATION_IMAGES_FOR_LLM = 5
            limited_keys = image_keys[-MAX_INSPIRATION_IMAGES_FOR_LLM:]
            inspiration_images = storage.get_inspiration_images(user_id, project_id, limited_keys)
        
        # Rethink mode processing
        has_rethink_screens = any(
            screen_def.get('mode') == 'rethink'
            for screen_def in screen_definitions
        )
        
        rethink_data = None
        
        if has_rethink_screens:
            # Get reference files for first rethink screen
            rethink_screen_index = next(
                i for i, sd in enumerate(screen_definitions)
                if sd.get('mode') == 'rethink'
            )
            
            screen_def = screen_definitions[rethink_screen_index]
            has_figma = screen_def.get('has_figma', False)
            image_count = screen_def.get('image_count', 0)
            
            reference_files = {}
            
            if has_figma or image_count > 0:
                try:
                    ref_files = storage.get_screen_reference_files(
                        user_id, project_id, rethink_screen_index, has_figma, image_count
                    )
                    reference_files = ref_files
                except Exception as e:
                    print(f"Warning: Could not load rethink reference files: {e}")
            
            # Run rethink pipeline with DTM
            try:
                llm = get_llm_service()
                
                # Create progress callback for rethink steps
                async def rethink_progress(stage: str, message: str):
                    await send_progress(websocket, stage, message)
                
                rethink_processor = RethinkProcessor(llm, progress_callback=rethink_progress)
                
                rethink_data = await rethink_processor.process_rethink_complete(
                    reference_files=reference_files,
                    task_description=task_description,
                    device_info=device_info,
                    domain=None,  # Will be inferred
                    dtm=dtm  # Pass DTM for quirk-informed rethinking
                )
                
                # Send rethink results to client
                await websocket.send_json({
                    "type": "rethink_complete",
                    "data": {
                        "intent_analysis": rethink_data.get('intent_analysis'),
                        "first_principles": rethink_data.get('first_principles'),
                        "explorations": rethink_data.get('explorations'),
                        "optimal_design": rethink_data.get('optimal_design'),
                        "has_designer_philosophy": rethink_data.get('designer_philosophy') is not None
                    }
                })
                
                print(f"  ✓ Strategic rethinking complete")
                
            except Exception as e:
                print(f"Error in rethink pipeline: {e}")
                import traceback
                traceback.print_exc()
                await send_error(websocket, f"Rethink pipeline failed: {str(e)}")
                return
        
        # Generate flow architecture
        await send_progress(websocket, "generating_flow", "Generating flow architecture...")
        flow_arch_message = f"TASK: {task_description}\n\nDEVICE CONTEXT:\n{json.dumps(device_info, indent=2)}\n\nMAX SCREENS: {max_screens}"
        
        # Add screen definitions if provided
        if screen_definitions:
            flow_arch_message += f"\n\nSCREEN DEFINITIONS:\n{json.dumps(screen_definitions, indent=2)}"
        else:
            flow_arch_message += f"\n\nSCREEN DEFINITIONS: None provided - design the optimal flow from scratch based on the task."
        
        # Add rethink context if available
        if rethink_data:
            rethink_flow_context = rethink_processor.prepare_rethink_for_flow_architecture(
                rethink_data, task_description, device_info
            )
            flow_arch_message += f"\n\n{rethink_flow_context}"
            
        flow_arch_content = [
            {"type": "text", "text": flow_arch_message}
        ]
        
        if dtm_guidance:
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
        
        # Determine which flow architecture prompt to use
        if has_rethink_screens:
            flow_arch_prompt = "generate_flow_architecture_rethink"
        else:
            flow_arch_prompt = "generate_flow_architecture_v2"
        
        llm = get_llm_service()
        flow_arch_response = await llm.call_claude(
            prompt_name=flow_arch_prompt,
            user_message=flow_arch_content,
            parse_json=True
        )
        
        flow_architecture = flow_arch_response["json"]
        
        # Send flow architecture to client immediately
        await websocket.send_json({
            "type": "flow_architecture",
            "data": flow_architecture
        })
        
        # Generate UI for each screen in parallel
        async def generate_screen_ui(screen, screen_index):
            try:
                await send_progress(websocket, "generating_screen", f"Generating screen: {screen['name']}...", {
                    "screen_id": screen['screen_id'],
                    "screen_name": screen['name']
                })
                
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
                
                # Build base message
                screen_message = f"TASK: {screen['task_description']}\n\nDEVICE CONTEXT:\n{json.dumps(device_info, indent=2)}\n\nFLOW CONTEXT:\n{json.dumps(flow_context, indent=2)}"
                
                # PARAMETRIC MODE ROUTING
                rendering_mode = project.get('rendering_mode', 'react')
                
                if rendering_mode == 'parametric':
                    # Use ParametricGenerator for parametric mode
                    print(f"  🎛️  PARAMETRIC MODE: Generating screen with variation dimensions...")
                    
                    parametric_generator = ParametricGenerator(llm)
                    
                    try:
                        parametric_result = await parametric_generator.generate(
                            task_description=screen['task_description'],
                            dtm=dtm or {},
                            device_info=device_info,
                            screen_context=screen
                        )
                        
                        ui_code = parametric_result['ui_code']
                        variation_space = parametric_result['variation_space']
                        
                        print(f"  ✓ Parametric generation complete with {len(variation_space['dimensions'])} dimensions")
                        
                        # Send screen completion with variation_space
                        await websocket.send_json({
                            "type": "screen_ready",
                            "data": {
                                "screen_id": screen['screen_id'],
                                "ui_code": ui_code,
                                "variation_space": variation_space
                            }
                        })
                        
                        # Update flow architecture
                        for s in flow_architecture['screens']:
                            if s['screen_id'] == screen['screen_id']:
                                s['ui_code'] = ui_code
                                s['variation_space'] = variation_space
                                s['ui_loading'] = False
                                break
                        
                        return {
                            "screen_id": screen['screen_id'],
                            "ui_code": ui_code,
                            "variation_space": variation_space
                        }
                        
                    except Exception as e:
                        print(f"Error in parametric generation: {e}")
                        import traceback
                        traceback.print_exc()
                        
                        await websocket.send_json({
                            "type": "screen_error",
                            "data": {
                                "screen_id": screen['screen_id'],
                                "error": str(e)
                            }
                        })
                        
                        for s in flow_architecture['screens']:
                            if s['screen_id'] == screen['screen_id']:
                                s['ui_error'] = True
                                s['ui_loading'] = False
                                break
                        
                        return {
                            "screen_id": screen['screen_id'],
                            "ui_code": None,
                            "error": str(e)
                        }
                
                # REACT MODE (existing code continues below)
                # Add reference mode and screen description if from user-provided screen
                user_provided = screen.get('user_provided', False)
                reference_mode = screen.get('reference_mode')
                screen_desc = screen.get('description', '')
                
                if user_provided and screen_desc:
                    screen_message += f"\n\nSCREEN DESCRIPTION: {screen_desc}"
                
                if reference_mode:
                    screen_message += f"\n\nREFERENCE MODE: {reference_mode}"
                    
                    # Load screen reference files if available
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
                                
                                # Note: reference images will be added as image blocks below
                            except Exception as e:
                                print(f"Error loading screen {user_screen_index} reference files: {e}")
                
                # Determine which prompt to use based on reference mode
                if reference_mode == "exact":
                    # Exact mode: Use exact recreation prompt (no DTM)
                    prompt_name = "generate_ui_exact_recreation"
                    screen_content = [
                        {"type": "text", "text": screen_message}
                    ]
                    
                    # Add reference files for exact mode
                    if reference_mode and user_screen_index is not None and screen_definitions:
                        screen_def = screen_definitions[user_screen_index]
                        has_figma = screen_def.get('has_figma', False)
                        image_count = screen_def.get('image_count', 0)
                        
                        if has_figma or image_count > 0:
                            try:
                                ref_files = storage.get_screen_reference_files(
                                    user_id, project_id, user_screen_index, has_figma, image_count
                                )
                                
                                # Add figma data
                                if ref_files.get('figma_data'):
                                    compressed_figma = prepare_figma_for_llm(ref_files['figma_data'], max_depth=6)
                                    screen_content.append({
                                        "type": "text",
                                        "text": f"\nReference Figma Data:\n{compressed_figma}"
                                    })
                                
                                # Add images
                                for img in ref_files.get('images', []):
                                    screen_content.append({
                                        "type": "image",
                                        "source": {
                                            "type": "base64",
                                            "media_type": img.get('media_type', 'image/png'),
                                            "data": img['data']
                                        }
                                    })
                            except Exception as e:
                                print(f"Error loading screen {user_screen_index} reference files: {e}")
                
                elif reference_mode == "rethink":
                    # RETHINK MODE: Use rethink-specific prompt with strategic context
                    prompt_name = "generate_ui_rethink"
                    screen_content = [
                        {"type": "text", "text": screen_message}
                    ]
                    
                    # Add rethink context (strategic structure + DTM)
                    if rethink_data:
                        rethink_ui_context = rethink_processor.prepare_rethink_for_ui_generation(
                            rethink_data, screen['task_description'], device_info
                        )
                        screen_content.append({
                            "type": "text",
                            "text": f"\n\n{rethink_ui_context}"
                        })
                    
                    # Note: DTM is included in rethink context, no need to add separately
                
                else:
                    # Redesign or Inspiration mode: Use taste-based prompt (with DTM)
                    prompt_name = "generate_ui_with_taste"
                    screen_content = [
                        {"type": "text", "text": screen_message}
                    ]
                    
                    if dtm_guidance:
                        screen_content.append({"type": "text", "text": f"\n\n{dtm_guidance}"})
                    
                    # Add reference images based on mode
                    if reference_mode == "redesign" and user_screen_index is not None:
                        # REDESIGN MODE: Use wireframe processing to strip all styling
                        screen_def = screen_definitions[user_screen_index]
                        image_count = screen_def.get('image_count', 0)
                        has_figma = screen_def.get('has_figma', False)
                        
                        if has_figma or image_count > 0:
                            try:
                                print(f"\n  ⚙️  REDESIGN MODE: Processing wireframes for screen {user_screen_index}...")
                                
                                # Load reference files
                                ref_files = storage.get_screen_reference_files(
                                    user_id, project_id, user_screen_index, has_figma, image_count
                                )
                                
                                # Process into wireframes (strips all styling)
                                wireframe_data = await process_redesign_references(
                                    ref_files,
                                    llm
                                )
                                
                                if wireframe_data.get('has_wireframes'):
                                    # Add wireframe Figma data if available
                                    if wireframe_data.get('wireframe_figma'):
                                        wireframe_json = prepare_wireframe_for_llm(
                                            wireframe_data['wireframe_figma'],
                                            max_depth=6
                                        )
                                        screen_content.append({
                                            "type": "text",
                                            "text": f"\n{wireframe_json}"
                                        })
                                    
                                    # Add wireframe descriptions and images
                                    for idx, (description, wireframe_img) in enumerate(zip(
                                        wireframe_data.get('wireframe_descriptions', []),
                                        wireframe_data.get('wireframe_images', [])
                                    )):
                                        # Add text description
                                        screen_content.append({
                                            "type": "text",
                                            "text": f"\n### Wireframe Structure (Image {idx + 1}):\n\n{description}\n"
                                        })
                                        
                                        # Add wireframe image
                                        screen_content.append({
                                            "type": "image",
                                            "source": {
                                                "type": "base64",
                                                "media_type": wireframe_img.get('media_type', 'image/png'),
                                                "data": wireframe_img['data']
                                            }
                                        })
                                    
                                    # Add explicit redesign mode instruction
                                    screen_content.append({
                                        "type": "text",
                                        "text": "\n\n**REDESIGN MODE ACTIVE**: The above wireframes show ONLY structure and content. All styling has been removed. Your task is to preserve the component types, text labels, and layout arrangement exactly, but apply DTM styling completely. Do not try to recreate any visual styling from the wireframes.\n"
                                    })
                                    
                                    print(f"  ✓ Wireframe processing complete!")
                                else:
                                    print(f"  ⚠️  No wireframes extracted, proceeding without reference")
                                
                            except Exception as e:
                                print(f"Error processing wireframes for screen {user_screen_index}: {e}")
                                import traceback
                                traceback.print_exc()
                    elif reference_mode == "inspiration":
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
                        # No reference mode or null - use general inspiration images
                        for img in inspiration_images:
                            screen_content.append({
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": img.get('media_type', 'image/png'),
                                    "data": img['data']
                                }
                            })
                
                # Use progressive streaming with checkpoints
                result = await generate_screen_ui_progressive(
                    screen=screen,
                    screen_index=screen_index,
                    llm=llm,
                    websocket=websocket,
                    prompt_name=prompt_name,
                    screen_content=screen_content,
                    device_info=device_info
                )
                
                return result
            
            except Exception as e:
                await websocket.send_json({
                    "type": "screen_error",
                    "data": {
                        "screen_id": screen['screen_id'],
                        "error": str(e)
                    }
                })
                return {"screen_id": screen['screen_id'], "ui_code": None, "error": str(e)}
        
        # Run all screen generations in parallel
        screen_tasks = [
            generate_screen_ui(screen, i)
            for i, screen in enumerate(flow_architecture['screens'])
        ]
        screen_results = await asyncio.gather(*screen_tasks)
        
        # Merge results into flow architecture
        for result in screen_results:
            for screen in flow_architecture['screens']:
                if screen['screen_id'] == result['screen_id']:
                    screen['ui_code'] = result['ui_code']
                    if result.get('variation_space'):
                        screen['variation_space'] = result['variation_space']
                    if result.get('error'):
                        screen['ui_error'] = True
                    break
        
        # Calculate layout positions
        await send_progress(websocket, "calculating_layout", "Calculating screen positions...")
        
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
                    assign_depth(next_id, depth + 1)
            
            assign_depth(entry_id, 0)
            
            for screen in screens:
                if screen['screen_id'] not in depths:
                    depths[screen['screen_id']] = max(depths.values(), default=0) + 1
            
            level_groups = {}
            for screen_id, depth in depths.items():
                if depth not in level_groups:
                    level_groups[depth] = []
                level_groups[depth].append(screen_id)
            
            positions = {}
            HORIZONTAL_GAP = 800
            VERTICAL_GAP = 600
            
            for level, screen_ids in level_groups.items():
                x = level * HORIZONTAL_GAP
                total_height = len(screen_ids) * VERTICAL_GAP
                start_y = -total_height / 2
                
                for idx, screen_id in enumerate(screen_ids):
                    y = start_y + idx * VERTICAL_GAP
                    positions[screen_id] = {"x": x, "y": y}
            
            return positions
        
        layout_positions = calculate_layout(flow_architecture)
        flow_architecture['layout_positions'] = layout_positions
        
        # Save to S3
        await send_progress(websocket, "saving", "Saving flow...")
        current_version = project.get("metadata", {}).get("flow_version", 0)
        new_version = current_version + 1
        
        storage.put_project_flow(user_id, project_id, flow_architecture, version=new_version)
        
        # Update project metadata
        metadata = project.get("metadata", {})
        metadata["flow_version"] = new_version
        db.update_project(project_id, metadata=metadata)
        
        # Convert floats to Decimals for DynamoDB compatibility
        flow_architecture_for_db = convert_floats_to_decimals(flow_architecture)
        
        # Update project flow_graph
        db.update_project_flow_graph(project_id, flow_architecture_for_db)
        
        # Send completion (use original flow_architecture with floats for JSON response)
        await send_complete(websocket, {
            "status": "success",
            "flow_graph": flow_architecture,
            "version": new_version
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        await send_error(websocket, str(e))


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


async def handle_iterate_ui(websocket: WebSocket, data: Dict[str, Any], user_id: str):
    """
    Handle iterate-ui WebSocket request
    
    Flow:
    1. Route feedback to determine which screens need editing
    2. For each screen, apply feedback and generate updated code
    3. Save new version
    4. Send completion message
    """
    try:
        project_id = data.get("project_id")
        user_feedback = data.get("user_feedback", "")  # Can be empty if only annotations
        conversation_history = data.get("conversation_history", [])
        annotations = data.get("annotations", {})  # NEW: Dict of {screen_name: [annotations]}
        
        if not project_id:
            await send_error(websocket, "Missing project_id")
            return
        
        # Must have either feedback text OR annotations
        if not user_feedback and not annotations:
            await send_error(websocket, "Missing user_feedback or annotations")
            return
        
        # Get project
        await send_progress(websocket, "init", "Loading project...")
        project = db.get_project(project_id)
        
        if not project:
            await send_error(websocket, "Project not found")
            return
        
        # Get current flow graph and ensure Decimals are converted
        flow_graph = convert_decimals(project.get("flow_graph", {}))
        if not flow_graph or not flow_graph.get("screens"):
            await send_error(websocket, "No flow graph found. Generate initial design first.")
            return
        
        # Get current version
        current_version = project.get("metadata", {}).get("flow_version", 1)
        
        # Initialize services
        llm = get_llm_service()
        router = FeedbackRouter(llm)
        applier = FeedbackApplier(llm)
        
        # Step 1: Route feedback
        await send_progress(websocket, "routing", "Analyzing your feedback...")
        
        # Build flow summary for router
        flow_summary = [
            {
                "screen_id": screen["screen_id"],
                "name": screen.get("name", "Untitled"),
                "description": screen.get("description", "")
            }
            for screen in flow_graph["screens"]
        ]
        
        # Map screen names to screen IDs for annotations
        screen_name_to_id = {
            screen.get("name", "Untitled"): screen["screen_id"]
            for screen in flow_graph["screens"]
        }
        
        routing_result = await router.route_feedback(
            user_feedback=user_feedback,
            conversation_history=conversation_history,
            flow_summary=flow_summary,
            annotations=annotations  # NEW: Pass annotations
        )
        
        # Check if conversation only
        if routing_result.get("conversation_only", False):
            # No regeneration needed, just send response
            await websocket.send_json({
                "type": "conversation_response",
                "data": {
                    "response": routing_result.get("response", "I'm not sure what you'd like me to change. Could you be more specific?")
                }
            })
            await send_complete(websocket, {
                "status": "conversation_only",
                "response": routing_result.get("response", "")
            })
            return
        
        # Get screens to edit
        screens_to_edit = routing_result.get("screens_to_edit", [])
        
        if not screens_to_edit or len(screens_to_edit) == 0:
            await send_error(websocket, "No screens identified for editing")
            return
        
        # Notify frontend about routing completion
        await websocket.send_json({
            "type": "feedback_routing_complete",
            "data": {
                "screens_to_edit": [s["screen_id"] for s in screens_to_edit],
                "reasoning": routing_result.get("reasoning", "")
            }
        })
        
        # Load DTM for code generation
        taste_id = project.get("selected_taste_id")
        dtm = None
        
        if taste_id:
            try:
                dtm = storage.get_taste_dtm(user_id, taste_id)
            except:
                print("Warning: Could not load DTM, will use minimal defaults")
        
        if not dtm:
            # Use minimal DTM
            dtm = {
                "designer_systems": {
                    "spacing": {"default": 8},
                    "typography": {"common_sizes": [14, 16, 18, 24, 32]},
                    "color_system": {"common_palette": ["#1A1A2E", "#6C63FF", "#FFFFFF"]},
                    "form_language": {"common_radii": [4, 8, 16]}
                }
            }
        
        # Get device info
        device_info = project.get("device_info", {
            "platform": "web",
            "screen": {"width": 1440, "height": 900}
        })
        
        # Step 2: Apply feedback to each screen
        updated_screens = []
        
        for idx, screen_edit in enumerate(screens_to_edit):
            screen_id = screen_edit["screen_id"]
            screen_name = screen_edit.get("screen_name", "Untitled")  # Router should include this
            contextualized_feedback = screen_edit["contextualized_feedback"]
            screen_annotations = screen_edit.get("annotations", [])  # NEW: Get annotations for this screen
            
            # Find the screen in flow graph
            screen = next((s for s in flow_graph["screens"] if s["screen_id"] == screen_id), None)
            
            if not screen:
                print(f"Warning: Screen {screen_id} not found in flow graph")
                continue
            
            # Update screen_name from flow graph if not set
            if screen_name == "Untitled":
                screen_name = screen.get("name", "Untitled")
            
            # Notify start of screen iteration
            await websocket.send_json({
                "type": "screen_iteration_start",
                "data": {
                    "screen_id": screen_id,
                    "screen_name": screen_name,
                    "current_index": idx + 1,
                    "total_screens": len(screens_to_edit)
                }
            })
            
            # Get current code
            current_code = screen.get("ui_code", "")
            
            if not current_code:
                print(f"Warning: Screen {screen_id} has no code")
                continue
            
            # Build flow context
            flow_context = {
                "screen_id": screen_id,
                "screen_name": screen_name,
                "position_in_flow": next(
                    (i + 1 for i, s in enumerate(flow_graph["screens"]) if s["screen_id"] == screen_id),
                    1
                ),
                "total_screens": len(flow_graph["screens"]),
                "outgoing_transitions": [
                    t for t in flow_graph.get("transitions", [])
                    if t.get("from_screen_id") == screen_id
                ]
            }
            
            # Apply feedback and stream updates
            conversation_chunks = []
            code_chunks = []
            delimiter_detected = False
            
            async for chunk_data in applier.apply_feedback(
                current_code=current_code,
                contextualized_feedback=contextualized_feedback,
                dtm=dtm,
                flow_context=flow_context,
                device_info=device_info,
                annotations=screen_annotations  # NEW: Pass annotations
            ):
                chunk_type = chunk_data.get("type")
                
                if chunk_type == "conversation":
                    # Stream conversation chunk to frontend
                    chunk_text = chunk_data.get("chunk", "")
                    conversation_chunks.append(chunk_text)
                    
                    await websocket.send_json({
                        "type": "screen_conversation_chunk",
                        "data": {
                            "screen_id": screen_id,
                            "chunk": chunk_text
                        }
                    })
                
                elif chunk_type == "delimiter_detected":
                    # Delimiter found, notify frontend to show "generating" state
                    delimiter_detected = True
                    
                    await websocket.send_json({
                        "type": "screen_generating",
                        "data": {
                            "screen_id": screen_id,
                            "screen_name": screen_name,  # ✅ ADD: Send screen_name for display
                            "message": "Generating updated code..."
                        }
                    })
                
                elif chunk_type == "code":
                    # Accumulate code chunks (don't send to frontend yet)
                    code_chunks.append(chunk_data.get("chunk", ""))
                
                elif chunk_type == "complete":
                    # Final complete response
                    full_conversation = chunk_data.get("conversation", "")
                    full_code = chunk_data.get("code", "")
                    
                    # Update screen in flow graph
                    screen["ui_code"] = full_code
                    
                    # Send updated screen to frontend
                    await websocket.send_json({
                        "type": "screen_updated",
                        "data": {
                            "screen_id": screen_id,
                            "ui_code": full_code,
                            "conversation": full_conversation
                        }
                    })
                    
                    updated_screens.append({
                        "screen_id": screen_id,
                        "screen_name": screen_name
                    })
        
        # Step 3: Generate final summary
        await send_progress(websocket, "summarizing", "Finalizing changes...")
        
        # Build summary message
        screen_names = [s["screen_name"] for s in updated_screens]
        if len(screen_names) == 1:
            summary = f"Updated the {screen_names[0]} screen based on your feedback."
        elif len(screen_names) == 2:
            summary = f"Updated the {screen_names[0]} and {screen_names[1]} screens."
        else:
            summary = f"Updated {len(screen_names)} screens: {', '.join(screen_names[:-1])}, and {screen_names[-1]}."
        
        # Step 4: Save new version
        await send_progress(websocket, "saving", "Saving new version...")
        
        new_version = current_version + 1
        
        # ✅ FIX: Save to S3 FIRST (before converting to Decimals)
        # S3 requires regular Python types (float/int) for JSON serialization
        storage.put_project_flow(user_id, project_id, flow_graph, version=new_version)
        
        # Update metadata
        metadata = project.get("metadata", {})
        metadata["flow_version"] = new_version
        db.update_project(project_id, metadata=metadata)
        
        # ✅ FIX: THEN convert to Decimals for DynamoDB
        # DynamoDB requires Decimal type for numbers
        flow_graph_for_db = convert_floats_to_decimals(flow_graph)
        
        # Update DynamoDB with Decimal version
        db.update_project_flow_graph(project_id, flow_graph_for_db)
        
        # Step 5: Send completion
        await websocket.send_json({
            "type": "iteration_complete",
            "data": {
                "summary": summary,
                "screens_updated": [s["screen_id"] for s in updated_screens],
                "new_version": new_version
            }
        })
        
        # ✅ FIX: Ensure flow_graph has no Decimals before sending to frontend
        await send_complete(websocket, {
            "status": "success",
            "flow_graph": convert_decimals(flow_graph),
            "version": new_version,
            "screens_updated": len(updated_screens)
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        await send_error(websocket, str(e))


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
            elif action == "generate-flow":
                await handle_generate_flow(websocket, data, user_id)
            elif action == "iterate-ui":
                await handle_iterate_ui(websocket, data, user_id)
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