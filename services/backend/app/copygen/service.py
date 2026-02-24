"""
Copy Generation Service

Handles conversational copy development for projects.
"""
from typing import Dict, Any, List, Optional
from pathlib import Path

from app.llm.types import Message, MessageRole


def load_copy_system_prompt() -> str:
    """
    Load the copy generation system prompt from markdown file.
    
    Returns:
        System prompt as string
    """
    prompt_path = Path(__file__).parent / "prompts" / "copy_generation.md"
    
    try:
        with open(prompt_path, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        print(f"Warning: Could not load copy generation prompt: {e}")
        # Fallback prompt
        return """You are an expert content strategist and copywriter. Help users develop 
all written content for their digital product through conversational iteration. Ask clarifying 
questions, provide examples, and refine the copy until it's polished and ready for design."""


async def generate_copy_response(
    llm,
    conversation_history: List[Dict[str, str]],
    project_description: str,
    user_message: str,
    websocket = None  # Optional WebSocket for streaming
) -> str:
    """
    Generate a conversational response for copy development.
    
    Args:
        llm: LLM service instance
        conversation_history: List of previous messages [{"role": "user"|"assistant", "content": "..."}]
        project_description: Original project description
        user_message: Latest user message
        websocket: Optional WebSocket for streaming responses
        
    Returns:
        Assistant response as string (full response if streaming, or complete response if not)
    """
    # Load system prompt
    system_prompt = load_copy_system_prompt()
    
    # Build messages array
    messages = []
    
    # Add system message with context
    system_context = f"""{system_prompt}

## Project Context

The user is working on a project described as:
"{project_description}"

Help them develop all the copy needed for this project through natural conversation.
Remember: Write ACTUAL COPY with real words, not templates or placeholders!
"""
    
    messages.append(Message(
        role=MessageRole.SYSTEM,
        content=system_context
    ))
    
    # Add conversation history
    for msg in conversation_history:
        role = MessageRole.USER if msg["role"] == "user" else MessageRole.ASSISTANT
        messages.append(Message(role=role, content=msg["content"]))
    
    # Add current user message
    messages.append(Message(role=MessageRole.USER, content=user_message))
    
    # Generate response with streaming if WebSocket provided
    if websocket:
        # Streaming mode
        full_response = ""
        stream = llm.generate_stream(
            model=llm.config.default_model,
            messages=messages,
            temperature=0.7,
            max_tokens=2000
        )
        
        async for chunk in stream:
            full_response += chunk
            # Send chunk to client
            await websocket.send_json({
                "type": "copy_chunk",
                "chunk": chunk
            })
        
        return full_response
    else:
        # Non-streaming mode (backward compatibility)
        response = await llm.generate(
            model=llm.config.default_model,
            messages=messages,
            temperature=0.7,
            max_tokens=2000
        )
        
        return response.text


async def extract_final_copy(
    llm,
    conversation_history: List[Dict[str, str]],
    project_description: str
) -> str:
    """
    Extract and format the final copy from the conversation.
    
    This synthesizes all the iterations into a clean, organized final document.
    
    Args:
        llm: LLM service instance
        conversation_history: Complete conversation history
        project_description: Original project description
        
    Returns:
        Formatted final copy document
    """
    # Build prompt to extract final copy
    extraction_prompt = f"""Based on the following conversation about copy development for a project, 
extract and organize all the finalized copy into a clean, well-structured document.

Project Description:
"{project_description}"

Conversation:
"""
    
    for msg in conversation_history:
        role_label = "User" if msg["role"] == "user" else "Assistant"
        extraction_prompt += f"\n{role_label}: {msg['content']}\n"
    
    extraction_prompt += """

Now, create a comprehensive final copy document that includes all the content developed in this conversation.
Format it clearly with sections, headlines, body copy, CTAs, and any other elements discussed.
Only include content that was finalized and approved in the conversation.
"""
    
    messages = [Message(role=MessageRole.USER, content=extraction_prompt)]
    
    response = await llm.generate(
        model=llm.config.default_model,
        messages=messages,
        temperature=0.3,  # Lower temperature for more consistent formatting
        max_tokens=3000
    )
    
    return response.text


async def generate_initial_copy_draft(
    llm,
    project_description: str,
    device_info: Optional[Dict[str, Any]] = None
) -> str:
    """
    Generate an initial copy draft to kickstart the conversation.
    
    Args:
        llm: LLM service instance
        project_description: Project description
        device_info: Optional device information (web/phone)
        
    Returns:
        Initial copy draft as string
    """
    system_prompt = load_copy_system_prompt()

    width = device_info.get("screen", {}).get("width", 1440) if device_info else 1440

    prompt = f"""{system_prompt}

Generate an initial copy draft for this project:

Project Description: "{project_description}"
Viewport: {width}px wide

Create a starting point that covers:
1. Main headline/value proposition
2. Key sections or features
3. Primary call-to-action
4. Any supporting copy elements

This is just a starting draft to begin the conversation - the user will refine it.
"""
    
    messages = [Message(role=MessageRole.USER, content=prompt)]
    
    response = await llm.generate(
        model=llm.config.default_model,
        messages=messages,
        temperature=0.7,
        max_tokens=2000
    )
    
    return response.text