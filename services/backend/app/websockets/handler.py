"""
WebSocket Handler for Long-Running LLM Operations - V3
Updated to use NEW DTR/DTM system (S3-based, Pass 6/7)
Supports default taste-driven generation (Phase 1 focus)
"""
import json
import base64
import re
from decimal import Decimal
from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, Any, List, Optional

from app.llm import get_llm_service
from app.llm.types import Message, MessageRole
from app.core import db, storage
from app.core.db import convert_decimals  # Import for Decimal conversion

# Generation imports
from app.generation.orchestrator import GenerationOrchestrator
from app.generation.parametric import ParametricGenerator

# NEW DTM/DTR imports (S3-based system)
from app.dtm import builder as dtm_builder
from app.dtm import storage as dtm_storage
from app.dtr import storage as dtr_storage

# PHASE 2: Reference modes (commented out for Phase 1)
# from app.generation.reference_modes.redesign.wireframe_processor import process_redesign_references
# from app.generation.reference_modes.rethink.processor import RethinkProcessor

# Import progressive streaming
from app.generation.streaming import generate_screen_ui_progressive

from app.feedback.router import FeedbackRouter
from app.feedback.applier import FeedbackApplier

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
    Handle build-dtr WebSocket request using NEW Passes 1-4 extraction
    
    Runs all four passes in parallel:
    - Pass 1: Structural Skeleton
    - Pass 2: Surface Treatment
    - Pass 3: Typography System
    - Pass 4: Image Usage Patterns
    """
    try:
        # Extract parameters
        resource_id = data.get("resource_id")
        taste_id = data.get("taste_id")
        
        if not resource_id:
            await send_error(websocket, "resource_id is required")
            return
        
        if not taste_id:
            await send_error(websocket, "taste_id is required")
            return
        
        # Get resource from database
        await send_progress(websocket, "init", "Loading resource...")
        resource = db.get_resource(resource_id)
        
        if not resource:
            await send_error(websocket, f"Resource {resource_id} not found")
            return
        
        # Verify ownership
        if resource.get("owner_id") != user_id:
            await send_error(websocket, "Access denied")
            return
        
        # Check if files are uploaded
        has_figma = resource.get("has_figma", False)
        has_image = resource.get("has_image", False)
        
        if not has_figma and not has_image:
            await send_error(websocket, "Resource has no files uploaded. Please upload at least one file.")
            return
        
        # Send progress: Downloading files
        await send_progress(websocket, "download", "Downloading resource files from S3...")
        
        # Download files from S3
        figma_json = None
        image_bytes = None
        image_format = "png"
        
        if has_figma:
            figma_key = resource.get("figma_key")
            if figma_key:
                try:
                    print(f"Downloading Figma JSON from S3: {figma_key}")
                    figma_obj = storage.s3_client.get_object(
                        Bucket=storage.S3_BUCKET,
                        Key=figma_key
                    )
                    figma_content = figma_obj['Body'].read()
                    figma_json = json.loads(figma_content)
                    print(f"✅ Downloaded Figma JSON ({len(figma_content)} bytes)")
                except Exception as e:
                    print(f"❌ Failed to download Figma JSON: {e}")
                    # Continue anyway if we have image
        
        if has_image:
            image_key = resource.get("image_key")
            if image_key:
                try:
                    print(f"Downloading image from S3: {image_key}")
                    image_obj = storage.s3_client.get_object(
                        Bucket=storage.S3_BUCKET,
                        Key=image_key
                    )
                    image_bytes = image_obj['Body'].read()
                    
                    # Detect format
                    if image_key.endswith('.jpg') or image_key.endswith('.jpeg'):
                        image_format = "jpeg"
                    elif image_key.endswith('.webp'):
                        image_format = "webp"
                    else:
                        image_format = "png"
                    
                    print(f"✅ Downloaded image ({len(image_bytes)} bytes, format: {image_format})")
                except Exception as e:
                    print(f"❌ Failed to download image: {e}")
                    # Continue anyway if we have Figma
        
        # Verify at least one file downloaded
        if figma_json is None and image_bytes is None:
            await send_error(websocket, "Failed to download files from S3")
            return
        
        # Send progress: Starting extraction
        await send_progress(websocket, "extraction", "Starting DTR extraction...")
        
        # Progress callback for extraction pipeline
        async def progress_callback(stage: str, message: str):
            await send_progress(websocket, stage, message)
        
        # Run Passes 1-4 in parallel (they're independent)
        from app.dtr import extract_pass_1_only, extract_pass_2_only, extract_pass_3_only, extract_pass_4_only, extract_pass_5_only
        import asyncio
        
        print(f"Starting Passes 1-5 extraction in parallel for resource {resource_id}")
        
        # Run all five passes concurrently
        pass_1_task = extract_pass_1_only(
            resource_id=resource_id,
            taste_id=taste_id,
            figma_json=figma_json,
            image_bytes=image_bytes,
            image_format=image_format,
            progress_callback=progress_callback
        )
        
        pass_2_task = extract_pass_2_only(
            resource_id=resource_id,
            taste_id=taste_id,
            figma_json=figma_json,
            image_bytes=image_bytes,
            image_format=image_format,
            progress_callback=progress_callback
        )
        
        pass_3_task = extract_pass_3_only(
            resource_id=resource_id,
            taste_id=taste_id,
            figma_json=figma_json,
            image_bytes=image_bytes,
            image_format=image_format,
            progress_callback=progress_callback
        )
        
        pass_4_task = extract_pass_4_only(
            resource_id=resource_id,
            taste_id=taste_id,
            figma_json=figma_json,
            image_bytes=image_bytes,
            image_format=image_format,
            progress_callback=progress_callback
        )
        
        pass_5_task = extract_pass_5_only(
            resource_id=resource_id,
            taste_id=taste_id,
            figma_json=figma_json,
            image_bytes=image_bytes,
            image_format=image_format,
            progress_callback=progress_callback
        )
        
        # Wait for all five to complete
        pass_1_result, pass_2_result, pass_3_result, pass_4_result, pass_5_result = await asyncio.gather(
            pass_1_task, 
            pass_2_task,
            pass_3_task,
            pass_4_task,
            pass_5_task
        )
        
        print(f"✅ Pass 1 extraction completed!")
        print(f"   Authority: {pass_1_result.get('authority')}")
        print(f"   Confidence: {pass_1_result.get('confidence')}")
        print(f"   Layout type: {pass_1_result.get('layout', {}).get('type')}")
        
        print(f"✅ Pass 2 extraction completed!")
        print(f"   Authority: {pass_2_result.get('authority')}")
        print(f"   Confidence: {pass_2_result.get('confidence')}")
        print(f"   Colors found: {len(pass_2_result.get('colors', {}).get('exact_palette', []))}")
        
        print(f"✅ Pass 3 extraction completed!")
        print(f"   Authority: {pass_3_result.get('authority')}")
        print(f"   Confidence: {pass_3_result.get('confidence')}")
        print(f"   Families found: {len(pass_3_result.get('families', []))}")
        
        print(f"✅ Pass 4 extraction completed!")
        print(f"   Authority: {pass_4_result.get('authority')}")
        print(f"   Confidence: {pass_4_result.get('confidence')}")
        print(f"   Has images: {pass_4_result.get('has_images')}")
        print(f"   Image density: {pass_4_result.get('image_density')}")
        print(f"   Placements found: {len(pass_4_result.get('placements', []))}")
        
        print(f"✅ Pass 5 extraction completed!")
        print(f"   Authority: {pass_5_result.get('authority')}")
        print(f"   Confidence: {pass_5_result.get('confidence')}")
        print(f"   Components found: {pass_5_result.get('total_components')}")
        print(f"   Variants found: {pass_5_result.get('total_variants')}")
        
        # NOW run Pass 6 (personality synthesis) - depends on Pass 1-5
        print(f"🎨 Starting Pass 6: Personality synthesis...")
        await send_progress(websocket, "pass-6", "Synthesizing complete DTR...")
        
        from app.dtr import extract_pass_6_only
        
        pass_6_result = await extract_pass_6_only(
            resource_id=resource_id,
            taste_id=taste_id,
            image_bytes=image_bytes,
            image_format=image_format,
            progress_callback=progress_callback
        )
        
        print(f"✅ Pass 6 extraction completed!")
        print(f"   Authority: {pass_6_result.get('authority')}")
        print(f"   Confidence: {pass_6_result.get('confidence')}")
        print(f"   Obsessions detected: {len(pass_6_result.get('personality', {}).get('signature_obsessions', []))}")
        print(f"   Rule-breaking patterns: {len(pass_6_result.get('personality', {}).get('deliberate_rule_breaking', []))}")
        print(f"   Quality tier: base")
        
        # ====================================================================
        # UPDATE DATABASE: Mark resource as having DTR
        # ====================================================================
        print(f"📝 Updating database: Setting has_dtr = True for resource {resource_id}")
        try:
            resource = db.get_resource(resource_id)
            if resource:
                metadata = resource.get("metadata", {})
                metadata["has_dtr"] = True
                # Update only the metadata field (don't use return value)
                db.update_resource(resource_id=resource_id, metadata=metadata)
                print(f"✅ Database updated: has_dtr = True")
            else:
                print(f"⚠️  Warning: Resource {resource_id} not found in database")
        except Exception as e:
            print(f"⚠️  Warning: Failed to update database: {e}")
            import traceback
            print(f"Traceback: {traceback.format_exc()}")
            # Don't fail the whole process if DB update fails
        
        # ====================================================================
        # TRIGGER DTM BUILD (Pass 7) if taste has 2+ resources
        # ====================================================================
        print(f"\n{'='*70}")
        print(f"Checking if DTM build needed for taste {taste_id}...")
        print(f"{'='*70}\n")
        
        # Create LLM service for DTM synthesis
        llm = get_llm_service()
        
        dtm_result = await build_dtm_for_taste(
            taste_id=taste_id,
            llm=llm,
            websocket=websocket
        )
        
        if dtm_result.get("status") == "success":
            print(f"✅ DTM built successfully!")
            print(f"   Resource count: {dtm_result.get('total_resources')}")
            print(f"   Confidence: {dtm_result.get('confidence')}")
        elif dtm_result.get("status") == "skipped":
            print(f"ℹ️  DTM build skipped: {dtm_result.get('reason')}")
        else:
            print(f"⚠️  DTM build failed: {dtm_result.get('error')}")
        
        # Send completion AFTER DTM (or skip it - DTM sends its own messages)
        await send_complete(websocket, {
            "status": "success",
            "resource_id": resource_id,
            "taste_id": taste_id,
            "pass_1_completed": True,
            "pass_2_completed": True,
            "pass_3_completed": True,
            "pass_4_completed": True,
            "pass_5_completed": True,
            "pass_6_completed": True,
            "pass_1_authority": pass_1_result.get("authority"),
            "pass_1_confidence": pass_1_result.get("confidence"),
            "pass_2_authority": pass_2_result.get("authority"),
            "pass_2_confidence": pass_2_result.get("confidence"),
            "pass_3_authority": pass_3_result.get("authority"),
            "pass_3_confidence": pass_3_result.get("confidence"),
            "pass_4_authority": pass_4_result.get("authority"),
            "pass_4_confidence": pass_4_result.get("confidence"),
            "pass_5_authority": pass_5_result.get("authority"),
            "pass_5_confidence": pass_5_result.get("confidence"),
            "pass_6_authority": pass_6_result.get("authority"),
            "pass_6_confidence": pass_6_result.get("confidence"),
            "quality_tier": "base",  # Pass 6 completion achieves base tier
            "extraction_time_ms": (
                pass_1_result.get("extraction_time_ms", 0) + 
                pass_2_result.get("extraction_time_ms", 0) +
                pass_3_result.get("extraction_time_ms", 0) +
                pass_4_result.get("extraction_time_ms", 0) +
                pass_5_result.get("extraction_time_ms", 0)
            ),
            "layout_type": pass_1_result.get("layout", {}).get("type"),
            "spacing_quantum": pass_1_result.get("spacing", {}).get("quantum"),
            "colors_count": len(pass_2_result.get("colors", {}).get("exact_palette", [])),
            "families_count": len(pass_3_result.get("families", [])),
            "has_images": pass_4_result.get("has_images"),
            "image_density": pass_4_result.get("image_density"),
            "placements_count": len(pass_4_result.get("placements", []))
        })

        
    except Exception as e:
        import traceback
        error_msg = f"Extraction failed: {str(e)}"
        print(f"❌ ERROR in build-dtr: {traceback.format_exc()}")
        await send_error(websocket, error_msg)


async def build_dtm_for_taste(
    taste_id: str,
    llm,
    websocket: WebSocket
) -> Dict[str, Any]:
    """
    Build DTM from all resources in a taste (Pass 7)
    - 1 resource: Skip (just use DTR)
    - 2+ resources: Build/rebuild DTM
    """
    
    # Count resources with DTRs (DB is now source of truth)
    resources = db.list_resources_for_taste(taste_id)
    resource_ids = [
        r["resource_id"] 
        for r in resources 
        if r.get("metadata", {}).get("has_dtr")
    ]
    
    total_dtrs = len(resource_ids)
    
    print(f"📊 DTM Check: Found {total_dtrs} resources with DTRs (from database)")
    print(f"   Resource IDs: {resource_ids}")
    
    # CASE 1: Only 1 resource → Skip
    if total_dtrs < 2:
        print(f"ℹ️  Skipping DTM build - need at least 2 resources, have {total_dtrs}")
        return {
            "status": "skipped",
            "reason": "Need at least 2 resources to build DTM",
            "total_resources": total_dtrs
        }
    
    # CASE 2: 2+ resources → Build/rebuild DTM
    print(f"✅ Building DTM for {total_dtrs} resources")
    await send_progress(
        websocket,
        "building_dtm",
        f"Building DTM from {total_dtrs} resources...",
        {"resource_count": total_dtrs}
    )
    
    try:
        # Synthesize DTM (Pass 7)
        dtm = await dtm_synthesizer.synthesize_dtm(
            taste_id=taste_id,
            resource_ids=resource_ids,
            llm=llm,
            priority_mode=False  # Use all resources equally
        )
        
        await send_progress(
            websocket,
            "dtm_complete",
            f"DTM built successfully from {total_dtrs} resources"
        )
        
        # ====================================================================
        # UPDATE DATABASE: Mark taste as having DTM
        # ====================================================================
        print(f"📝 Updating database: Setting has_dtm = True for taste {taste_id}")
        try:
            taste = db.get_taste(taste_id)
            if taste:
                metadata = taste.get("metadata", {})
                metadata["has_dtm"] = True
                metadata["dtm_resource_count"] = len(resource_ids)
                metadata["dtm_last_updated"] = dtm.created_at
                metadata["needs_dtm_rebuild"] = False  # Clear rebuild flag
                db.update_taste(taste_id, metadata=metadata)
                print(f"✅ Database updated: has_dtm = True, needs_dtm_rebuild = False")
            else:
                print(f"⚠️  Warning: Taste {taste_id} not found in database")
        except Exception as e:
            print(f"⚠️  Warning: Failed to update database: {e}")
            # Don't fail the whole process if DB update fails
        
        return {
            "status": "success",
            "dtm_id": dtm.taste_id,
            "total_resources": len(resource_ids),
            "confidence": dtm.generation_guidance.confidence_by_domain.get("overall", 0.75)
        }
        
    except Exception as e:
        import traceback
        error_msg = f"DTM build failed: {str(e)}"
        print(f"❌ DTM ERROR: {traceback.format_exc()}")
        
        # Send dtm_error progress stage for better frontend handling
        await send_progress(
            websocket,
            "dtm_error",
            error_msg
        )
        
        # Also send error message for WebSocket error handling
        await send_error(websocket, error_msg)
        
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
                prompt_name=get_prompt_name("generate_ui_v2"),
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
    """
    Handle generate-flow WebSocket request - PHASE 1 NEW SYSTEM
    
    Flow:
    1. Load project from DB
    2. Load DTM via new builder (subset or full)
    3. Generate flow architecture
    4. Generate each screen with new 4-layer taste system
    5. Validate taste adherence
    6. Stream progressive updates to frontend
    """
    import asyncio
    
    try:
        project_id = data.get("project_id")
        
        if not project_id:
            await send_error(websocket, "Missing project_id")
            return
        
        # ============================================================================
        # STEP 1: Load Project
        # ============================================================================
        
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
        selected_taste_id = project.get("selected_taste_id")
        selected_resource_ids = project.get("selected_resource_ids", [])
        rendering_mode = project.get("rendering_mode", "react")
        
        if not device_info:
            await send_error(websocket, "Device info required")
            return
        
        print(f"\n{'='*80}")
        print(f"GENERATE FLOW - NEW SYSTEM")
        print(f"{'='*80}")
        print(f"Project ID: {project_id}")
        print(f"Task: {task_description[:100]}...")
        print(f"Taste ID: {selected_taste_id}")
        print(f"Resources: {len(selected_resource_ids) if selected_resource_ids else 'all'}")
        print(f"Device: {device_info.get('platform')} {device_info.get('screen', {}).get('width')}x{device_info.get('screen', {}).get('height')}")
        print(f"Max screens: {max_screens}")
        print(f"{'='*80}\n")
        
        # ============================================================================
        # STEP 2: Load DTM via NEW Builder
        # ============================================================================
        
        await send_progress(websocket, "loading_dtm", "Loading designer taste model...")
        
        dtm = None
        taste_source = "full_dtm"  # Default
        
        if selected_taste_id:
            try:
                print("🎨 Loading DTM via new builder...")
                
                dtm_result = await dtm_builder.get_or_build_dtm(
                    taste_id=selected_taste_id,
                    resource_ids=selected_resource_ids,
                    mode="auto"
                )
                
                # Convert Pydantic model to dict for easier access
                dtm_model = dtm_result["dtm"]
                dtm = dtm_model.model_dump() if hasattr(dtm_model, 'model_dump') else dtm_model
                taste_source = dtm_result["mode"]  # "dtr", "subset", or "full"
                
                print(f"  ✓ DTM loaded successfully")
                print(f"    Mode: {taste_source}")
                print(f"    Cached: {dtm_result.get('was_cached', False)}")
                if selected_resource_ids:
                    print(f"    Prioritized resources: {len(selected_resource_ids)}")
                
            except Exception as e:
                print(f"  ✗ Warning: Could not load DTM: {e}")
                import traceback
                traceback.print_exc()
                # Continue without DTM (will generate generic UI)
        
        # ============================================================================
        # STEP 3: Generate Flow Architecture
        # ============================================================================
        
        await send_progress(websocket, "generating_architecture", "Designing flow architecture...")
        
        llm = get_llm_service()
        
        print("\n🏗️  Generating flow architecture...")
        
        flow_architecture = await generate_flow_architecture_default(
            llm=llm,
            task_description=task_description,
            dtm=dtm,
            device_info=device_info,
            max_screens=max_screens
        )
        
        print(f"  ✓ Flow architecture complete")
        print(f"    Flow: {flow_architecture.get('flow_name')}")
        print(f"    Screens: {len(flow_architecture.get('screens', []))}")
        
        # Send architecture to client
        await send_progress(
            websocket,
            "architecture_complete",
            "Flow architecture ready",
            data={
                "flow_name": flow_architecture.get("flow_name"),
                "display_title": flow_architecture.get("display_title"),
                "display_description": flow_architecture.get("display_description"),
                "screens": [
                    {
                        "screen_id": s["screen_id"],
                        "name": s["name"],
                        "description": s.get("description", "")
                    }
                    for s in flow_architecture.get("screens", [])
                ]
            }
        )
        
        # ============================================================================
        # STEP 4: Generate Each Screen
        # ============================================================================
        
        screens = flow_architecture.get("screens", [])
        transitions = flow_architecture.get("transitions", [])
        
        orchestrator = GenerationOrchestrator(llm, storage)
        
        print(f"\n🎨 Generating {len(screens)} screens...")
        
        for idx, screen in enumerate(screens):
            screen_id = screen["screen_id"]
            screen_name = screen["name"]
            screen_task = screen.get("task_description", screen.get("description", ""))
            
            print(f"\n  [{idx+1}/{len(screens)}] Generating: {screen_name}")
            
            await send_progress(
                websocket,
                "generating_screen",
                f"Generating {screen_name}...",
                data={"screen_id": screen_id, "progress": idx + 1, "total": len(screens)}
            )
            
            # Build flow context for this screen
            outgoing_transitions = [
                t for t in transitions if t.get("from_screen_id") == screen_id
            ]
            
            flow_context = {
                "flow_name": flow_architecture.get("flow_name"),
                "screen_id": screen_id,
                "screen_name": screen_name,
                "position_in_flow": idx + 1,
                "total_screens": len(screens),
                "outgoing_transitions": outgoing_transitions
            }
            
            try:
                # Generate screen using NEW orchestrator with 4-layer system
                result = await orchestrator.generate_ui(
                    task_description=screen_task,
                    taste_data=dtm if dtm else {},
                    taste_source=taste_source,
                    device_info=device_info,
                    flow_context=flow_context,
                    rendering_mode=rendering_mode,
                    model="claude-sonnet-4.5",
                    validate_taste=bool(dtm)  # Only validate if we have DTM
                )
                
                ui_code = result["code"]
                validation = result.get("validation")
                metadata = result.get("metadata", {})
                
                # Calculate fidelity score if validation available
                fidelity_score = None
                if validation:
                    from app.generation.validator import TasteValidator
                    validator = TasteValidator(dtm)
                    fidelity_score = validator.get_fidelity_score(validation)
                    
                    print(f"    Fidelity: {fidelity_score:.1f}%")
                    if validation.violations:
                        print(f"    Violations: {len(validation.violations)}")
                
                # Save to DynamoDB
                db.save_screen(
                    project_id=project_id,
                    screen_id=screen_id,
                    screen_data={
                        "screen_id": screen_id,
                        "name": screen_name,
                        "description": screen.get("description", ""),
                        "ui_code": ui_code,
                        "device_info": device_info,
                        "task_description": screen_task,
                        "metadata": {
                            "taste_source": taste_source,
                            "taste_fidelity_score": fidelity_score,
                            "validation_stats": validation.stats if validation else None,
                            "model": metadata.get("model"),
                            "prompt_length": metadata.get("prompt_length"),
                        }
                    }
                )
                
                print(f"    ✓ Screen saved to DB")
                
                # Send screen to client
                await websocket.send_json({
                    "type": "screen_complete",
                    "screen_id": screen_id,
                    "screen_name": screen_name,
                    "ui_code": ui_code,
                    "validation": {
                        "passed": validation.passed if validation else True,
                        "fidelity_score": fidelity_score,
                        "violations_count": len(validation.violations) if validation else 0
                    } if validation else None
                })
                
            except Exception as e:
                print(f"    ✗ Error generating screen: {e}")
                import traceback
                traceback.print_exc()
                
                # Send error but continue with other screens
                await websocket.send_json({
                    "type": "screen_error",
                    "screen_id": screen_id,
                    "screen_name": screen_name,
                    "error": str(e)
                })
        
        # ============================================================================
        # STEP 5: Save Flow Architecture
        # ============================================================================
        
        db.update_project(
            project_id=project_id,
            updates={
                "flow_architecture": flow_architecture,
                "status": "completed"
            }
        )
        
        print(f"\n✅ Flow generation complete!")
        print(f"{'='*80}\n")
        
        # Send completion
        await websocket.send_json({
            "type": "complete",
            "message": "Flow generation complete",
            "project_id": project_id,
            "screens_generated": len(screens)
        })
        
    except Exception as e:
        print(f"\n❌ Error in handle_generate_flow: {e}")
        import traceback
        traceback.print_exc()
        await send_error(websocket, f"Generation failed: {str(e)}")


async def generate_flow_architecture_default(
    llm,
    task_description: str,
    dtm: Optional[Dict[str, Any]],
    device_info: Dict[str, Any],
    max_screens: int = 5
) -> Dict[str, Any]:
    """
    Generate flow architecture - Default taste-driven mode
    
    No screen definitions, just pure taste-driven architecture
    """
    
    # Build prompt for flow architecture
    prompt_parts = []
    
    prompt_parts.append("""# Flow Architecture Generation

You are a UX flow architect creating a multi-screen application flow.

## Task

Design the screen-by-screen flow for this application based on the task description.

## Output Format

Return ONLY a valid JSON object (no markdown code fences, no explanations):

{
  "flow_name": "string",
  "display_title": "string (3-5 word punchy title)",
  "display_description": "string (10-15 word concise description)",
  "entry_screen_id": "string",
  "screens": [
    {
      "screen_id": "string (e.g., 'screen_1', 'screen_2')",
      "name": "string (screen name)",
      "description": "string (brief description)",
      "task_description": "string (detailed - what to build on this screen)",
      "platform": "web" | "phone",
      "dimensions": {"width": number, "height": number},
      "screen_type": "entry" | "intermediate" | "success" | "error" | "exit"
    }
  ],
  "transitions": [
    {
      "transition_id": "string",
      "from_screen_id": "string",
      "to_screen_id": "string",
      "trigger": "string (user action description)",
      "trigger_type": "tap" | "submit" | "auto" | "link",
      "flow_type": "forward" | "back" | "error" | "branch" | "success",
      "label": "string (button/link text)"
    }
  ]
}

## Guidelines

1. **Logical flow**: Create screens in logical progression
2. **Screen limit**: Stay within max_screens limit
3. **Entry point**: First screen should be entry_screen_id
4. **Clear transitions**: Every screen should have clear navigation paths
5. **Detailed tasks**: task_description should be specific and actionable (what components, what data, what interactions)
6. **Complete flows**: Include success, error, and navigation paths

""")
    
    # Add DTM context if available
    if dtm:
        consensus = dtm.get("consensus_narrative", {})
        personality = dtm.get("unified_personality", {})
        
        if consensus or personality:
            prompt_parts.append("\n## Designer Taste Context\n\n")
            prompt_parts.append("Consider these patterns when designing the flow:\n\n")
            
            if "component_vocabulary" in consensus:
                prompt_parts.append(f"**Component approach**: {consensus['component_vocabulary'][:300]}...\n\n")
            
            if "decision_heuristics" in personality:
                heuristics = personality["decision_heuristics"]
                if "complexity_approach" in heuristics:
                    prompt_parts.append(f"**Complexity philosophy**: {heuristics['complexity_approach'][:300]}...\n\n")
    
    # Add task
    prompt_parts.append(f"\n## Task Description\n\n{task_description}\n\n")
    
    # Add device context
    platform = device_info.get("platform", "web")
    width = device_info.get("screen", {}).get("width", 1440)
    height = device_info.get("screen", {}).get("height", 900)
    
    prompt_parts.append(f"## Device Context\n\n")
    prompt_parts.append(f"- Platform: {platform}\n")
    prompt_parts.append(f"- Screen dimensions: {width}x{height}px\n")
    prompt_parts.append(f"- Maximum screens: {max_screens}\n\n")
    
    prompt_parts.append("Generate the flow architecture JSON now:")
    
    prompt = "\n".join(prompt_parts)
    
    # Generate
    gen_response = await llm.generate(
        model="claude-sonnet-4.5",
        messages=[
            Message(role=MessageRole.USER, content=prompt)
        ],
        temperature=0.7,
        max_tokens=4000
    )
    
    # Extract text from response object
    response = gen_response.text
    
    # Extract JSON
    import json
    import re
    
    # Try to extract JSON from markdown blocks
    json_match = re.search(r'```(?:json)?\s*\n(.*?)\n```', response, re.DOTALL)
    if json_match:
        json_str = json_match.group(1)
    else:
        # Try to find JSON object directly
        json_match = re.search(r'\{.*\}', response, re.DOTALL)
        if json_match:
            json_str = json_match.group(0)
        else:
            json_str = response
    
    try:
        architecture = json.loads(json_str)
        
        # Ensure all screens have required platform/dimensions
        for screen in architecture.get("screens", []):
            if "platform" not in screen:
                screen["platform"] = platform
            if "dimensions" not in screen:
                screen["dimensions"] = {"width": width, "height": height}
        
        return architecture
        
    except json.JSONDecodeError as e:
        print(f"Failed to parse flow architecture JSON: {e}")
        print(f"Response: {response[:500]}...")
        
        # Return minimal fallback
        return {
            "flow_name": "Generated Flow",
            "display_title": "Application Flow",
            "display_description": "Multi-screen application based on your description",
            "entry_screen_id": "screen_1",
            "screens": [
                {
                    "screen_id": "screen_1",
                    "name": "Main Screen",
                    "description": "Primary application screen",
                    "task_description": task_description,
                    "platform": platform,
                    "dimensions": {"width": width, "height": height},
                    "screen_type": "entry"
                }
            ],
            "transitions": []
        }
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
        
        # ========================================================================
        # PHASE 1.5 TODO: Update to use new DTM builder
        # ========================================================================
        # Load DTM for code generation
        # TODO Phase 1.5: Replace with:
        #   from app.dtm import builder as dtm_builder
        #   dtm_result = await dtm_builder.get_or_build_dtm(
        #       taste_id=taste_id,
        #       resource_ids=project.get("selected_resource_ids", []),
        #       mode="auto"
        #   )
        #   dtm = dtm_result["dtm"]
        # ========================================================================
        
        taste_id = project.get("selected_taste_id")
        dtm = None
        
        if taste_id:
            try:
                dtm = storage.get_taste_dtm(user_id, taste_id)  # OLD - still works for Phase 1
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
            
            # Log applier input
            dtm_summary = {
                "spacing_quantum": dtm.get("designer_systems", {}).get("spacing", {}).get("default"),
                "common_sizes": dtm.get("designer_systems", {}).get("typography", {}).get("common_sizes", []),
                "color_palette_count": len(dtm.get("designer_systems", {}).get("color_system", {}).get("common_palette", []))
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
                            "screen_name": screen_name,
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
        error_trace = traceback.format_exc()
        print(f"Error in handle_iterate_ui: {e}")
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