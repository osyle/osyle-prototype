"""
Prompt Selector - Choose between normal and granular checkpoint prompts
"""
import os

def get_prompt_name(base_prompt: str) -> str:
    """
    Get the appropriate prompt name based on ENABLE_GRANULAR_CHECKPOINTS flag.
    
    Args:
        base_prompt: Base prompt name (e.g., "generate_ui_v2")
        
    Returns:
        Prompt name with _granular suffix if flag is enabled
    """
    granular_enabled = os.getenv("ENABLE_GRANULAR_CHECKPOINTS", "false").lower() == "true"
    
    if granular_enabled:
        print(f"[GRANULAR MODE] Using {base_prompt}_granular")
        return f"{base_prompt}_granular"
    
    return base_prompt
