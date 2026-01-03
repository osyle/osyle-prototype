"""
Parametric UI Generator

Generates UI components with embedded variation dimensions that allow
real-time parameter adjustments without LLM regeneration.
"""

from typing import Dict, Any, Optional
import json
import re
import os
from datetime import datetime


class ParametricGenerator:
    """Generates parametric UI with variation space"""
    
    def __init__(self, llm_client):
        """
        Args:
            llm_client: LLM service for Claude API calls
        """
        self.llm = llm_client
        
        # Load interpolation utilities for post-injection
        utilities_path = os.path.join(
            os.path.dirname(__file__),
            'interpolation_reference.js'
        )
        with open(utilities_path, 'r') as f:
            # Remove the comment block at the top, keep only the functions
            content = f.read()
            # Find where the actual code starts (after the comment block)
            code_start = content.find('function interpolate(')
            if code_start != -1:
                self.interpolation_code = '\n' + content[code_start:]
            else:
                self.interpolation_code = content
    
    async def generate(
        self,
        task_description: str,
        dtm: Dict[str, Any],
        device_info: Dict[str, Any],
        screen_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Generate parametric UI with variation space
        
        Args:
            task_description: What this UI should accomplish
            dtm: Designer Taste Model (DTM v3) with learned taste
            device_info: Device dimensions and platform
            screen_context: Optional flow context
            
        Returns:
            {
                'ui_code': str,  # Parametric React component
                'variation_space': dict  # Variation dimensions
            }
        """
        
        print(f"\n{'='*60}")
        print(f"PARAMETRIC GENERATION")
        print(f"{'='*60}")
        print(f"Task: {task_description}")
        print(f"Device: {device_info['platform']} {device_info['screen']['width']}x{device_info['screen']['height']}")
        
        # Build user message with task context
        dtm_context = self._extract_dtm_context(dtm)
        user_message = f"""
## TASK
{task_description}

## DEVICE
Platform: {device_info['platform']}
Screen: {device_info['screen']['width']}px × {device_info['screen']['height']}px

## YOUR DESIGNER'S TASTE
{dtm_context}
"""
        
        # Call LLM
        print("\n[1/3] Calling LLM for parametric generation...")
        response = await self.llm.call_claude(
            prompt_name="generate_ui_parametric",
            user_message=user_message,
            max_tokens=6000,
            temperature=0.7
        )
        
        # Parse response
        print("[2/3] Parsing parametric response...")
        result = self._parse_parametric_response(response['text'])
        
        # Inject interpolation utilities
        print("[2.5/3] Injecting interpolation utilities...")
        result['ui_code'] = result['ui_code'].strip() + '\n' + self.interpolation_code
        
        # Validate
        print("[3/3] Validating variation space...")
        self._validate_result(result)
        
        print(f"\n✓ Parametric generation complete")
        print(f"  Dimensions: {len(result['variation_space']['dimensions'])}")
        print(f"  Code length: {len(result['ui_code'])} chars")
        
        return result
    
    
    def _extract_dtm_context(self, dtm: Dict[str, Any]) -> str:
        """Extract relevant taste context from DTM"""
        
        context_parts = []
        
        # Spacing system
        if "designer_systems" in dtm and "spacing" in dtm["designer_systems"]:
            spacing = dtm["designer_systems"]["spacing"]
            context_parts.append(f"Spacing quantum: {spacing.get('default', 8)}px")
        
        # Typography
        if "designer_systems" in dtm and "typography" in dtm["designer_systems"]:
            typo = dtm["designer_systems"]["typography"]
            if "common_sizes" in typo:
                context_parts.append(f"Common font sizes: {', '.join(map(str, typo['common_sizes'][:5]))}px")
        
        # Color palette
        if "designer_systems" in dtm and "colors" in dtm["designer_systems"]:
            colors = dtm["designer_systems"]["colors"]
            if "primary_palette" in colors:
                palette = colors['primary_palette'][:5]
                context_parts.append(f"Primary colors: {', '.join(palette)}")
        
        # Signature patterns (top 3)
        if "signature_patterns" in dtm:
            patterns = dtm["signature_patterns"][:3]
            if patterns:
                pattern_names = [p.get('pattern_type', 'unknown') for p in patterns]
                context_parts.append(f"Signature patterns: {', '.join(pattern_names)}")
        
        return "\n".join(f"- {part}" for part in context_parts)
    
    def _parse_parametric_response(self, response_text: str) -> Dict[str, Any]:
        """
        Parse LLM response into variation_space and ui_code
        
        Expected format:
        VARIATION_SPACE:
        {json}
        
        UI_CODE:
        {react code}
        """
        
        # Extract variation space
        variation_space_match = re.search(
            r'VARIATION_SPACE:\s*```json\s*(.*?)\s*```',
            response_text,
            re.DOTALL
        )
        
        if not variation_space_match:
            # Try without code fence
            variation_space_match = re.search(
                r'VARIATION_SPACE:\s*(\{.*?\})\s*UI_CODE:',
                response_text,
                re.DOTALL
            )
        
        if not variation_space_match:
            raise ValueError("Could not find VARIATION_SPACE in response")
        
        variation_space_json = variation_space_match.group(1).strip()
        variation_space = json.loads(variation_space_json)
        
        # Extract UI code
        ui_code_match = re.search(
            r'UI_CODE:\s*```(?:jsx|javascript|tsx|typescript)?\s*(.*?)\s*```',
            response_text,
            re.DOTALL
        )
        
        if not ui_code_match:
            # Try without code fence
            ui_code_match = re.search(
                r'UI_CODE:\s*(export default function.*)',
                response_text,
                re.DOTALL
            )
        
        if not ui_code_match:
            raise ValueError("Could not find UI_CODE in response")
        
        ui_code = ui_code_match.group(1).strip()
        
        # Clean up code (remove any markdown artifacts)
        ui_code = ui_code.replace('```jsx', '').replace('```typescript', '').replace('```javascript', '').replace('```', '').strip()
        
        return {
            'ui_code': ui_code,
            'variation_space': variation_space
        }
    
    def _validate_result(self, result: Dict[str, Any]):
        """Validate the parametric result"""
        
        # Check structure
        if 'ui_code' not in result:
            raise ValueError("Missing ui_code in result")
        
        if 'variation_space' not in result:
            raise ValueError("Missing variation_space in result")
        
        variation_space = result['variation_space']
        
        # Check variation space structure
        if 'dimensions' not in variation_space:
            raise ValueError("Missing dimensions in variation_space")
        
        dimensions = variation_space['dimensions']
        
        # Check dimension count
        if not (2 <= len(dimensions) <= 4):
            print(f"WARNING: Expected 2-4 dimensions, got {len(dimensions)}")
        
        # Validate each dimension
        required_fields = ['id', 'label', 'description', 'min_label', 'max_label', 'default_value']
        for dim in dimensions:
            for field in required_fields:
                if field not in dim:
                    raise ValueError(f"Dimension missing required field: {field}")
            
            # Check default value
            if not (0 <= dim['default_value'] <= 100):
                raise ValueError(f"Default value must be 0-100, got {dim['default_value']}")
        
        print(f"  ✓ Validation passed")


# Export
__all__ = ["ParametricGenerator"]