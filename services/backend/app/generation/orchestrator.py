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
from app.generation.multifile_parser import (
    parse_llm_output,
    add_shadcn_components_to_files,
    ensure_default_dependencies,
    normalize_file_paths
)


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
        responsive: bool = True,  # NEW: Enable responsive design (default True)
        image_generation_mode: str = "image_url"  # NEW: "ai" or "image_url"
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
            responsive=responsive,  # Pass responsive flag
            image_generation_mode=image_generation_mode  # Pass image generation mode
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
        
        # Single generation attempt - no retries
        buffer = ""
        last_checkpoint_count = 0
        last_sent_code = None
        
        try:
            # Use LLM service with streaming support
            stream = self.llm.generate_stream(
                model=model,
                messages=[Message(role=MessageRole.USER, content=prompt)],
                max_tokens=16000,
                temperature=0.7,
            )
            
            async for chunk in stream:
                buffer += chunk
                
                # Stream checkpoints on first (and only) attempt
                if websocket:
                    current_checkpoint_count = count_checkpoints(buffer)
                    
                    if current_checkpoint_count > last_checkpoint_count:
                        print(f"    🔍 Checkpoint {current_checkpoint_count} detected")
                        
                        # Extract code at this checkpoint
                        checkpoint_code = extract_at_checkpoint(buffer)
                        
                        if checkpoint_code and checkpoint_code != last_sent_code:
                            # Send checkpoint update to frontend
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
            print(f"\n    🏁 Stream complete. Processing output...")
            
            # Parse LLM output to support both legacy (single file) and new (multi-file) formats
            parsed_output = parse_llm_output(buffer)
            
            # Extract parsed data
            files = parsed_output["files"]
            entry = parsed_output.get("entry", "/App.tsx")
            dependencies = parsed_output.get("dependencies", {})
            output_format = parsed_output.get("format", "legacy")
            
            # Normalize file paths
            files = normalize_file_paths(files)
            
            # Add shadcn/ui components if they're referenced in the code
            # (Check if any file imports from '@/components/ui')
            uses_shadcn = any('@/components/ui' in code or 'from "@/components/ui' in code 
                             for code in files.values())
            
            if uses_shadcn:
                print("    📦 Adding shadcn/ui components...")
                files = add_shadcn_components_to_files(files)
            
            # Ensure default dependencies
            dependencies = ensure_default_dependencies(dependencies)
            
            print(f"\n    📄 Output format: {output_format}")
            print(f"    📁 Files: {len(files)}")
            print(f"    📦 Dependencies: {len(dependencies)}")
            for filepath in sorted(files.keys()):
                print(f"       - {filepath} ({len(files[filepath])} chars)")
            
            # CRITICAL: Clean checkpoints from ALL files, not just entry
            # Checkpoints are for progressive rendering during streaming,
            # but must be removed from final output
            print(f"    🧹 Cleaning checkpoints from {len(files)} files...")
            cleaned_files = {}
            for filepath, code in files.items():
                before_len = len(code)
                cleaned_code = _aggressive_clean_checkpoints(code)
                after_len = len(cleaned_code)
                if before_len != after_len:
                    print(f"       - {filepath}: removed {before_len - after_len} chars")
                cleaned_files[filepath] = cleaned_code
            
            files = cleaned_files
            
            # STEP: AI Image Generation (if enabled)
            if image_generation_mode == "ai":
                print(f"    🎨 Generating AI images for placeholders...")
                from app.generation.image_generation import get_image_service
                
                image_service = get_image_service(model="fal-ai/flux/schnell")
                image_cache = {}  # Cache images across all files in this generation
                
                # Process each file
                ai_processed_files = {}
                for filepath, code in files.items():
                    modified_code, image_cache = image_service.replace_placeholders_with_images(
                        code,
                        cache=image_cache
                    )
                    ai_processed_files[filepath] = modified_code
                
                files = ai_processed_files
                print(f"    ✅ AI image generation complete ({len(image_cache)} images generated/cached)")
            
            # For backward compatibility: extract main file code
            # This is the "/App.tsx" or entry point file
            final_code = files.get(entry, list(files.values())[0] if files else "")
            
            # Validate taste for logging/metrics only (non-blocking)
            validation_result = None
            fidelity_score = 0.0
            
            if validate_taste:
                print(f"    🔍 Validating taste (logging only)...")
                validator = TasteValidator(taste_data)
                validation_result = validator.validate(final_code)
                fidelity_score = validator.get_fidelity_score(validation_result)
                
                print(f"\n{'='*70}")
                print(f"TASTE VALIDATION RESULTS (LOGGING)")
                print(f"{'='*70}")
                print(f"Fidelity score: {fidelity_score:.1f}%")
                print(f"Violations: {len(validation_result.violations)}")
                print(f"Warnings: {len(validation_result.warnings)}")
                
                if validation_result.violations:
                    print(f"\nViolations (logged for future improvements):")
                    for v in validation_result.violations[:10]:
                        print(f"  - {v}")
                
                print(f"{'='*70}\n")
            
        except Exception as e:
            print(f"Error during generation: {e}")
            raise
        
        # Send final code via WebSocket
        if websocket:
            await websocket.send_json({
                "type": "screen_ready",
                "data": {
                    "screen_id": screen_id,
                    "ui_code": final_code,
                    "is_final": True,
                    "fidelity_score": fidelity_score if validation_result else None
                }
            })
            print(f"    ✓ Final code sent to frontend (Fidelity: {fidelity_score:.1f}%)")
        
        return {
            "code": final_code,  # Legacy field for backward compatibility
            "files": files,  # NEW: Multi-file structure
            "entry": entry,  # NEW: Entry point file
            "dependencies": dependencies,  # NEW: npm dependencies
            "output_format": output_format,  # NEW: "legacy" or "multifile"
            "validation": validation_result,
            "fidelity_score": fidelity_score,
            "metadata": {
                "model": model,
                "taste_source": taste_source,
                "attempts": 1
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