# Production-Grade LLM Infrastructure

A comprehensive, multi-provider LLM abstraction layer built for production applications. Supports Claude, Gemini, and OpenAI with advanced features like prompt caching, structured outputs, reasoning models, and automatic cost tracking.

## Features

### Multi-Provider Support
- **Anthropic Claude 4.5** - Prompt caching, structured outputs, extended thinking
- **Google Gemini 2.5/3** - Context caching, superior vision, 1M token context
- **OpenAI GPT** - Reasoning models (o-series), vision, tool use

### Production-Ready Features
- ✅ Automatic retry with exponential backoff
- ✅ Cost tracking and monitoring
- ✅ Prompt caching (50-90% cost savings)
- ✅ Streaming support
- ✅ Structured outputs with JSON schema validation
- ✅ Tool use / function calling
- ✅ Vision capabilities (multimodal)
- ✅ Reasoning models (OpenAI o-series)
- ✅ Provider-agnostic APIs
- ✅ Comprehensive error handling

## Installation

```bash
# Install required packages
pip install anthropic google-generativeai openai --break-system-packages
```

## Configuration

Set API keys in environment variables:

```bash
# .env file
ANTHROPIC_API_KEY=your_claude_key
GOOGLE_API_KEY=your_gemini_key
OPENAI_API_KEY=your_openai_key

# Optional configuration
DEFAULT_LLM_MODEL=claude-sonnet-4.5
LLM_ENABLE_CACHING=true
LLM_LOG_PROMPTS=false
LLM_LOG_RESPONSES=false
```

## Quick Start

### Basic Text Generation

```python
from llm import LLMService, Message, MessageRole

service = LLMService()

response = await service.generate(
    model="claude-sonnet-4.5",
    messages=[
        Message(role=MessageRole.SYSTEM, content="You are a helpful assistant"),
        Message(role=MessageRole.USER, content="Explain quantum computing in simple terms")
    ]
)

print(response.text)
print(f"Cost: ${response.usage.total_tokens * 0.000003:.4f}")
```

### Streaming Response

```python
async for chunk in service.generate_stream(
    model="claude-sonnet-4.5",
    messages=[
        Message(role=MessageRole.USER, content="Write a story about AI")
    ]
):
    print(chunk, end="", flush=True)
```

### With Prompt Caching (50-90% cost savings)

```python
# System prompts are automatically cached when enable_caching=True
response = await service.generate(
    model="claude-sonnet-4.5",
    messages=[
        Message(
            role=MessageRole.SYSTEM,
            content="""You are an expert React developer.
            Follow these coding standards:
            - Use TypeScript with strict mode
            - Follow React hooks best practices
            - Write comprehensive JSDoc comments
            [... large style guide ...]"""
        ),
        Message(role=MessageRole.USER, content="Create a button component")
    ],
    enable_caching=True  # Caches system prompt automatically
)

# Subsequent requests with same system prompt use cached version
# Cost: ~90% reduction on input tokens!
```

### Vision / Multimodal

```python
from llm import ImageContent, TextContent

response = await service.generate(
    model="gemini-2.5-flash",  # Gemini has best vision
    messages=[
        Message(
            role=MessageRole.USER,
            content=[
                ImageContent(data=base64_image, media_type="image/png"),
                TextContent(text="What design patterns do you see in this UI?")
            ]
        )
    ]
)
```

### Structured JSON Output

```python
schema = {
    "type": "object",
    "properties": {
        "colors": {"type": "object"},
        "typography": {"type": "object"},
        "spacing": {"type": "array"}
    },
    "required": ["colors", "typography"]
}

response = await service.generate(
    model="claude-sonnet-4.5",
    messages=[
        Message(role=MessageRole.USER, content="Extract design tokens from this mockup")
    ],
    structured_output_schema=schema  # Guaranteed valid JSON matching schema
)

design_tokens = response.structured_output
```

### Reasoning Models (Deep Thinking)

```python
# Use o4-mini for complex reasoning tasks
response = await service.generate(
    model="o4-mini",
    messages=[
        Message(role=MessageRole.USER, content="""
            Analyze this designer's work and extract their taste model:
            - What principles guide their decisions?
            - What patterns emerge across projects?
            - How would they approach a new design?
        """)
    ],
    reasoning_effort="high",  # "low", "medium", or "high"
    max_tokens=8000
)

print(f"Thinking tokens used: {response.usage.reasoning_tokens}")
```

### Tool Use / Function Calling

```python
tools = [
    {
        "type": "function",
        "function": {
            "name": "render_component",
            "description": "Render a React component in sandbox",
            "parameters": {
                "type": "object",
                "properties": {
                    "code": {"type": "string"},
                    "component_type": {"type": "string"}
                },
                "required": ["code"]
            }
        }
    }
]

response = await service.generate(
    model="claude-sonnet-4.5",
    messages=[
        Message(role=MessageRole.USER, content="Create and render a button component")
    ],
    tools=tools
)

if response.tool_calls:
    for tool_call in response.tool_calls:
        print(f"Tool: {tool_call['name']}")
        print(f"Args: {tool_call['arguments']}")
```

## Model Selection Guide

### For Your Taste Capture System

Based on benchmarks and your requirements:

| Task | Recommended Model | Why |
|------|------------------|-----|
| **Visual Design Analysis** | `gemini-2.5-flash` | 72.7% ScreenSpot-Pro accuracy, best vision understanding |
| **Code Generation** | `claude-sonnet-4.5` | 0% edit error rate, cleanest React/Tailwind output |
| **Deep Reasoning** | `o4-mini` | Cost-efficient thinking, perfect for taste synthesis |
| **Fast Evaluation** | `claude-haiku-4.5` | Sub-second responses, 80% cheaper than Sonnet |
| **Structured Extraction** | `claude-sonnet-4.5` | 100% JSON schema compliance |

### Get Recommendations Programmatically

```python
# Get best model for a task
model = service.get_recommended_model(
    task="code_generation",
    budget="medium"  # "low", "medium", or "high"
)

# Or query directly
from llm import get_best_model_for_task
model = get_best_model_for_task("vision_analysis", budget="low")
```

## Cost Tracking

### Automatic Cost Tracking

```python
service = LLMService(enable_cost_tracking=True)

# Make requests...
await service.generate(...)
await service.generate(...)

# Print summary
service.print_cost_summary()
```

Output:
```
============================================================
LLM COST SUMMARY
============================================================
Total Cost: $0.1234
Total Requests: 15
Total Tokens: 45,230
Avg Cost/Request: $0.0082

By Model:
------------------------------------------------------------

claude-sonnet-4.5:
  Requests: 10
  Total Cost: $0.0980
  Avg Cost: $0.0098
  Tokens: 35,120 (Input: 28,000, Output: 7,120, Cached: 21,000)

gemini-2.5-flash:
  Requests: 5
  Total Cost: $0.0254
  Avg Cost: $0.0051
  Tokens: 10,110 (Input: 8,500, Output: 1,610, Cached: 0)
============================================================
```

### Manual Cost Tracking

```python
from llm import CostTracker

tracker = CostTracker(save_path="costs.json")

# Track responses
cost = tracker.track_request(response)
print(f"Request cost: ${cost.total_cost:.4f}")

# Get stats
stats = tracker.get_stats()
print(f"Total spent: ${stats['total_cost']:.4f}")
```

## Advanced Usage

### Custom Retry Configuration

```python
from llm import RetryConfig

service = LLMService(
    retry_config=RetryConfig(
        max_retries=5,
        initial_delay=2.0,
        max_delay=120.0,
        exponential_base=2.0
    )
)
```

### Multiple Providers

```python
# Use different models for different tasks
vision_response = await service.generate(
    model="gemini-2.5-flash",  # Best for vision
    messages=[...]
)

code_response = await service.generate(
    model="claude-sonnet-4.5",  # Best for code
    messages=[...]
)

reasoning_response = await service.generate(
    model="o4-mini",  # Best for reasoning
    messages=[...]
)
```

### Conversation Management

```python
# Build conversation progressively
messages = []

messages.append(Message(
    role=MessageRole.SYSTEM,
    content="You are a design system expert"
))

# First turn
messages.append(Message(role=MessageRole.USER, content="Analyze this design"))
response1 = await service.generate(model="gemini-2.5-flash", messages=messages)

# Add assistant response
messages.append(Message(role=MessageRole.ASSISTANT, content=response1.text))

# Second turn
messages.append(Message(role=MessageRole.USER, content="Now extract colors"))
response2 = await service.generate(
    model="gemini-2.5-flash",
    messages=messages,
    enable_caching=True  # Cache entire conversation history
)
```

## Architecture

```
llm/
├── __init__.py              # Public API
├── service.py               # High-level service
├── types.py                 # Type definitions
├── config.py                # Configuration
├── exceptions.py            # Custom exceptions
│
├── providers/               # Provider abstraction
│   ├── base.py              # Base provider interface
│   ├── anthropic.py         # Claude implementation
│   ├── google.py            # Gemini implementation
│   ├── openai.py            # OpenAI implementation
│   ├── registry.py          # Model registry
│   └── factory.py           # Provider factory
│
└── utils/                   # Utilities
    ├── retry.py             # Retry logic
    └── cost.py              # Cost tracking
```

## Best Practices

### 1. Use Prompt Caching for Repeated System Prompts

```python
# ❌ Bad: No caching, pays full price every time
for i in range(100):
    response = await service.generate(
        model="claude-sonnet-4.5",
        messages=[
            Message(role=MessageRole.SYSTEM, content=long_style_guide),
            Message(role=MessageRole.USER, content=f"Task {i}")
        ]
    )

# ✅ Good: Caches system prompt, 90% cost reduction
for i in range(100):
    response = await service.generate(
        model="claude-sonnet-4.5",
        messages=[
            Message(role=MessageRole.SYSTEM, content=long_style_guide),
            Message(role=MessageRole.USER, content=f"Task {i}")
        ],
        enable_caching=True  # System prompt cached after first request
    )
```

### 2. Choose the Right Model for the Task

```python
# ❌ Bad: Using expensive Opus for simple classification
model = "claude-opus-4.5"  # $5/$25 per M tokens

# ✅ Good: Use Haiku for simple tasks
model = "claude-haiku-4.5"  # $1/$5 per M tokens (5x cheaper)

# ✅ Best: Let the system recommend
model = service.get_recommended_model("classification", budget="low")
```

### 3. Use Structured Outputs for Reliability

```python
# ❌ Bad: Parse JSON manually with error handling
response = await service.generate(...)
try:
    data = json.loads(response.text.strip("```json").strip("```"))
except:
    # Handle parsing error...

# ✅ Good: Use structured outputs with schema
response = await service.generate(
    model="claude-sonnet-4.5",
    structured_output_schema=schema,
    ...
)
data = response.structured_output  # Guaranteed valid JSON
```

### 4. Enable Cost Tracking in Production

```python
# Always track costs to monitor spending
service = LLMService(enable_cost_tracking=True)

# Periodically review
service.print_cost_summary()
```

## Troubleshooting

### Rate Limits

Automatic retry handles rate limits, but you can customize:

```python
from llm import RetryConfig

config = RetryConfig(
    max_retries=5,
    initial_delay=2.0,
    max_delay=60.0
)

service = LLMService(retry_config=config)
```

### Context Length Errors

```python
from llm.exceptions import ContextLengthError

try:
    response = await service.generate(...)
except ContextLengthError as e:
    print(f"Context too long: {e.tokens_used}/{e.max_tokens}")
    # Handle by truncating or splitting into multiple requests
```

### Model Not Found

```python
# List available models
models = service.list_available_models()
print(models)

# Check if model exists
from llm import get_model_info
info = get_model_info("claude-sonnet-4.5")
if info:
    print(f"Context window: {info.context_window}")
```

## Performance Tips

1. **Use streaming** for long responses to show progress
2. **Enable caching** when you have repeated prompts
3. **Batch requests** when possible (process multiple in parallel)
4. **Choose appropriate models** - don't use Opus for simple tasks
5. **Monitor costs** regularly with built-in tracking

## License

MIT

## Support

For issues or questions, please refer to the main project documentation.
