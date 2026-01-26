"""
Feedback Pipeline Logger
Logs all stages of the feedback iteration process for debugging
"""
import json
import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict


class FeedbackLogger:
    """Centralized logger for feedback iteration debugging"""
    
    def __init__(self, project_id: str, user_id: str):
        """Initialize logger with session info"""
        self.project_id = project_id
        self.user_id = user_id
        self.session_id = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        
        # Create logs directory
        self.log_dir = Path("/tmp/feedback_logs")
        self.log_dir.mkdir(exist_ok=True)
        
        # Session-specific log file
        self.log_file = self.log_dir / f"session_{self.session_id}_{project_id[:8]}.jsonl"
        
        # Write session start
        self._log_event("session_start", {
            "project_id": project_id,
            "user_id": user_id,
            "timestamp": datetime.utcnow().isoformat()
        })
    
    def _log_event(self, event_type: str, data: Dict[str, Any]):
        """Write a log event as JSON line"""
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "session_id": self.session_id,
            "project_id": self.project_id,
            "event_type": event_type,
            "data": data
        }
        
        with open(self.log_file, "a") as f:
            f.write(json.dumps(log_entry, indent=None) + "\n")
    
    def log_user_feedback(self, feedback: str, conversation_history: list):
        """Log user's input feedback and conversation context"""
        self._log_event("user_feedback", {
            "feedback": feedback,
            "conversation_history": conversation_history,
            "history_length": len(conversation_history)
        })
    
    def log_flow_state(self, flow_graph: dict, current_version: int):
        """Log current flow graph state before iteration"""
        screens_summary = [
            {
                "screen_id": s.get("screen_id"),
                "name": s.get("name"),
                "has_code": bool(s.get("ui_code")),
                "code_length": len(s.get("ui_code", ""))
            }
            for s in flow_graph.get("screens", [])
        ]
        
        self._log_event("flow_state", {
            "version": current_version,
            "total_screens": len(flow_graph.get("screens", [])),
            "total_transitions": len(flow_graph.get("transitions", [])),
            "screens": screens_summary
        })
    
    def log_router_input(self, user_message: str, flow_summary: list):
        """Log input to feedback router"""
        self._log_event("router_input", {
            "user_message": user_message,
            "flow_summary": flow_summary,
            "flow_summary_length": len(json.dumps(flow_summary))
        })
    
    def log_router_output(self, router_result: dict):
        """Log feedback router decision"""
        self._log_event("router_output", {
            "needs_regeneration": router_result.get("needs_regeneration"),
            "conversation_only": router_result.get("conversation_only"),
            "screens_to_edit_count": len(router_result.get("screens_to_edit", [])),
            "screens_to_edit": router_result.get("screens_to_edit", []),
            "reasoning": router_result.get("reasoning"),
            "response": router_result.get("response")
        })
    
    def log_applier_input(self, screen_id: str, screen_name: str, 
                         current_code: str, contextualized_feedback: str,
                         dtm_summary: dict, flow_context: dict):
        """Log input to feedback applier for a specific screen"""
        self._log_event("applier_input", {
            "screen_id": screen_id,
            "screen_name": screen_name,
            "current_code_length": len(current_code),
            "current_code": current_code,  # Full code for analysis
            "contextualized_feedback": contextualized_feedback,
            "dtm_summary": dtm_summary,
            "flow_context": flow_context
        })
    
    def log_applier_streaming(self, screen_id: str, chunk_type: str, 
                             chunk_content: str, buffer_state: dict):
        """Log streaming chunks from applier"""
        self._log_event("applier_streaming", {
            "screen_id": screen_id,
            "chunk_type": chunk_type,
            "chunk_length": len(chunk_content),
            "chunk_preview": chunk_content[:200] if chunk_content else "",
            "delimiter_found": buffer_state.get("delimiter_found", False),
            "conversation_buffer_length": buffer_state.get("conversation_length", 0),
            "code_buffer_length": buffer_state.get("code_length", 0)
        })
    
    def log_applier_complete(self, screen_id: str, screen_name: str,
                           full_conversation: str, full_code: str,
                           original_code: str):
        """Log complete output from applier"""
        self._log_event("applier_complete", {
            "screen_id": screen_id,
            "screen_name": screen_name,
            "conversation": full_conversation,
            "conversation_length": len(full_conversation),
            "generated_code": full_code,
            "generated_code_length": len(full_code),
            "original_code": original_code,
            "original_code_length": len(original_code),
            "code_changed": original_code != full_code,
            "size_delta": len(full_code) - len(original_code)
        })
    
    def log_llm_call(self, prompt_name: str, model: str, 
                    user_message_length: int, response_length: int,
                    parse_json: bool, parsed_successfully: bool = None):
        """Log LLM API call details"""
        self._log_event("llm_call", {
            "prompt_name": prompt_name,
            "model": model,
            "user_message_length": user_message_length,
            "response_length": response_length,
            "parse_json": parse_json,
            "parsed_successfully": parsed_successfully
        })
    
    def log_error(self, stage: str, error_type: str, error_message: str, 
                 stack_trace: str = None):
        """Log errors during feedback iteration"""
        self._log_event("error", {
            "stage": stage,
            "error_type": error_type,
            "error_message": error_message,
            "stack_trace": stack_trace
        })
    
    def log_version_save(self, new_version: int, screens_updated: list):
        """Log successful version save"""
        self._log_event("version_save", {
            "new_version": new_version,
            "screens_updated": screens_updated,
            "screens_updated_count": len(screens_updated)
        })
    
    def log_session_complete(self, status: str, duration_seconds: float):
        """Log session completion"""
        self._log_event("session_complete", {
            "status": status,
            "duration_seconds": duration_seconds,
            "log_file": str(self.log_file)
        })