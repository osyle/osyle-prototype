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
            max_tokens=10000,  # Increased for v2.0 parametric (needs more for analysis + variation_space + complete UI)
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
        Parse LLM response into variation_space and ui_code with maximum tolerance.
        Handles multiple format variations including extra backticks, case differences, etc.
        """
        
        # LOG THE FULL RESPONSE FOR DEBUGGING
        import os
        import datetime
        log_dir = "/app/logs"
        os.makedirs(log_dir, exist_ok=True)
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        log_file = f"{log_dir}/parametric_response_{timestamp}.txt"
        
        with open(log_file, 'w') as f:
            f.write("="*80 + "\n")
            f.write("PARAMETRIC LLM RESPONSE - FULL OUTPUT\n")
            f.write("="*80 + "\n\n")
            f.write(response_text)
            f.write("\n\n" + "="*80 + "\n")
            f.write("END OF RESPONSE\n")
            f.write("="*80 + "\n")
        
        print(f"\n{'='*80}")
        print(f"[PARAMETRIC PARSER] Response logged to: {log_file}")
        print(f"[PARAMETRIC PARSER] Response length: {len(response_text)} chars")
        print(f"{'='*80}\n")
        
        # ========================================
        # EXTRACT VARIATION_SPACE
        # ========================================
        
        variation_space = None
        variation_space_patterns = [
            # Pattern 1: Quadruple backticks + triple backticks (LLM is using this)
            r'````json\s*VARIATION_SPACE:\s*```json\s*(.*?)\s*```\s*````',
            
            # Pattern 2: Triple backticks only (expected format)
            r'VARIATION_SPACE:\s*```json\s*(.*?)\s*```',
            
            # Pattern 3: No code fence, JSON object directly
            r'VARIATION_SPACE:\s*(\{.*?\})\s*(?:UI_CODE:|$)',
            
            # Pattern 4: Reversed order
            r'```json\s*VARIATION_SPACE\s*(.*?)\s*```',
            
            # Pattern 5: Case insensitive loose matching
            r'variation[_\s]*space[:\s]*```json\s*(.*?)\s*```',
        ]
        
        for i, pattern in enumerate(variation_space_patterns, 1):
            match = re.search(pattern, response_text, re.DOTALL | re.IGNORECASE)
            if match:
                try:
                    json_text = match.group(1).strip()
                    # Remove any remaining backticks
                    json_text = re.sub(r'```\w*', '', json_text).strip()
                    variation_space = json.loads(json_text)
                    print(f"[PARSER] ✓ VARIATION_SPACE extracted using pattern {i}")
                    break
                except json.JSONDecodeError as e:
                    print(f"[PARSER] Pattern {i} matched but JSON parse failed: {e}")
                    continue
        
        if not variation_space:
            print(f"[PARSER] ✗ All patterns failed, trying fallback extraction...")
            
            # Fallback: Find any JSON with "dimensions" field
            json_objects = re.findall(r'\{[^{}]*"dimensions"[^{}]*\[.*?\].*?\}', response_text, re.DOTALL)
            if json_objects:
                for obj_text in json_objects:
                    try:
                        # Expand to get complete JSON object
                        start = response_text.index(obj_text)
                        bracket_count = 0
                        end = start
                        for i, char in enumerate(response_text[start:], start):
                            if char == '{':
                                bracket_count += 1
                            elif char == '}':
                                bracket_count -= 1
                                if bracket_count == 0:
                                    end = i + 1
                                    break
                        
                        full_json = response_text[start:end]
                        variation_space = json.loads(full_json)
                        print(f"[PARSER] ✓ VARIATION_SPACE extracted via fallback JSON search")
                        break
                    except Exception as e:
                        continue
        
        if not variation_space:
            print(f"[ERROR] Could not extract VARIATION_SPACE from response")
            print(f"[ERROR] Full response saved to: {log_file}")
            raise ValueError("Could not extract VARIATION_SPACE from response")
        
        # ========================================
        # EXTRACT UI_CODE
        # ========================================
        
        ui_code = None
        ui_code_patterns = [
            # Pattern 1: Standard with code fence and language tag
            r'UI_CODE:\s*```(?:jsx|javascript|tsx|typescript|js)\s*(.*?)\s*```',
            
            # Pattern 2: Without language tag
            r'UI_CODE:\s*```\s*(export default function.*?)\s*```',
            
            # Pattern 3: Without code fence
            r'UI_CODE:\s*(export default function.*?)(?:```|VARIATION_SPACE:|$)',
            
            # Pattern 4: Just grab everything after "export default function App"
            r'(export default function App\s*\([^)]*\)\s*\{.*)',
        ]
        
        for i, pattern in enumerate(ui_code_patterns, 1):
            match = re.search(pattern, response_text, re.DOTALL | re.IGNORECASE)
            if match:
                ui_code = match.group(1).strip()
                print(f"[PARSER] ✓ UI_CODE extracted using pattern {i}")
                print(f"[PARSER] UI_CODE length: {len(ui_code)} chars")
                
                # Check if truncated
                if not ui_code.rstrip().endswith('}'):
                    print(f"[PARSER] ⚠ WARNING: UI_CODE appears truncated (doesn't end with }})")
                    print(f"[PARSER] Last 100 chars: ...{ui_code[-100:]}")
                
                break
        
        if not ui_code:
            print(f"[ERROR] Could not extract UI_CODE from response")
            print(f"[ERROR] Full response saved to: {log_file}")
            raise ValueError("Could not extract UI_CODE from response")
        
        # ========================================
        # VALIDATE & RETURN
        # ========================================
        
        if 'dimensions' not in variation_space:
            raise ValueError("VARIATION_SPACE missing 'dimensions' field")
        
        if not ui_code.startswith('export default function'):
            print(f"[PARSER] ⚠ WARNING: UI_CODE doesn't start with 'export default function'")
        
        print(f"[PARSER] ✓ Successfully parsed parametric response")
        print(f"[PARSER] Dimensions: {len(variation_space['dimensions'])}")
        print(f"[PARSER] UI_CODE length: {len(ui_code)} chars\n")
        
        return {
            'variation_space': variation_space,
            'ui_code': ui_code
        }
        
        ui_code = ui_code_match.group(1).strip()
        
        # Clean up code (remove any markdown artifacts)
        ui_code = ui_code.replace('```jsx', '').replace('```typescript', '').replace('```javascript', '').replace('```', '').strip()
        
        return {
            'ui_code': ui_code,
            'variation_space': variation_space
        }
    
    def _validate_result(self, result: Dict[str, Any]):
        """Validate the parametric result with enhanced checks"""
        
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
            
            # Quality checks (warnings, not errors)
            if 'affects' in dim and len(dim['affects']) < 3:
                print(f"  ⚠ Dimension '{dim['id']}' affects <3 properties - might be too narrow")
            
            if dim['min_label'].lower() in ['low', 'small', 'less'] or dim['max_label'].lower() in ['high', 'large', 'more']:
                print(f"  ⚠ Dimension '{dim['id']}' has generic labels - consider more contextual labels")
            
            # Check for design thinking indicators
            has_pattern = 'pattern' in dim
            has_philosophical = 'philosophical_extremes' in dim
            has_type = 'type' in dim
            
            if has_pattern or has_philosophical or has_type:
                print(f"  ✓ Dimension '{dim['id']}' shows design abstraction thinking")
        
        print(f"  ✓ Validation passed")


# Export
__all__ = ["ParametricGenerator"]