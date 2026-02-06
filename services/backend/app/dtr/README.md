# DTR (Design Taste Representation) Module

Extract, understand, and store a designer's taste from reference designs.

## Status: Phase 1 - Pass 1 Only

Currently implements **Pass 1: Structural Skeleton** extraction.

Remaining passes (2-5) are TODO.

## What Pass 1 Extracts

- **Layout topology**: Column structure, grid system, nesting depth
- **Visual hierarchy**: Heading levels and how hierarchy is established
- **Content density**: Sparse vs dense sections
- **Spacing system**: Base unit (quantum), scale, consistency

## Three Input Scenarios

### Scenario A: Figma JSON Only
- **Source**: Code parsing of Figma node tree
- **Authority**: `"code"`
- **Confidence**: 0.90 (high - exact measurements)

### Scenario B: Image Only
- **Source**: LLM vision analysis (Gemini 2.5 Flash)
- **Authority**: `"vision"`
- **Confidence**: 0.65 (medium - approximate measurements)

### Scenario C: Both Figma JSON + Image
- **Source**: Code parsing + vision validation
- **Authority**: `"hybrid"`
- **Confidence**: 0.95 (highest - exact + validated)

## Directory Structure

```
app/dtr/
├── __init__.py                   # Public API
├── schemas.py                    # Pydantic schemas for DTR outputs
├── pipeline.py                   # Extraction orchestrator
├── storage.py                    # Local file storage
├── websocket_handler.py          # WebSocket integration
│
├── extractors/                   # Low-level extraction
│   ├── figma_parser.py           # Parse Figma JSON
│   ├── vision.py                 # LLM vision analysis
│   └── algorithmic.py            # Optional CV algorithms
│
├── passes/                       # Pass implementations
│   ├── base.py                   # BasePass class
│   └── pass_1_structure.py       # ✅ Pass 1 implementation
│
└── utils/                        # Utilities
    ├── confidence.py             # Confidence scoring
    └── validators.py             # Schema validation
```

## Usage

### Direct Extraction

```python
from app.dtr import extract_pass_1_only

# Extract from Figma JSON
result = await extract_pass_1_only(
    resource_id="abc-123",
    taste_id="def-456",
    figma_json=figma_data
)

# Extract from image
result = await extract_pass_1_only(
    resource_id="abc-123",
    taste_id="def-456",
    image_bytes=image_data,
    image_format="png"
)

# Extract from both (best)
result = await extract_pass_1_only(
    resource_id="abc-123",
    taste_id="def-456",
    figma_json=figma_data,
    image_bytes=image_data
)
```

### With Progress Callbacks

```python
async def progress_callback(stage: str, message: str):
    print(f"[{stage}] {message}")

result = await extract_pass_1_only(
    resource_id="abc-123",
    taste_id="def-456",
    figma_json=figma_data,
    progress_callback=progress_callback
)
```

### Via WebSocket

Frontend sends:
```json
{
  "action": "build-dtr",
  "data": {
    "resource_id": "abc-123",
    "taste_id": "def-456"
  }
}
```

Backend handles in WebSocket router (see `websocket_handler.py`).

### Loading Results

```python
from app.dtr import load_pass_result

# Load latest Pass 1 result
result = load_pass_result(
    resource_id="abc-123",
    pass_name="pass_1_structure",
    version="latest"
)
```

## Storage

Results are saved to local files (not database yet):

```
/app/dtr_outputs/
└── {resource_id}/
    ├── pass_1_structure_20260205_143022.json
    ├── pass_1_structure_latest.json
    └── extraction_status.json
```

Files are accessible via Docker volume mount at `../../dtr_outputs/` on host.

## Output Schema

```json
{
  "authority": "code | vision | hybrid",
  "confidence": 0.90,
  "layout": {
    "type": "sidebar_content | hero_sections | card_grid | ...",
    "columns": {
      "count": 12,
      "widths": [200, 800],
      "gap": "24px"
    },
    "direction": "vertical",
    "nesting_depth": 4
  },
  "hierarchy": {
    "levels": [
      {
        "rank": 1,
        "elements": ["hero_heading"],
        "established_by": "size + position"
      }
    ]
  },
  "density": {
    "global": 0.45,
    "per_section": [
      {"section": "hero", "density": 0.25},
      {"section": "features_grid", "density": 0.65}
    ]
  },
  "spacing": {
    "quantum": "8px",
    "scale": [4, 8, 16, 24, 32, 48, 64],
    "consistency": 0.88
  },
  "extracted_at": "2026-02-05T14:30:22.123456",
  "extraction_time_ms": 2456
}
```

## Integration Points

### 1. After Resource Upload

Hook into the PATCH endpoint that marks files uploaded:

```python
# In tastes.py
@router.patch("/{taste_id}/resources/{resource_id}")
async def update_resource(...):
    # ... existing code ...
    
    # If both files now uploaded, trigger extraction
    if updated.get("has_figma") and updated.get("has_image"):
        # Trigger async extraction (don't block response)
        asyncio.create_task(
            extract_pass_1_only(
                resource_id=resource_id,
                taste_id=taste_id
            )
        )
    
    return updated
```

### 2. Via WebSocket

Add to your WebSocket handler:

```python
from app.dtr.websocket_handler import handle_build_dtr_action

if action == "build-dtr":
    result = await handle_build_dtr_action(data["data"], send_message)
```

## Testing

### Test with sample Figma JSON

```python
import asyncio
from app.dtr import extract_pass_1_only

async def test():
    figma_json = {
        "document": {
            "children": [{
                "type": "CANVAS",
                "children": [{
                    "type": "FRAME",
                    "name": "Main",
                    "children": [
                        # ... Figma nodes
                    ]
                }]
            }]
        }
    }
    
    result = await extract_pass_1_only(
        resource_id="test-123",
        taste_id="test-taste",
        figma_json=figma_json
    )
    
    print(f"Authority: {result['authority']}")
    print(f"Confidence: {result['confidence']}")
    print(f"Layout type: {result['layout']['type']}")

asyncio.run(test())
```

## Next Steps (TODO)

1. ✅ Pass 1: Structural Skeleton
2. ⬜ Pass 2: Surface Treatment (colors, materials, effects)
3. ⬜ Pass 3: Typography System
4. ⬜ Pass 4: Component Vocabulary (agentic loop with sandbox)
5. ⬜ Pass 4b: Image Usage Patterns
6. ⬜ Pass 5: Personality and Philosophy
7. ⬜ Pass 6: DTM Synthesis (across multiple resources)
8. ⬜ Database integration (replace local file storage)
9. ⬜ Sandbox environment for component rendering
10. ⬜ Critic agent for visual validation

## Dependencies

Required:
- `app/llm/` - LLM service (already built)
- Anthropic API key (for Claude)
- Google API key (for Gemini 2.5 Flash vision)

Optional (for future passes):
- `scikit-learn` - K-means color clustering
- `opencv-python` - Edge detection
- `numpy` - Numerical processing

## Notes

- Files are saved locally via Docker volume (not in database)
- Vision analysis uses Gemini 2.5 Flash (best vision model)
- Figma parsing is pure Python (no LLM cost)
- Pass 1 typically completes in 2-5 seconds
- Confidence scores can be used downstream for constraint strength
