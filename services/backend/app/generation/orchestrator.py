"""
Generation Orchestrator - NEW DTM System with 4-Layer Constraints

This is the core generation engine using the 10x taste system:
1. Hard constraints (exact tokens)
2. Strong preferences (patterns)
3. Contextual reasoning (personality)
4. Few-shot learning (code examples)
"""
from typing import Dict, Any, List, Optional
import json

from app.llm.types import Message, MessageRole
from app.generation.parametric import ParametricGenerator
from app.generation.prompt_assembler import PromptAssembler
from app.generation.validator import TasteValidator


class GenerationOrchestrator:
    """Orchestrate UI generation using NEW DTM system with 4-layer constraints"""
    
    def __init__(self, llm_client, storage_client):
        """
        Args:
            llm_client: LLM service
            storage_client: S3 storage service
        """
        self.llm = llm_client
        self.storage = storage_client
        self.prompt_assembler = PromptAssembler()
    
    async def generate_ui(
        self,
        task_description: str,
        taste_data: Dict[str, Any],
        taste_source: str,  # "dtr", "subset_dtm", or "full_dtm"
        device_info: Dict[str, Any],
        flow_context: Optional[Dict[str, Any]] = None,
        rendering_mode: str = "react",
        model: str = "claude-sonnet-4.5",
        validate_taste: bool = True
    ) -> Dict[str, Any]:
        """
        Generate UI using NEW DTM system (4-layer constraints)
        
        Args:
            task_description: What to build
            taste_data: DTM or DTR data (from new system)
            taste_source: Source type ("dtr", "subset_dtm", "full_dtm")
            device_info: Platform and screen dimensions
            flow_context: Optional flow context for multi-screen
            rendering_mode: "react" or "parametric"
            model: Target LLM model
            validate_taste: Whether to validate output against taste
        
        Returns:
            Dict with:
                - code: Generated React code
                - validation: ValidationResult (if validate_taste=True)
                - metadata: Generation metadata
        """
        
        # For parametric mode, use existing parametric generator
        if rendering_mode == "parametric":
            return await self._generate_parametric(
                task_description=task_description,
                taste_data=taste_data,
                device_info=device_info,
                model=model
            )
        
        # Assemble prompt using new 4-layer system
        prompt = self.prompt_assembler.assemble(
            task_description=task_description,
            taste_data=taste_data,
            taste_source=taste_source,
            device_info=device_info,
            flow_context=flow_context,
            mode="default",
            model=model
        )
        
        print(f"\n{'='*70}")
        print(f"GENERATING UI - NEW 4-LAYER TASTE SYSTEM")
        print(f"{'='*70}")
        print(f"Task: {task_description[:100]}...")
        print(f"Taste source: {taste_source}")
        print(f"Device: {device_info.get('platform')} {device_info.get('screen', {}).get('width')}x{device_info.get('screen', {}).get('height')}")
        print(f"Model: {model}")
        print(f"Prompt length: {len(prompt)} chars")
        print(f"{'='*70}\n")
        
        # Generate with LLM
        gen_response = await self.llm.generate(
            model=model,
            messages=[
                Message(role=MessageRole.USER, content=prompt)
            ],
            temperature=0.7,
            max_tokens=16000
        )
        
        # Extract text from response object
        response = gen_response.text
        
        # Extract code from response
        code = self._extract_code(response)
        
        # Validate against taste (if enabled)
        validation_result = None
        if validate_taste:
            validator = TasteValidator(taste_data)
            validation_result = validator.validate(code)
            fidelity_score = validator.get_fidelity_score(validation_result)
            
            print(f"\n{'='*70}")
            print(f"TASTE VALIDATION RESULTS")
            print(f"{'='*70}")
            print(f"Fidelity score: {fidelity_score:.1f}%")
            print(f"Passed: {validation_result.passed}")
            print(f"Violations: {len(validation_result.violations)}")
            print(f"Warnings: {len(validation_result.warnings)}")
            
            if validation_result.violations:
                print(f"\nViolations:")
                for violation in validation_result.violations[:5]:  # Show first 5
                    print(f"  - {violation}")
            
            if validation_result.warnings:
                print(f"\nWarnings:")
                for warning in validation_result.warnings[:3]:  # Show first 3
                    print(f"  - {warning}")
            
            print(f"{'='*70}\n")
        
        return {
            "code": code,
            "validation": validation_result,
            "metadata": {
                "model": model,
                "taste_source": taste_source,
                "prompt_length": len(prompt),
                "response_length": len(response)
            }
        }
    
    async def _generate_parametric(
        self,
        task_description: str,
        taste_data: Dict[str, Any],
        device_info: Dict[str, Any],
        model: str
    ) -> Dict[str, Any]:
        """Generate parametric UI (uses existing generator)"""
        
        # Create parametric generator
        parametric = ParametricGenerator(self.llm, self.storage)
        
        # Extract DTM context for parametric mode
        dtm_context = self._extract_dtm_context_for_parametric(taste_data)
        
        # Generate
        result = await parametric.generate(
            task_description=task_description,
            dtm_context=dtm_context,
            device_info=device_info,
            model=model
        )
        
        return {
            "code": result.get("code", ""),
            "variation_space": result.get("variation_space", {}),
            "metadata": {
                "model": model,
                "mode": "parametric"
            }
        }
    
    def _extract_dtm_context_for_parametric(self, taste_data: Dict[str, Any]) -> Dict[str, Any]:
        """Extract simplified DTM context for parametric mode"""
        
        exact_tokens = taste_data.get("consolidated_tokens", taste_data.get("exact_tokens", {}))
        
        # Extract colors
        colors = {}
        color_data = exact_tokens.get("colors", {})
        if "exact_palette" in color_data:
            colors["palette"] = [
                {"hex": c.get("hex"), "role": c.get("role")}
                for c in color_data["exact_palette"][:10]  # Limit to 10
            ]
        
        # Extract typography
        typography = {}
        typo_data = exact_tokens.get("typography", {})
        if "families" in typo_data:
            typography["families"] = [
                f.get("name", f.get("family_name"))
                for f in typo_data["families"][:3]  # Limit to 3
            ]
        if "sizes_used" in typo_data:
            typography["sizes"] = sorted(typo_data["sizes_used"])[:8]  # Limit to 8
        
        # Extract spacing
        spacing = {}
        spacing_data = exact_tokens.get("spacing", {})
        if "quantum" in spacing_data:
            spacing["quantum"] = spacing_data["quantum"]
        if "scale" in spacing_data:
            spacing["scale"] = spacing_data["scale"][:8]  # Limit to 8
        
        return {
            "colors": colors,
            "typography": typography,
            "spacing": spacing,
            "patterns": taste_data.get("consensus_narrative", {})
        }
    
    def _extract_code(self, response: str) -> str:
        """Extract React code from LLM response"""
        
        # If response is already clean code (starts with export), return as-is
        if response.strip().startswith("export default function App"):
            return response
        
        # Try to extract code from markdown blocks
        import re
        
        # Match ```jsx, ```javascript, ```tsx, ```typescript, or ``` blocks
        patterns = [
            r'```(?:jsx|javascript|tsx|typescript)\s*\n(.*?)```',
            r'```\s*\n(.*?)```'
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, response, re.DOTALL)
            if matches:
                # Return first match
                return matches[0].strip()
        
        # If no markdown blocks, return full response (might be clean code)
        return response.strip()