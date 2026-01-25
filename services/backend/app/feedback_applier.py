"""
Feedback Applier - Generates updated UI code based on contextualized feedback
Uses Prompt B (heavy code generator)
"""
from typing import Dict, Any, AsyncGenerator


class FeedbackApplier:
    """Applies feedback to a screen and generates updated code"""
    
    def __init__(self, llm_client):
        """
        Args:
            llm_client: LLM service for making API calls
        """
        self.llm = llm_client
    
    async def apply_feedback(
        self,
        current_code: str,
        contextualized_feedback: str,
        dtm: Dict[str, Any],
        flow_context: Dict[str, Any],
        device_info: Dict[str, Any]
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Apply feedback to screen code and generate updates (streaming)
        
        Yields chunks with types:
        - {"type": "conversation", "chunk": str} - Before $GENERATING
        - {"type": "delimiter_detected"} - When $GENERATING is found
        - {"type": "code", "chunk": str} - After $GENERATING
        - {"type": "complete", "conversation": str, "code": str} - Final complete response
        
        Args:
            current_code: Current screen's React code
            contextualized_feedback: Specific feedback for this screen
            dtm: Designer Taste Model
            flow_context: Flow context (transitions, etc.)
            device_info: Device platform and dimensions
        """
        
        # Build the user message
        user_message = self._build_user_message(
            current_code=current_code,
            contextualized_feedback=contextualized_feedback,
            dtm=dtm,
            flow_context=flow_context,
            device_info=device_info
        )
        
        conversation_part = []
        code_part = []
        delimiter_found = False
        buffer = ""
        
        # Stream from LLM using call_claude_streaming
        async for chunk in self.llm.call_claude_streaming(
            prompt_name="feedback_applier_prompt",
            user_message=user_message,
            model="claude-sonnet",
            max_tokens=8000,
            temperature=0.5
        ):
            buffer += chunk
            
            # Check for delimiter
            if not delimiter_found and "$GENERATING" in buffer:
                # Split at delimiter
                before_delimiter, after_delimiter = buffer.split("$GENERATING", 1)
                
                # Send any remaining conversation text before delimiter
                if before_delimiter.strip():
                    conversation_part.append(before_delimiter)
                    yield {
                        "type": "conversation",
                        "chunk": before_delimiter
                    }
                
                # Signal delimiter detected
                delimiter_found = True
                yield {"type": "delimiter_detected"}
                
                # Start code buffer with text after delimiter
                buffer = after_delimiter
                
                # Send code chunk if any
                if buffer.strip():
                    code_part.append(buffer)
                    yield {
                        "type": "code",
                        "chunk": buffer
                    }
                
                buffer = ""
            
            elif not delimiter_found:
                # Still in conversation part
                # Send chunks as they arrive for real-time streaming
                if len(buffer) > 50:  # Send in reasonable chunks
                    conversation_part.append(buffer)
                    yield {
                        "type": "conversation",
                        "chunk": buffer
                    }
                    buffer = ""
            
            else:
                # In code part
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
        
        # Send complete response
        full_conversation = "".join(conversation_part).strip()
        full_code = "".join(code_part).strip()
        
        yield {
            "type": "complete",
            "conversation": full_conversation,
            "code": full_code
        }
    
    def _build_user_message(
        self,
        current_code: str,
        contextualized_feedback: str,
        dtm: Dict[str, Any],
        flow_context: Dict[str, Any],
        device_info: Dict[str, Any]
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
        
        # DTM (condensed)
        parts.append("## Designer Taste Model (DTM)\n")
        parts.append("Use these values when applying changes:\n\n")
        
        # Extract key DTM values
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
                parts.append(f"**Color Palette:** {colors[:10]}\n")  # First 10
        
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
                for trans in transitions[:3]:  # Show first 3
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