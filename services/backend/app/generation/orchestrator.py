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
import re

from app.llm.types import Message, MessageRole, GenerationConfig
from app.llm.config import get_config
from app.generation.parametric import ParametricGenerator
from app.generation.prompt_assembler import PromptAssembler
from app.generation.validator import TasteValidator
from app.generation.checkpoints import extract_at_checkpoint, count_checkpoints, _aggressive_clean_checkpoints


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
        model: str = None,
        validate_taste: bool = True,
        websocket=None,
        screen_id: str = None,
        screen_name: str = None,
        responsive: bool = True  # NEW: Enable responsive design (default True)
    ) -> Dict[str, Any]:
        """
        Generate UI with PROGRESSIVE STREAMING and 4-layer taste constraints.
        
        Args:
            model: Model to use (defaults to DEFAULT_LLM_MODEL from env)
            responsive: Enable responsive design mode (default: True for fluid layouts)
        
        Always uses streaming with checkpoints for real-time preview.
        Sends checkpoint updates via WebSocket as code is generated.
        
        Args:
            task_description: What to build
            taste_data: DTM or DTR data (from new system)
            taste_source: Source type ("dtr", "subset_dtm", "full_dtm")
            device_info: Platform and screen dimensions
            flow_context: Optional flow context for multi-screen
            rendering_mode: "react" or "parametric"
            model: LLM model to use
            validate_taste: Whether to validate against taste constraints
            websocket: WebSocket connection for progressive updates
            screen_id: Screen identifier for WebSocket messages
            screen_name: Screen name for logging
            responsive: Enable responsive design (True = fluid layouts, False = fixed dimensions)
            
        Returns:
            Dict with:
                - code: Final cleaned UI code
                - validation: ValidationResult (if validate_taste=True)
                - metadata: Generation metadata
        """
        
        # Use env default model if not specified
        if model is None:
            model = get_config().default_model
        
        # Handle parametric mode
        if rendering_mode == "parametric":
            parametric = ParametricGenerator(self.llm, self.storage)
            return await parametric.generate(
                task_description=task_description,
                taste_data=taste_data,
                device_info=device_info
            )
        
        # Build prompt with 4-layer system
        prompt = self.prompt_assembler.assemble(
            task_description=task_description,
            taste_data=taste_data,
            taste_source=taste_source,
            device_info=device_info,
            flow_context=flow_context,
            mode="default",
            model=model,
            responsive=responsive  # Pass responsive flag
        )
        
        print(f"\n{'='*70}")
        print(f"GENERATING UI - NEW 4-LAYER TASTE SYSTEM")
        print(f"{'='*70}")
        print(f"Task: {task_description[:100]}...")
        print(f"Taste source: {taste_source}")
        print(f"Device: {device_info.get('platform')} {device_info.get('screen', {}).get('width')}x{device_info.get('screen', {}).get('height')}")
        print(f"Model: {model}")
        print(f"Responsive: {responsive}")
        print(f"Prompt length: {len(prompt)} chars")
        print(f"Streaming: {websocket is not None}")
        print(f"{'='*70}\n")
        
        # RETRY LOOP for taste validation
        max_retries = 2  # Try up to 3 times total (1 initial + 2 retries)
        best_result = None
        best_fidelity = 0.0
        
        for attempt in range(max_retries + 1):
            if attempt > 0:
                print(f"\n🔄 RETRY ATTEMPT {attempt}/{max_retries}")
                print(f"Previous fidelity: {best_fidelity:.1f}% - Retrying with violation feedback...\n")
                
                # Add violation feedback to prompt
                violation_context = self._format_violation_feedback(best_result)
                prompt = prompt + "\n\n" + violation_context
        
            # Stream with checkpoint detection  
            buffer = ""
            last_checkpoint_count = 0
            last_sent_code = None
            
            try:
                # CRITICAL FIX: LLM service's retry wrapper breaks async generators
                # Access provider directly to bypass retry wrapper for streaming
                config = GenerationConfig(
                    model=model,
                    max_tokens=16000,
                    temperature=0.7 if attempt == 0 else 0.5,  # Lower temperature on retries
                    stream=True
                )
                
                provider = self.llm.factory.get_provider_for_model(model)
                stream = provider.generate_stream(
                    messages=[Message(role=MessageRole.USER, content=prompt)],
                    config=config
                )
                
                async for chunk in stream:
                    buffer += chunk
                    
                    # Check for new checkpoint if websocket available
                    if websocket and attempt == max_retries:  # Only stream checkpoints on final attempt
                        current_checkpoint_count = count_checkpoints(buffer)
                        
                        if current_checkpoint_count > last_checkpoint_count:
                            print(f"    🔍 Checkpoint {current_checkpoint_count} detected")
                            
                            # Extract code at this checkpoint
                            checkpoint_code = extract_at_checkpoint(buffer)
                            
                            if checkpoint_code and checkpoint_code != last_sent_code:
                                # Send checkpoint update to frontend (NO validation - don't block!)
                                await websocket.send_json({
                                    "type": "ui_checkpoint",
                                    "data": {
                                        "screen_id": screen_id,
                                        "ui_code": checkpoint_code,
                                        "checkpoint_number": current_checkpoint_count,
                                        "is_final": False
                                    }
                                })
                                
                                last_sent_code = checkpoint_code
                                last_checkpoint_count = current_checkpoint_count
                                print(f"    ✓ Checkpoint {current_checkpoint_count} sent")
                
                # Stream complete - clean final code
                print(f"\n    🏁 Stream complete. Cleaning final code...")
                
                # Remove code fences and checkpoints
                final_code = self._clean_code_fences(buffer)
                final_code = _aggressive_clean_checkpoints(final_code)
                
                # Validate taste to decide if retry needed
                validation_result = None
                fidelity_score = 0.0
                
                if validate_taste:
                    print(f"    🔍 Validating taste...")
                    validator = TasteValidator(taste_data)
                    validation_result = validator.validate(final_code)
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
                        for v in validation_result.violations[:10]:  # Show top 10
                            print(f"  - {v}")
                    
                    if validation_result.warnings:
                        print(f"\nWarnings:")
                        for w in validation_result.warnings[:5]:  # Show first 5
                            print(f"  - {w}")
                    
                    print(f"{'='*70}\n")
                
                # Save best result
                if fidelity_score > best_fidelity:
                    best_fidelity = fidelity_score
                    best_result = {
                        "code": final_code,
                        "validation": validation_result,
                        "fidelity": fidelity_score
                    }
                
                # Check if we should stop retrying
                if fidelity_score >= 90.0:  # Target: 90%+ fidelity
                    print(f"✅ EXCELLENT FIDELITY ({fidelity_score:.1f}%) - Accepting result")
                    break
                elif attempt < max_retries:
                    print(f"⚠️  FIDELITY TOO LOW ({fidelity_score:.1f}%) - Will retry")
                else:
                    print(f"⚠️  FIDELITY ({fidelity_score:.1f}%) - Max retries reached, using best result")
                
            except Exception as e:
                print(f"Error during generation attempt {attempt}: {e}")
                if attempt == max_retries:
                    raise
                continue
        
        # Use best result from all attempts
        if best_result is None:
            raise Exception("All generation attempts failed")
        
        final_code = best_result["code"]
        validation_result = best_result["validation"]
        
        # Send final code via WebSocket
        if websocket:
            await websocket.send_json({
                "type": "screen_ready",
                "data": {
                    "screen_id": screen_id,
                    "ui_code": final_code,
                    "is_final": True,
                    "fidelity_score": best_fidelity if validation_result else None
                }
            })
            print(f"    ✓ Final code sent to frontend (Fidelity: {best_fidelity:.1f}%)")
        
        return {
            "code": final_code,
            "validation": validation_result,
            "fidelity_score": best_fidelity,
            "metadata": {
                "model": model,
                "taste_source": taste_source,
                "attempts": attempt + 1
            }
        }
    
    def _format_violation_feedback(self, previous_result: Dict[str, Any]) -> str:
        """Format validation violations as feedback for retry"""
        if not previous_result or not previous_result.get("validation"):
            return ""
        
        validation = previous_result["validation"]
        violations = validation.violations
        
        if not violations:
            return ""
        
        feedback = [
            "\n\n# ⚠️ CRITICAL CORRECTIONS NEEDED ⚠️\n",
            "The previous attempt had taste violations. You MUST fix these:\n"
        ]
        
        # Group violations by type
        font_violations = [v for v in violations if "font" in v.lower()]
        spacing_violations = [v for v in violations if "spacing" in v.lower()]
        color_violations = [v for v in violations if "color" in v.lower()]
        
        if font_violations:
            feedback.append("\n## Font Violations - FIX THESE:\n")
            for v in font_violations[:5]:
                feedback.append(f"- {v}\n")
            feedback.append("\n**ACTION**: Review approved font families and use ONLY those fonts.\n")
        
        if spacing_violations:
            feedback.append("\n## Spacing Violations - FIX THESE:\n")
            for v in spacing_violations[:5]:
                feedback.append(f"- {v}\n")
            feedback.append("\n**ACTION**: Check approved spacing scale and use ONLY those values.\n")
        
        if color_violations:
            feedback.append("\n## Color Violations - FIX THESE:\n")
            for v in color_violations[:5]:
                feedback.append(f"- {v}\n")
            feedback.append("\n**ACTION**: Review approved color palette and use ONLY those hex values.\n")
        
        feedback.append("\n**REMEMBER**: Layer 1 constraints are NON-NEGOTIABLE. You must use ONLY approved tokens.\n")
        
        return "".join(feedback)
    
    def _clean_code_fences(self, code: str) -> str:
        """Remove markdown code fences"""
        code = re.sub(r'```(?:typescript|tsx|jsx|javascript|js|react)?\n', '', code)
        code = re.sub(r'\n```\s*$', '', code)
        code = re.sub(r'^```\s*', '', code)
        return code.strip()
    
    def _extract_code(self, response: str) -> str:
        """Extract code from LLM response (remove fences, cleanup)"""
        # Remove markdown code fences
        code = self._clean_code_fences(response)
        
        # Remove any checkpoint markers that might have slipped through
        code = _aggressive_clean_checkpoints(code)
        
        return code