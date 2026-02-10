"""
Feedback Router - Analyzes user feedback and routes to appropriate screens
"""
import json
from typing import Dict, Any, List


class FeedbackRouter:
    """Routes user feedback to appropriate screens"""
    
    def __init__(self, llm_client):
        """
        Args:
            llm_client: LLM service for making API calls
        """
        self.llm = llm_client
    
    async def route_feedback(
        self,
        user_feedback: str,
        conversation_history: List[Dict[str, str]],
        flow_summary: List[Dict[str, str]],
        annotations: Dict[str, List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Analyze user feedback and determine which screens need editing
        
        Args:
            user_feedback: User's current message (can be empty if only annotations)
            conversation_history: Previous messages [{"role": "user"/"assistant", "content": "..."}]
            flow_summary: Summary of all screens in the flow
            annotations: Dict of {screen_name: [annotation_objects]} from Agentator
        
        Returns:
            {
                "needs_regeneration": bool,
                "screens_to_edit": [{"screen_id": str, "screen_name": str, "contextualized_feedback": str, "annotations": [...]}],
                "conversation_only": bool (optional),
                "response": str (optional, if conversation_only),
                "reasoning": str
            }
        """
        try:
            # Build the user message with context
            user_message = self._build_user_message(
                user_feedback,
                conversation_history,
                flow_summary,
                annotations
            )
            
            # Call LLM with feedback_router_prompt
            result = await self.llm.call_claude(
                prompt_name="feedback_router_prompt",
                user_message=user_message,
                model="claude-sonnet",
                max_tokens=2000,
                temperature=0.3,
                parse_json=True
            )
            
            # Return parsed JSON with annotations attached
            if "json" in result:
                routing_result = result["json"]
                
                # Attach annotations to each screen that has them
                if annotations and "screens_to_edit" in routing_result:
                    for screen_edit in routing_result["screens_to_edit"]:
                        screen_name = screen_edit.get("screen_name", "")
                        if screen_name in annotations:
                            screen_edit["annotations"] = annotations[screen_name]
                
                return routing_result
            else:
                # Fallback if JSON parsing failed
                return {
                    "needs_regeneration": False,
                    "conversation_only": True,
                    "response": result.get("text", "I'm not sure what you'd like me to change."),
                    "reasoning": "Failed to parse routing decision, defaulting to conversation"
                }
        
        except Exception as e:
            print(f"Error routing feedback: {e}")
            raise
    
    def _build_user_message(
        self,
        user_feedback: str,
        conversation_history: List[Dict[str, str]],
        flow_summary: List[Dict[str, str]],
        annotations: Dict[str, List[Dict[str, Any]]] = None
    ) -> str:
        """Build the user message with all context"""
        
        message_parts = []
        
        # Add conversation history if exists
        if conversation_history and len(conversation_history) > 0:
            message_parts.append("## Conversation History\n")
            for msg in conversation_history[-6:]:  # Last 6 messages for context
                role = msg.get("role", "user")
                content = msg.get("content", "")
                message_parts.append(f"**{role.title()}:** {content}\n")
            message_parts.append("\n")
        
        # Add flow summary
        message_parts.append("## Current Flow Summary\n")
        message_parts.append("```json\n")
        message_parts.append(json.dumps(flow_summary, indent=2))
        message_parts.append("\n```\n\n")
        
        # Add annotations if present
        if annotations and len(annotations) > 0:
            message_parts.append("## User Annotations\n")
            message_parts.append("The user has added visual annotations to specific screens:\n\n")
            
            for screen_name, annotation_list in annotations.items():
                message_parts.append(f"### {screen_name} Screen - {len(annotation_list)} annotation(s)\n")
                
                for idx, ann in enumerate(annotation_list, 1):
                    message_parts.append(f"{idx}. **{ann.get('element', 'Element')}**")
                    
                    # Include element path if helpful
                    if ann.get('elementPath'):
                        message_parts.append(f" (Path: `{ann['elementPath']}`)")
                    
                    # Include text content if available
                    if ann.get('textContent'):
                        message_parts.append(f"\n   - Text: \"{ann['textContent']}\"")
                    
                    # Include selected text if user highlighted something
                    if ann.get('selectedText'):
                        message_parts.append(f"\n   - Selected: \"{ann['selectedText']}\"")
                    
                    # Element index for disambiguation
                    if ann.get('elementIndex') is not None:
                        ordinal = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th']
                        idx_num = ann['elementIndex']
                        ord_str = ordinal[idx_num] if idx_num < len(ordinal) else f"{idx_num + 1}th"
                        message_parts.append(f"\n   - Occurrence: {ord_str}")
                    
                    # The actual feedback comment
                    message_parts.append(f"\n   - **Feedback:** {ann.get('comment', 'No comment')}\n")
                
                message_parts.append("\n")
            
            message_parts.append("These annotations provide specific, visual feedback on UI elements. ")
            message_parts.append("When routing, consider these as structured feedback that should be applied to the annotated screens.\n\n")
        
        # Add current user feedback (can be empty if only annotations)
        if user_feedback and user_feedback.strip():
            message_parts.append("## User's Current Feedback\n")
            message_parts.append(user_feedback)
        elif annotations:
            message_parts.append("## User's Current Feedback\n")
            message_parts.append("*No text feedback - only visual annotations above*")
        else:
            message_parts.append("## User's Current Feedback\n")
            message_parts.append(user_feedback if user_feedback else "*No feedback provided*")
        
        return "".join(message_parts)