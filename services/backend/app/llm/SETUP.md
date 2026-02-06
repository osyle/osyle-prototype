# Setup Guide

## Installation

1. **Copy the `llm` directory to your project:**
   ```bash
   cp -r llm /path/to/your/project/
   ```

2. **Install dependencies:**
   ```bash
   pip install -r llm/requirements.txt --break-system-packages
   ```

3. **Set up environment variables:**
   
   Create or update your `.env` file:
   ```bash
   # Required: At least one API key
   ANTHROPIC_API_KEY=sk-ant-...
   GOOGLE_API_KEY=...
   OPENAI_API_KEY=sk-...
   
   # Optional configuration
   DEFAULT_LLM_MODEL=claude-sonnet-4.5
   LLM_ENABLE_CACHING=true
   LLM_LOG_PROMPTS=false
   LLM_LOG_RESPONSES=false
   ```

4. **Load environment variables in your app:**
   ```python
   from dotenv import load_dotenv
   load_dotenv()
   ```

## Quick Test

Run the examples to verify setup:
```bash
python llm/examples.py
```

## Integration with Your Project

### Basic Usage

```python
from llm import LLMService, Message, MessageRole

# Initialize service (reads API keys from environment)
service = LLMService()

# Generate text
response = await service.generate(
    model="claude-sonnet-4.5",
    messages=[
        Message(role=MessageRole.SYSTEM, content="You are helpful"),
        Message(role=MessageRole.USER, content="Hello!")
    ]
)

print(response.text)
```

### For Taste Capture System

#### Pass 1-3: Analytical Extraction

```python
# Use Claude with caching for repeated design system context
response = await service.generate(
    model="claude-sonnet-4.5",
    messages=[
        Message(
            role=MessageRole.SYSTEM,
            content=compressed_figma_json  # Large context - will be cached
        ),
        Message(
            role=MessageRole.USER,
            content="Extract layout structure and breakpoints"
        )
    ],
    enable_caching=True,  # Cache the Figma JSON
    structured_output_schema=structure_schema,
    max_tokens=4096
)

design_structure = response.structured_output
```

#### Pass 4: Component Extraction (Vision)

```python
# Use Gemini for visual analysis
response = await service.generate(
    model="gemini-2.5-flash",  # Best vision model
    messages=[
        Message(
            role=MessageRole.USER,
            content=[
                ImageContent(data=screenshot_base64, media_type="image/png"),
                TextContent(text="Identify all button components and their variants")
            ]
        )
    ],
    structured_output_schema=components_schema
)

components = response.structured_output
```

#### Pass 5: Personality Analysis

```python
# Use o4-mini for deep reasoning
response = await service.generate(
    model="o4-mini",
    messages=[
        Message(
            role=MessageRole.USER,
            content=f"Analyze design personality: {design_analysis}"
        )
    ],
    reasoning_effort="high",
    max_tokens=8000
)

personality = response.text
```

#### Code Generation (Vibe-Coder)

```python
# Use Claude for code generation
response = await service.generate(
    model="claude-sonnet-4.5",
    messages=[
        Message(
            role=MessageRole.SYSTEM,
            content=dtm_context  # Designer Taste Model - cached
        ),
        Message(
            role=MessageRole.USER,
            content="Generate a button component matching this taste"
        )
    ],
    enable_caching=True,
    max_tokens=2048
)

component_code = response.text
```

#### Critic Agent (Visual Evaluation)

```python
# Use Gemini or Claude Haiku for fast evaluation
response = await service.generate(
    model="claude-haiku-4.5",  # Fast and cheap for evaluation
    messages=[
        Message(
            role=MessageRole.USER,
            content=[
                ImageContent(data=reference_image, media_type="image/png"),
                ImageContent(data=generated_image, media_type="image/png"),
                TextContent(text="Compare these designs. Score similarity 0-100.")
            ]
        )
    ],
    structured_output_schema={
        "type": "object",
        "properties": {
            "score": {"type": "number"},
            "issues": {"type": "array", "items": {"type": "string"}},
            "should_iterate": {"type": "boolean"}
        }
    }
)

evaluation = response.structured_output
```

## Cost Optimization

Enable cost tracking to monitor spending:

```python
service = LLMService(enable_cost_tracking=True)

# ... make requests ...

# Print summary periodically
service.print_cost_summary()
```

Expected costs for taste capture (per design):
- With caching: ~$0.05-0.15
- Without caching: ~$0.15-0.40

## Model Selection for Your System

Based on our research, here's the optimal setup:

| Component | Model | Why |
|-----------|-------|-----|
| Visual analysis (Pass 1-3 with images) | `gemini-2.5-flash` | Best vision, lowest cost |
| Structural analysis (Pass 1-3 from JSON) | `claude-sonnet-4.5` | Best structured output |
| Component extraction (Pass 4) | `gemini-2.5-flash` → `claude-sonnet-4.5` | Vision then code |
| Personality analysis (Pass 5) | `o4-mini` | Deep reasoning |
| Code generation (Vibe-Coder) | `claude-sonnet-4.5` | Best React/Tailwind |
| Evaluation (Critic) | `claude-haiku-4.5` | Fast, cheap, good enough |

## Environment Variables Reference

```bash
# API Keys (at least one required)
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...
OPENAI_API_KEY=sk-...

# Optional: Custom base URLs (for proxies, etc.)
ANTHROPIC_BASE_URL=https://...
GOOGLE_BASE_URL=https://...
OPENAI_BASE_URL=https://...

# Configuration
DEFAULT_LLM_MODEL=claude-sonnet-4.5
LLM_ENABLE_CACHING=true
LLM_ENABLE_RETRIES=true
LLM_ENABLE_FALLBACKS=true
LLM_ENABLE_COST_TRACKING=true
LLM_ENABLE_OBSERVABILITY=true

# Debugging
LLM_LOG_PROMPTS=false
LLM_LOG_RESPONSES=false
```

## Troubleshooting

### Import Errors
```bash
# Make sure llm directory is in Python path
export PYTHONPATH="/path/to/your/project:$PYTHONPATH"
```

### API Key Not Found
```bash
# Verify .env file is in correct location
ls -la .env

# Check environment variables are loaded
python -c "import os; print(os.getenv('ANTHROPIC_API_KEY'))"
```

### Rate Limits
The infrastructure automatically retries with exponential backoff. If you hit persistent rate limits:
```python
from llm import RetryConfig

service = LLMService(
    retry_config=RetryConfig(
        max_retries=5,
        initial_delay=2.0,
        max_delay=120.0
    )
)
```

## Next Steps

1. ✅ Install dependencies
2. ✅ Set up API keys
3. ✅ Run examples to verify
4. ✅ Integrate into taste capture pipeline
5. Monitor costs and optimize as needed

For questions, see README.md for detailed documentation.
