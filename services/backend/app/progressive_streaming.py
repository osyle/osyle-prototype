"""
Progressive UI Streaming - WebSocket Handler Integration (FIXED VERSION)
Adds checkpoint-based progressive rendering to screen generation
with proper checkpoint cleaning at every step
"""
from typing import Dict, Any
from datetime import datetime
from fastapi import WebSocket


# Import checkpoint extractor (use the fixed version)
from app.checkpoint_extractor import (
    extract_at_checkpoint, 
    count_checkpoints,
    _aggressive_clean_checkpoints  # Import the aggressive cleaner
)


# ========== LOGGING CONFIGURATION ==========
RAW_STREAM_LOG = "/tmp/raw_llm_stream.log"
CHECKPOINT_DETECTION_LOG = "/tmp/checkpoint_detection.log"
WEBSOCKET_SEND_LOG = "/tmp/websocket_send.log"
TRANSFORMATION_LOG = "/tmp/ui_stream_transformations.log"


def log_to_file(filepath: str, content: str):
    """Append log entry with timestamp"""
    timestamp = datetime.now().isoformat()
    with open(filepath, 'a') as f:
        f.write(f"\n{'='*80}\n")
        f.write(f"[{timestamp}]\n")
        f.write(content)
        f.write(f"\n{'='*80}\n")


def log_transformation_step(step_name: str, before: str, after: str):
    """
    Log raw -> cleaned transformations.
    Uses strict separators: 5 newlines, $$$$$, 5 newlines.
    No truncation. Single file.
    """
    separator = "\n" * 5 + "$$$$$" + "\n" * 5
    with open(TRANSFORMATION_LOG, "a") as f:
        f.write(separator)
        f.write(f"STEP: {step_name}\n")
        f.write(f"TIMESTAMP: {datetime.now().isoformat()}\n\n")
        f.write("----- BEFORE (RAW INPUT) -----\n")
        f.write(before if before is not None else "<<< NONE >>>")
        f.write("\n\n")
        f.write("----- AFTER (CLEANED OUTPUT) -----\n")
        f.write(after if after is not None else "<<< NONE >>>")
        f.write("\n")
# ========== END LOGGING CONFIGURATION ==========


async def generate_screen_ui_progressive(
    screen: Dict[str, Any],
    screen_index: int,
    llm,
    websocket: WebSocket,
    prompt_name: str,
    screen_content: list,
    **kwargs
) -> Dict[str, Any]:
    """
    Generate screen UI with progressive checkpoint updates.
    
    This wraps the LLM call to extract checkpoints as they stream in and
    send progressive updates to the frontend.
    """
    screen_id = screen['screen_id']
    screen_name = screen.get('name', 'Unknown')
    buffer = ""
    last_checkpoint_count = 0
    last_sent_code = None
    chunk_count = 0
    
    # ========== INITIAL LOGGING ==========
    log_to_file(RAW_STREAM_LOG, f"""
================================================================================
STARTING NEW SCREEN GENERATION
================================================================================
Screen ID: {screen_id}
Screen Name: {screen_name}
Screen Index: {screen_index}
Prompt Name: {prompt_name}
Has Streaming Support: {hasattr(llm, 'call_claude_stream')}
================================================================================
""")
    # ========== END INITIAL LOGGING ==========
    
    try:
        # Check if LLM supports streaming
        if not hasattr(llm, 'call_claude_streaming'):
            # Fallback to non-streaming
            log_to_file(RAW_STREAM_LOG, "⚠️  LLM doesn't support streaming, using standard generation")
            print(f"  ⚠️  LLM doesn't support streaming, using standard generation")
            response = await llm.call_claude(
                prompt_name=prompt_name,
                user_message=screen_content
            )
            ui_code_raw = response["text"].strip()

            ui_code_no_fences = _clean_code_fences(ui_code_raw)
            log_transformation_step(
                "non_stream_remove_code_fences",
                ui_code_raw,
                ui_code_no_fences
            )

            ui_code_final = _aggressive_clean_checkpoints(ui_code_no_fences)
            log_transformation_step(
                "non_stream_remove_checkpoints",
                ui_code_no_fences,
                ui_code_final
            )
            
            await websocket.send_json({
                "type": "screen_ready",
                "data": {
                    "screen_id": screen_id,
                    "ui_code": ui_code_final,
                    "is_final": True
                }
            })
            
            return {"screen_id": screen_id, "ui_code": ui_code_final}
        
        # Stream with checkpoints
        log_to_file(RAW_STREAM_LOG, f"🌊 Starting streaming generation for {screen_name}...")
        print(f"  🌊 Streaming with progressive checkpoints for {screen['name']}...")
        
        async for chunk in llm.call_claude_streaming(
            prompt_name=prompt_name,
            user_message=screen_content
        ):
            # Accumulate tokens
            chunk_count += 1
            buffer += chunk
            
            # ========== PERIODIC BUFFER LOGGING ==========
            if chunk_count % 50 == 0:  # Log every 50 chunks
                log_to_file(RAW_STREAM_LOG, f"""
Chunk #{chunk_count}
Buffer size: {len(buffer)} chars
Last 800 chars of buffer:
{buffer[-800:]}
""")
            # ========== END PERIODIC LOGGING ==========
            
            # Check for new checkpoint
            current_checkpoint_count = count_checkpoints(buffer)
            
            if current_checkpoint_count > last_checkpoint_count:
                # ========== CHECKPOINT DETECTED LOGGING ==========
                log_to_file(CHECKPOINT_DETECTION_LOG, f"""
🎯 NEW CHECKPOINT DETECTED!
================================================================================
Screen: {screen_id} ({screen_name})
Checkpoint Number: {current_checkpoint_count}
Previous Count: {last_checkpoint_count}
Buffer Size: {len(buffer)} chars
Total Chunks Received: {chunk_count}

Last 1000 chars of buffer:
{buffer[-1000:]}

Now calling extract_at_checkpoint()...
================================================================================
""")
                print(f"    🔍 Checkpoint {current_checkpoint_count} detected for {screen_name}")
                # ========== END CHECKPOINT DETECTED LOGGING ==========
                
                # New checkpoint detected!
                checkpoint_code = extract_at_checkpoint(buffer)

                log_transformation_step(
                    f"checkpoint_extraction_{current_checkpoint_count}",
                    buffer,
                    checkpoint_code
                )
                
                # ========== EXTRACTION RESULT LOGGING ==========
                extracted_preview = f"First 500 chars of extracted code:\n{checkpoint_code[:500]}" if checkpoint_code else "❌ No code extracted"
                log_to_file(CHECKPOINT_DETECTION_LOG, f"""
Extraction Result:
- Got code: {checkpoint_code is not None}
- Code length: {len(checkpoint_code) if checkpoint_code else 0}
- Same as last sent: {checkpoint_code == last_sent_code if checkpoint_code else 'N/A'}

{extracted_preview}
""")
                # ========== END EXTRACTION RESULT LOGGING ==========
                
                if checkpoint_code and checkpoint_code != last_sent_code:
                    cleaned_code = checkpoint_code
                    
                    log_transformation_step(
                        f"checkpoint_sent_{current_checkpoint_count}",
                        checkpoint_code,
                        cleaned_code
                    )
                    
                    # ========== SENDING CHECKPOINT LOGGING ==========
                    log_to_file(CHECKPOINT_DETECTION_LOG, f"""
✅ SENDING CHECKPOINT TO FRONTEND
Code length: {len(cleaned_code)}
First 500 chars:
{cleaned_code[:500]}
""")
                    
                    log_to_file(WEBSOCKET_SEND_LOG, f"""
📤 Sending ui_checkpoint message
Screen: {screen_id}
Checkpoint: {current_checkpoint_count}
Code length: {len(cleaned_code)}
""")
                    # ========== END SENDING LOGGING ==========
                    
                    await websocket.send_json({
                        "type": "ui_checkpoint",
                        "data": {
                            "screen_id": screen_id,
                            "ui_code": cleaned_code,
                            "checkpoint_number": current_checkpoint_count,
                            "is_final": False
                        }
                    })
                    
                    log_to_file(WEBSOCKET_SEND_LOG, "✅ Message sent successfully")
                    
                    last_sent_code = cleaned_code
                    last_checkpoint_count = current_checkpoint_count
                else:
                    log_to_file(CHECKPOINT_DETECTION_LOG, "⚠️  Skipped sending (no code or duplicate)")
        
        # Stream complete - clean and send final code
        log_to_file(RAW_STREAM_LOG, f"""
🏁 STREAM COMPLETE
================================================================================
Screen: {screen_id} ({screen_name})
Total chunks: {chunk_count}
Total checkpoints: {last_checkpoint_count}
Final buffer size: {len(buffer)} chars
================================================================================
""")
        
        code_without_fences = _clean_code_fences(buffer)
        log_transformation_step(
            "final_remove_code_fences",
            buffer,
            code_without_fences
        )

        final_code = _aggressive_clean_checkpoints(code_without_fences)
        log_transformation_step(
            "final_remove_checkpoints",
            code_without_fences,
            final_code
        )
        
        await websocket.send_json({
            "type": "screen_ready",
            "data": {
                "screen_id": screen_id,
                "ui_code": final_code,
                "is_final": True
            }
        })
        
        log_to_file(WEBSOCKET_SEND_LOG, "✅ Final message sent successfully")
        
        return {"screen_id": screen_id, "ui_code": final_code}
        
    except Exception as e:
        error_msg = f"Error in progressive generation: {e}"
        log_to_file(RAW_STREAM_LOG, f"❌ EXCEPTION: {error_msg}")
        
        import traceback
        log_to_file(RAW_STREAM_LOG, f"Traceback:\n{traceback.format_exc()}")
        
        await websocket.send_json({
            "type": "screen_error",
            "data": {
                "screen_id": screen_id,
                "error": str(e)
            }
        })
        
        return {"screen_id": screen_id, "ui_code": None, "error": str(e)}


def _clean_code_fences(code: str) -> str:
    """
    Remove markdown code fences from generated code.
    """
    code = code.strip()
    
    if code.startswith("```jsx") or code.startswith("```javascript") or code.startswith("```tsx") or code.startswith("```typescript"):
        first_newline = code.find('\n')
        if first_newline != -1:
            code = code[first_newline + 1:]
    elif code.startswith("```"):
        code = code[3:]
    
    if code.endswith("```"):
        code = code[:-3]
    
    return code.strip()
