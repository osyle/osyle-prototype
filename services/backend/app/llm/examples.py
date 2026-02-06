"""
Example usage of the LLM infrastructure
Demonstrates key features for the taste capture system
"""
import asyncio
import os
from pathlib import Path

# Add parent directory to path for imports
import sys
sys.path.insert(0, str(Path(__file__).parent))

from llm import (
    LLMService, Message, MessageRole,
    TextContent, ImageContent,
    get_model_info, get_recommended_models
)


async def example_basic_generation():
    """Example 1: Basic text generation"""
    print("\n" + "="*60)
    print("EXAMPLE 1: Basic Text Generation")
    print("="*60)
    
    service = LLMService()
    
    response = await service.generate(
        model="claude-sonnet-4.5",
        messages=[
            Message(
                role=MessageRole.SYSTEM,
                content="You are a helpful assistant specialized in design systems"
            ),
            Message(
                role=MessageRole.USER,
                content="Explain what a design token is in one sentence"
            )
        ],
        max_tokens=100
    )
    
    print(f"\nResponse: {response.text}")
    print(f"\nTokens used: {response.usage.total_tokens}")
    print(f"Model: {response.model}")


async def example_with_caching():
    """Example 2: Using prompt caching for cost savings"""
    print("\n" + "="*60)
    print("EXAMPLE 2: Prompt Caching (50-90% cost savings)")
    print("="*60)
    
    service = LLMService()
    
    # Large system prompt (in real use, this would be your design system docs)
    system_prompt = """You are an expert in design systems and React development.

    Design System Guidelines:
    - Use consistent spacing: 4px, 8px, 16px, 24px, 32px, 48px
    - Color palette: Primary (#3B82F6), Secondary (#10B981), Accent (#F59E0B)
    - Typography: Inter for UI, Source Code Pro for code
    - Border radius: 4px for small elements, 8px for cards, 16px for modals
    - Shadows: sm (0 1px 2px), md (0 4px 6px), lg (0 10px 15px)
    
    [... imagine 10,000 more tokens of style guide ...]
    """
    
    # First request - system prompt will be cached
    print("\n📝 First request (caches system prompt)...")
    response1 = await service.generate(
        model="claude-sonnet-4.5",
        messages=[
            Message(role=MessageRole.SYSTEM, content=system_prompt),
            Message(role=MessageRole.USER, content="Create a button component")
        ],
        enable_caching=True,
        max_tokens=500
    )
    
    print(f"Response: {response1.text[:200]}...")
    print(f"Tokens: {response1.usage.total_tokens}")
    print(f"Cached: {response1.usage.cached_tokens}")
    
    # Second request - uses cached system prompt (90% cheaper on input!)
    print("\n📝 Second request (uses cache)...")
    response2 = await service.generate(
        model="claude-sonnet-4.5",
        messages=[
            Message(role=MessageRole.SYSTEM, content=system_prompt),
            Message(role=MessageRole.USER, content="Create a card component")
        ],
        enable_caching=True,
        max_tokens=500
    )
    
    print(f"Response: {response2.text[:200]}...")
    print(f"Tokens: {response2.usage.total_tokens}")
    print(f"Cached: {response2.usage.cached_tokens} 💰 (90% cost reduction!)")


async def example_structured_output():
    """Example 3: Structured JSON extraction"""
    print("\n" + "="*60)
    print("EXAMPLE 3: Structured JSON Output (guaranteed valid)")
    print("="*60)
    
    service = LLMService()
    
    schema = {
        "type": "object",
        "properties": {
            "colors": {
                "type": "object",
                "properties": {
                    "primary": {"type": "string"},
                    "secondary": {"type": "string"},
                    "accent": {"type": "string"}
                },
                "required": ["primary"]
            },
            "typography": {
                "type": "object",
                "properties": {
                    "headingFont": {"type": "string"},
                    "bodyFont": {"type": "string"}
                }
            }
        },
        "required": ["colors", "typography"]
    }
    
    response = await service.generate(
        model="claude-sonnet-4.5",
        messages=[
            Message(
                role=MessageRole.USER,
                content="""Extract design tokens from this description:
                "The site uses a vibrant blue (#2563EB) for primary actions, 
                soft gray (#6B7280) for secondary elements, and Poppins for 
                headings with Inter for body text."""
            )
        ],
        structured_output_schema=schema,
        max_tokens=500
    )
    
    print(f"\n✅ Guaranteed valid JSON:")
    import json
    print(json.dumps(response.structured_output, indent=2))


async def example_streaming():
    """Example 4: Streaming responses"""
    print("\n" + "="*60)
    print("EXAMPLE 4: Streaming (show progress as tokens arrive)")
    print("="*60)
    
    service = LLMService()
    
    print("\n📝 Generating story (streaming)...")
    print("-" * 60)
    
    async for chunk in service.generate_stream(
        model="claude-haiku-4.5",  # Fast model for streaming
        messages=[
            Message(
                role=MessageRole.USER,
                content="Write a very short haiku about code"
            )
        ],
        max_tokens=100
    ):
        print(chunk, end="", flush=True)
    
    print("\n" + "-" * 60)


async def example_model_selection():
    """Example 5: Smart model selection"""
    print("\n" + "="*60)
    print("EXAMPLE 5: Smart Model Selection")
    print("="*60)
    
    service = LLMService()
    
    # Get recommendations for different tasks
    tasks = [
        "vision_analysis",
        "code_generation",
        "deep_reasoning",
        "fast_evaluation"
    ]
    
    print("\n📊 Recommended models for different tasks:")
    print("-" * 60)
    
    for task in tasks:
        models = get_recommended_models(task)
        recommended = service.get_recommended_model(task, budget="medium")
        
        print(f"\n{task}:")
        print(f"  Recommended: {recommended}")
        print(f"  Alternatives: {', '.join(models[1:3])}")
        
        # Get model info
        info = get_model_info(recommended)
        if info:
            print(f"  Context: {info.context_window:,} tokens")
            print(f"  Pricing: ${info.input_price}/${info.output_price} per M tokens")


async def example_cost_tracking():
    """Example 6: Cost tracking"""
    print("\n" + "="*60)
    print("EXAMPLE 6: Cost Tracking")
    print("="*60)
    
    service = LLMService(enable_cost_tracking=True)
    
    # Make several requests
    print("\n📝 Making multiple requests...")
    
    models = ["claude-haiku-4.5", "claude-sonnet-4.5", "gemini-2.5-flash"]
    
    for model in models:
        await service.generate(
            model=model,
            messages=[
                Message(
                    role=MessageRole.USER,
                    content="Count from 1 to 5"
                )
            ],
            max_tokens=50
        )
        print(f"✓ Request with {model}")
    
    # Print cost summary
    print("\n" + "="*60)
    service.print_cost_summary()


async def example_reasoning_model():
    """Example 7: Using reasoning models for complex tasks"""
    print("\n" + "="*60)
    print("EXAMPLE 7: Reasoning Model (o4-mini for deep thinking)")
    print("="*60)
    
    service = LLMService()
    
    response = await service.generate(
        model="o4-mini",
        messages=[
            Message(
                role=MessageRole.USER,
                content="""Analyze this designer's approach and extract their core principles:

                Designer A consistently uses:
                - Large whitespace (2-3x standard)
                - Muted, desaturated colors
                - Subtle shadows (1-2px offset)
                - Minimal borders, relying on spacing
                - Sans-serif fonts exclusively
                
                What are the underlying principles driving these choices?
                What would they likely do for a modal dialog?"""
            )
        ],
        reasoning_effort="high",
        max_tokens=2000
    )
    
    print(f"\n💭 Reasoning tokens used: {response.usage.reasoning_tokens}")
    print(f"\n📝 Analysis:\n{response.text[:400]}...")


async def main():
    """Run all examples"""
    print("\n" + "="*60)
    print("LLM INFRASTRUCTURE EXAMPLES")
    print("For Osyle Taste Capture System")
    print("="*60)
    
    # Check API keys
    if not os.getenv("ANTHROPIC_API_KEY"):
        print("\n⚠️  ANTHROPIC_API_KEY not found in environment")
        print("Set it in your .env file or export it")
        return
    
    try:
        # Run examples
        await example_basic_generation()
        await example_with_caching()
        await example_structured_output()
        await example_streaming()
        await example_model_selection()
        await example_cost_tracking()
        await example_reasoning_model()
        
        print("\n" + "="*60)
        print("✅ All examples completed successfully!")
        print("="*60 + "\n")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
