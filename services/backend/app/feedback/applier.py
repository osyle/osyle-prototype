"""
Feedback Applier - Generates updated UI code based on user feedback
"""
import re
from pathlib import Path
from typing import List, Dict, Any, AsyncGenerator
from app.llm.types import Message, MessageRole


class FeedbackApplier:
    """Applies feedback to a screen and generates updated code"""
    
    def __init__(self, llm_client):
        """
        Args:
            llm_client: LLM service for making API calls
        """
        self.llm = llm_client
        
        # Load prompt template
        prompts_dir = Path(__file__).parent / "prompts"
        prompt_file = prompts_dir / "feedback_applier_prompt.md"
        
        if not prompt_file.exists():
            # Fallback to legacy location
            legacy_file = Path(__file__).parent.parent / "generation" / "prompts" / "legacy" / "feedback_applier_prompt.md"
            if legacy_file.exists():
                prompt_file = legacy_file
        
        with open(prompt_file, 'r', encoding='utf-8') as f:
            self.system_prompt = f.read()
    
    async def apply_feedback(
        self,
        current_code: str,
        contextualized_feedback: str,
        dtm: Dict[str, Any],
        flow_context: Dict[str, Any],
        device_info: Dict[str, Any],
        annotations: List[Dict[str, Any]] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Apply feedback to screen code and generate updates (streaming)
        
        Yields chunks with types:
        - {"type": "conversation", "chunk": str} - Before $GENERATING
        - {"type": "delimiter_detected"} - When $GENERATING is found
        - {"type": "code", "chunk": str} - After $GENERATING
        - {"type": "complete", "conversation": str, "code": str} - Final complete response
        """
        conversation_part = []
        code_part = []
        
        try:
            # Build the user message
            user_message = self._build_user_message(
                current_code=current_code,
                contextualized_feedback=contextualized_feedback,
                dtm=dtm,
                flow_context=flow_context,
                device_info=device_info,
                annotations=annotations
            )
            
            # Build messages for LLM service
            messages = [
                Message(role=MessageRole.SYSTEM, content=self.system_prompt),
                Message(role=MessageRole.USER, content=user_message)
            ]
            
            delimiter_found = False
            buffer = ""
            
            # Use LLM service properly with streaming support
            stream = self.llm.generate_stream(
                model="claude-sonnet-4.5",
                messages=messages,
                max_tokens=8000,
                temperature=0.5,
            )
            
            # Stream from LLM using service API
            async for chunk in stream:
                # Only add to buffer before delimiter is found
                if not delimiter_found:
                    buffer += chunk
                
                # Process chunks in real-time
                if not delimiter_found and "$GENERATING" in buffer:
                    # Split at delimiter
                    before_delimiter, after_delimiter = buffer.split("$GENERATING", 1)
                    
                    # Send conversation part
                    if before_delimiter.strip():
                        conversation_part.append(before_delimiter)
                        yield {
                            "type": "conversation",
                            "chunk": before_delimiter
                        }
                    
                    # Signal delimiter detected
                    delimiter_found = True
                    yield {"type": "delimiter_detected"}
                    
                    # Add after_delimiter to code_part
                    code_part.append(after_delimiter)
                    yield {
                        "type": "code",
                        "chunk": after_delimiter
                    }
                    
                    buffer = ""
                
                elif not delimiter_found:
                    # Still in conversation part
                    # Only flush if buffer is large AND doesn't contain partial delimiter
                    if len(buffer) > 50 and not any(buffer.endswith(prefix) for prefix in ["$", "$G", "$GE", "$GEN", "$GENE", "$GENER", "$GENERA", "$GENERAT", "$GENERATI", "$GENERATIN"]):
                        conversation_part.append(buffer)
                        yield {
                            "type": "conversation",
                            "chunk": buffer
                        }
                        buffer = ""
                
                else:
                    # In code part - accumulate and send
                    code_part.append(chunk)
                    yield {
                        "type": "code",
                        "chunk": chunk
                    }
            
            # Send any remaining buffer
            if buffer:
                if not delimiter_found:
                    conversation_part.append(buffer)
                    yield {
                        "type": "conversation",
                        "chunk": buffer
                    }
                else:
                    code_part.append(buffer)
                    yield {
                        "type": "code",
                        "chunk": buffer
                    }
            
            # Assemble final code
            full_conversation = "".join(conversation_part).strip()
            full_code = "".join(code_part).strip()
            
            # Strip markdown fences
            full_code = self._strip_code_fences(full_code)
            
            yield {
                "type": "complete",
                "conversation": full_conversation,
                "code": full_code
            }
            
        except Exception as e:
            print(f"Error in feedback applier: {e}")
            raise
    
    def _strip_code_fences(self, code: str) -> str:
        """Strip markdown code fences from generated code"""
        code = code.strip()
        
        # Remove opening fence at the start (with or without language identifier)
        if code.startswith('```'):
            first_newline = code.find('\n')
            if first_newline != -1:
                code = code[first_newline + 1:]
        
        # Remove closing fence at the end
        if code.rstrip().endswith('```'):
            last_fence_index = code.rstrip().rfind('\n```')
            if last_fence_index != -1:
                code = code[:last_fence_index]
        
        return code.strip()
    
    def _build_user_message(
        self,
        current_code: str,
        contextualized_feedback: str,
        dtm: Dict[str, Any],
        flow_context: Dict[str, Any],
        device_info: Dict[str, Any],
        annotations: List[Dict[str, Any]] = None
    ) -> str:
        """Build the user message with all context"""
        
        import json
        
        parts = []
        
        # Current code
        parts.append("## Current Screen Code\n")
        parts.append("```jsx\n")
        parts.append(current_code)
        parts.append("\n```\n\n")
        
        # Feedback
        parts.append("## Feedback for This Screen\n")
        parts.append(contextualized_feedback)
        parts.append("\n\n")
        
        # Annotations section
        if annotations and len(annotations) > 0:
            parts.append("## Visual Annotations\n")
            parts.append(f"The user added {len(annotations)} annotation(s) on this screen:\n\n")
            
            for idx, ann in enumerate(annotations, 1):
                parts.append(f"**{idx}. {ann.get('element', 'Element')}**\n")
                
                if ann.get('elementPath'):
                    parts.append(f"   - Path: `{ann['elementPath']}`\n")
                
                if ann.get('tagName'):
                    parts.append(f"   - Tag: `<{ann['tagName'].lower()}>`\n")
                
                if ann.get('cssClasses'):
                    parts.append(f"   - Classes: `{ann['cssClasses']}`\n")
                
                if ann.get('textContent'):
                    parts.append(f"   - Text: \"{ann['textContent']}\"\n")
                
                if ann.get('selectedText'):
                    parts.append(f"   - Selected text: \"{ann['selectedText']}\"\n")
                
                if ann.get('elementIndex') is not None:
                    ordinal = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th']
                    idx_num = ann['elementIndex']
                    ord_str = ordinal[idx_num] if idx_num < len(ordinal) else f"{idx_num + 1}th"
                    parts.append(f"   - Occurrence: {ord_str}\n")
                
                parts.append(f"   - **Feedback:** {ann.get('comment', 'No comment')}\n\n")
            
            parts.append("Use the path, text content, and element details to precisely locate these elements in the code above. ")
            parts.append("Apply the annotation feedback surgically to each element.\n\n")
        
        # DTM (condensed)
        parts.append("## Designer Taste Model (DTM)\n")
        parts.append("Use these values when applying changes:\n\n")
        
        designer_systems = dtm.get("designer_systems", {})
        
        if "spacing" in designer_systems:
            spacing = designer_systems["spacing"]
            quantum = spacing.get("default", 8)
            parts.append(f"**Spacing Quantum:** {quantum}px\n")
        
        if "typography" in designer_systems:
            typo = designer_systems["typography"]
            sizes = typo.get("common_sizes", [])
            if sizes:
                parts.append(f"**Typography Sizes:** {sizes}\n")
        
        if "color_system" in designer_systems:
            colors = designer_systems["color_system"].get("common_palette", [])
            if colors:
                parts.append(f"**Color Palette:** {colors[:10]}\n")
        
        if "form_language" in designer_systems:
            radii = designer_systems["form_language"].get("common_radii", [])
            if radii:
                parts.append(f"**Border Radii:** {radii}\n")
        
        parts.append("\n")
        
        # Flow context
        if flow_context:
            parts.append("## Flow Context\n")
            parts.append(f"**Screen:** {flow_context.get('screen_name', 'Unknown')}\n")
            parts.append(f"**Position:** {flow_context.get('position_in_flow', 1)} of {flow_context.get('total_screens', 1)}\n")
            
            transitions = flow_context.get("outgoing_transitions", [])
            if transitions:
                parts.append(f"**Transitions:** {len(transitions)} outgoing\n")
                for trans in transitions[:3]:
                    parts.append(f"  - {trans.get('trigger', 'Unknown')} → {trans.get('to_screen_name', 'Unknown')}\n")
            
            parts.append("\n")
        
        # Device info
        parts.append("## Device Context\n")
        parts.append(f"**Platform:** {device_info.get('platform', 'web')}\n")
        screen = device_info.get('screen', {})
        parts.append(f"**Dimensions:** {screen.get('width', 375)}x{screen.get('height', 812)}px\n\n")
        
        # Instruction
        parts.append("## Your Task\n")
        parts.append("1. First, write a brief explanation (1-3 sentences) of what you're changing\n")
        parts.append("2. Then output: $GENERATING\n")
        parts.append("3. Then output the complete updated React component code\n")
        
        return "".join(parts)