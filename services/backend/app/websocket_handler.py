"""
WebSocket Handler for Long-Running LLM Operations
Handles build-dtr and generate-ui with real-time progress updates
"""
import json
import base64
import re
from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, Any

from app.llm import get_llm_service
from app import db, storage
from app.code_based_analyzer import analyze_figma_design
from app.unified_dtr_builder import (
    build_unified_dtr,
    extract_llm_context,
    format_llm_context_for_prompt,
    prepare_figma_for_llm
)
from app.dtr_utils import extract_generative_rules


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
    """Handle build-dtr WebSocket request"""
    try:
        resource_id = data.get("resource_id")
        taste_id = data.get("taste_id")
        
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
        
        # Run code analysis
        await send_progress(websocket, "analyzing", "Running code analysis...")
        code_analysis = analyze_figma_design(figma_json)
        
        # Extract LLM context
        await send_progress(websocket, "preparing", "Preparing data for LLM...")
        llm_context = extract_llm_context(code_analysis)
        llm_context_formatted = format_llm_context_for_prompt(llm_context)
        figma_for_llm = prepare_figma_for_llm(figma_json, max_depth=5)
        
        # Build message
        content = [
            {"type": "text", "text": f"FIGMA DESIGN STRUCTURE:\n\n{figma_for_llm}"},
            {"type": "text", "text": f"\n\n{llm_context_formatted}"}
        ]
        
        # Add image if available
        if resource.get("has_image"):
            try:
                image_bytes = storage.get_resource_image(user_id, taste_id, resource_id)
                if image_bytes:
                    image_base64 = base64.b64encode(image_bytes).decode("utf-8")
                    content.append({
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": "image/png",
                            "data": image_base64
                        }
                    })
            except Exception:
                pass
        
        # Call LLM
        await send_progress(websocket, "llm", "Calling LLM for semantic analysis (this may take 1-3 minutes)...")
        llm = get_llm_service()
        response = await llm.call_claude(
            prompt_name="build_dtr_v3",
            user_message=content,
            parse_json=True,
        )
        
        llm_dtr = response["json"]
        
        # Build unified DTR
        await send_progress(websocket, "merging", "Building unified DTR...")
        unified_dtr = build_unified_dtr(llm_dtr, code_analysis)
        
        # Save
        await send_progress(websocket, "saving", "Saving DTR...")
        storage.put_resource_dtr(user_id, taste_id, resource_id, unified_dtr)
        
        # Update resource metadata
        metadata = resource.get("metadata", {})
        metadata["has_dtr"] = True
        metadata["dtr_version"] = "3.0"
        db.update_resource(resource_id, metadata=metadata)
        
        # Complete
        await send_complete(websocket, {
            "status": "success",
            "version": "3.0",
            "dtr": unified_dtr,
            "confidence": unified_dtr.get('meta', {}).get('confidence_scores', {})
        })
        
    except Exception as e:
        await send_error(websocket, str(e))


async def handle_generate_ui(websocket: WebSocket, data: Dict[str, Any], user_id: str):
    """Handle generate-ui WebSocket request"""
    try:
        project_id = data.get("project_id")
        task_description = data.get("task_description")
        device_info = data.get("device_info")
        rendering_mode = data.get("rendering_mode", "design-ml")
        
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
        
        # Load DTR if available
        await send_progress(websocket, "loading_dtr", "Loading design taste...")
        dtr_rules = None
        
        if project.get("selected_resource_id"):
            try:
                dtr_json = storage.get_resource_dtr(
                    user_id,
                    project["selected_taste_id"],
                    project["selected_resource_id"]
                )
                if dtr_json:
                    dtr_rules = extract_generative_rules(dtr_json)
            except Exception:
                pass
        
        # Determine prompt
        if rendering_mode == "react":
            prompt_name = "generate_ui_react_v2"
            parse_json = False
        else:
            prompt_name = "generate_ui_dml_v2"
            parse_json = True
        
        # Build device context
        device_dict = None
        if device_info:
            device_dict = {
                "platform": device_info.get("platform"),
                "width": device_info.get("screen", {}).get("width"),
                "height": device_info.get("screen", {}).get("height")
            }
        
        # Build message
        user_message_parts = [f"Task: {task_description}"]
        if dtr_rules:
            user_message_parts.append(f"\n\n{dtr_rules}")
        else:
            user_message_parts.append("\n\n(No DTR available - generate from scratch with best practices)")
        if device_dict:
            user_message_parts.append(f"\n\nDevice Context:\n{json.dumps(device_dict, indent=2)}")
        
        user_message = "\n".join(user_message_parts)
        
        # Call LLM
        await send_progress(websocket, "generating", "Generating UI (this may take 1-3 minutes)...")
        llm = get_llm_service()
        response = await llm.call_claude(
            prompt_name=prompt_name,
            user_message=user_message,
            parse_json=parse_json,
        )
        
        # Extract output
        if rendering_mode == "design-ml":
            ui_output = response["json"]
        else:
            ui_output = response["text"]
        
        # Save
        await send_progress(websocket, "saving", "Saving UI...")
        current_version = project.get("metadata", {}).get("ui_version", 0)
        new_version = current_version + 1
        
        storage.put_project_ui(user_id, project_id, ui_output, version=new_version)
        
        # Update metadata
        metadata = project.get("metadata", {})
        metadata["ui_version"] = new_version
        metadata["has_ui"] = True
        metadata["rendering_mode"] = rendering_mode
        db.update_project(project_id, metadata=metadata)
        
        # Complete
        await send_complete(websocket, {
            "status": "success",
            "type": rendering_mode,
            "ui": ui_output,
            "version": new_version,
            "dtr_applied": dtr_rules is not None
        })
        
    except Exception as e:
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
