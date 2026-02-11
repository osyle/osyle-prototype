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
        model: str = "claude-sonnet-4.5",
        validate_taste: bool = True,
        websocket=None,
        screen_id: str = None,
        screen_name: str = None
    ) -> Dict[str, Any]:
        """
        Generate UI with PROGRESSIVE STREAMING and 4-layer taste constraints.
        
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
            
        Returns:
            Dict with:
                - code: Final cleaned UI code
                - validation: ValidationResult (if validate_taste=True)
                - metadata: Generation metadata
        """
        
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
        print(f"Streaming: {websocket is not None}")
        print(f"{'='*70}\n")
        
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
                temperature=0.7,
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
                if websocket:
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
            
            # Send final code via WebSocket FIRST (before validation - don't block rendering!)
            if websocket:
                await websocket.send_json({
                    "type": "screen_ready",
                    "data": {
                        "screen_id": screen_id,
                        "ui_code": final_code,
                        "is_final": True
                    }
                })
                print(f"    ✓ Final code sent to frontend")
            
            # Validate taste AFTER sending to frontend (async, non-blocking for UX)
            validation_result = None
            if validate_taste:
                print(f"    🔍 Validating taste (after sending to frontend)...")
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
                    for v in validation_result.violations[:5]:  # Show first 5
                        print(f"  - {v}")
                
                if validation_result.warnings:
                    print(f"\nWarnings:")
                    for w in validation_result.warnings[:3]:  # Show first 3
                        print(f"  - {w}")
                print(f"{'='*70}\n")
            
            return {
                "code": final_code,
                "validation": validation_result,
                "metadata": {
                    "model": model,
                    "prompt_length": len(prompt),
                    "checkpoints_detected": last_checkpoint_count,
                    "streaming_enabled": websocket is not None
                }
            }
            
        except Exception as e:
            print(f"    ✗ Error in streaming generation: {e}")
            import traceback
            traceback.print_exc()
            
            # Fallback: try non-streaming if streaming fails
            print(f"    ⚠️  Falling back to non-streaming generation")
            
            gen_response = await self.llm.generate(
                model=model,
                messages=[
                    Message(role=MessageRole.USER, content=prompt)
                ],
                temperature=0.7,
                max_tokens=16000
            )
            
            response = gen_response.text
            code = self._extract_code(response)
            
            # Send to frontend if websocket available
            if websocket:
                await websocket.send_json({
                    "type": "screen_ready",
                    "data": {
                        "screen_id": screen_id,
                        "ui_code": code,
                        "is_final": True
                    }
                })
            
            # Validate
            validation_result = None
            if validate_taste:
                validator = TasteValidator(taste_data)
                validation_result = validator.validate(code)
            
            return {
                "code": code,
                "validation": validation_result,
                "metadata": {
                    "model": model,
                    "prompt_length": len(prompt),
                    "fallback_used": True
                }
            }
    
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