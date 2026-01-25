"""
Feedback Router - Analyzes user feedback and determines which screens need editing
Uses Prompt A (lightweight conversational router)
"""
import json
from typing import Dict, Any, List


class FeedbackRouter:
    """Routes user feedback to appropriate screens for regeneration"""
    
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
        flow_summary: List[Dict[str, str]]
    ) -> Dict[str, Any]:
        """
        Analyze user feedback and determine which screens need editing
        
        Args:
            user_feedback: User's current message
            conversation_history: Previous messages [{"role": "user"/"assistant", "content": "..."}]
            flow_summary: Summary of all screens in the flow
        
        Returns:
            {
                "needs_regeneration": bool,
                "screens_to_edit": [{"screen_id": str, "contextualized_feedback": str}],
                "conversation_only": bool (optional),
                "response": str (optional, if conversation_only),
                "reasoning": str
            }
        """
        
        # Build the user message with context
        user_message = self._build_user_message(
            user_feedback,
            conversation_history,
            flow_summary
        )
        
        # Call LLM with feedback_router_prompt
        result = await self.llm.call_claude(
            prompt_name="feedback_router_prompt",
            user_message=user_message,
            model="claude-sonnet",
            max_tokens=2000,
            temperature=0.3,  # Lower temperature for more consistent routing
            parse_json=True
        )
        
        # Return parsed JSON
        if "json" in result:
            return result["json"]
        else:
            # Fallback if JSON parsing failed
            return {
                "needs_regeneration": False,
                "conversation_only": True,
                "response": result.get("text", "I'm not sure what you'd like me to change."),
                "reasoning": "Failed to parse routing decision, defaulting to conversation"
            }
    
    def _build_user_message(
        self,
        user_feedback: str,
        conversation_history: List[Dict[str, str]],
        flow_summary: List[Dict[str, str]]
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
        
        # Add current user feedback
        message_parts.append("## User's Current Feedback\n")
        message_parts.append(user_feedback)
        
        return "".join(message_parts)