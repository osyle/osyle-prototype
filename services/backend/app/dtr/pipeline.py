"""
DTR Extraction Pipeline

Orchestrates the execution of all extraction passes.
Handles progress tracking, error handling, and result storage.
"""
from typing import Dict, Any, Optional, Callable, Awaitable
import asyncio
from .passes import run_pass_1, run_pass_2, run_pass_3, run_pass_4, Pass4ImageUsage
from .storage import (
    save_pass_result,
    save_complete_dtr,
    save_extraction_status,
    load_pass_result
)


# Type alias for progress callback
ProgressCallback = Callable[[str, str], Awaitable[None]]


class ExtractionPipeline:
    """
    Orchestrates DTR extraction for a single resource
    
    Runs passes in correct order and handles dependencies.
    """
    
    def __init__(
        self,
        resource_id: str,
        taste_id: str,
        progress_callback: Optional[ProgressCallback] = None
    ):
        """
        Initialize pipeline
        
        Args:
            resource_id: Resource UUID
            taste_id: Taste UUID  
            progress_callback: Optional async callback for progress updates
                               Called with (stage, message)
        """
        self.resource_id = resource_id
        self.taste_id = taste_id
        self.progress_callback = progress_callback
        
        # Results storage
        self.results: Dict[str, Any] = {}
    
    async def _report_progress(self, stage: str, message: str):
        """Report progress via callback if provided"""
        if self.progress_callback:
            await self.progress_callback(stage, message)
    
    async def run_pass_1_only(
        self,
        figma_json: Optional[Dict[str, Any]] = None,
        image_bytes: Optional[bytes] = None,
        image_format: str = "png"
    ) -> Dict[str, Any]:
        """
        Run only Pass 1 (for initial implementation)
        
        Args:
            figma_json: Optional Figma JSON document
            image_bytes: Optional image data
            image_format: Image format
        
        Returns:
            Pass 1 results
        """
        try:
            # Update status
            save_extraction_status(
                self.resource_id,
                status="processing",
                current_pass="pass_1_structure"
            )
            
            # Report progress
            await self._report_progress("pass-1", "Extracting structural skeleton...")
            
            # Run Pass 1
            result = await run_pass_1(
                figma_json=figma_json,
                image_bytes=image_bytes,
                image_format=image_format
            )
            
            # Convert to dict (use by_alias=True to get "global" instead of "global_density")
            result_dict = result.model_dump(by_alias=True)
            
            # Save result
            save_pass_result(
                self.resource_id,
                "pass_1_structure",
                result_dict
            )
            
            # Store in results
            self.results["pass_1_structure"] = result_dict
            
            # Update status
            save_extraction_status(
                self.resource_id,
                status="completed",
                current_pass="pass_1_structure"
            )
            
            # Report completion
            await self._report_progress("complete", "Pass 1 extraction completed")
            
            return result_dict
        
        except Exception as e:
            # Update status with error
            save_extraction_status(
                self.resource_id,
                status="failed",
                current_pass="pass_1_structure",
                error=str(e)
            )
            
            # Report error
            await self._report_progress("error", f"Pass 1 failed: {str(e)}")
            
            raise
    
    async def run_all_passes(
        self,
        figma_json: Optional[Dict[str, Any]] = None,
        image_bytes: Optional[bytes] = None,
        image_format: str = "png"
    ) -> Dict[str, Any]:
        """
        Run all extraction passes (TODO: implement remaining passes)
        
        For now, only runs Pass 1.
        
        Args:
            figma_json: Optional Figma JSON document
            image_bytes: Optional image data
            image_format: Image format
        
        Returns:
            Complete DTR results
        """
        # For now, just run Pass 1
        await self.run_pass_1_only(figma_json, image_bytes, image_format)
        
        # TODO: Run other passes
        # Passes 1-4b can run in parallel
        # Pass 5 depends on all others
        
        # Save complete DTR
        complete_dtr = {
            "pass_1_structure": self.results.get("pass_1_structure"),
            # TODO: Add other passes
        }
        
        save_complete_dtr(
            self.resource_id,
            self.taste_id,
            complete_dtr
        )
        
        return complete_dtr


# ============================================================================
# PUBLIC API
# ============================================================================

async def extract_dtr(
    resource_id: str,
    taste_id: str,
    figma_json: Optional[Dict[str, Any]] = None,
    image_bytes: Optional[bytes] = None,
    image_format: str = "png",
    progress_callback: Optional[ProgressCallback] = None
) -> Dict[str, Any]:
    """
    Extract DTR for a resource
    
    Main entry point for DTR extraction.
    
    Args:
        resource_id: Resource UUID
        taste_id: Taste UUID
        figma_json: Optional Figma JSON document
        image_bytes: Optional image data
        image_format: Image format
        progress_callback: Optional async callback for progress updates
    
    Returns:
        Extraction results
    """
    pipeline = ExtractionPipeline(resource_id, taste_id, progress_callback)
    
    # For now, only run Pass 1
    return await pipeline.run_pass_1_only(figma_json, image_bytes, image_format)


async def extract_pass_1_only(
    resource_id: str,
    taste_id: str,
    figma_json: Optional[Dict[str, Any]] = None,
    image_bytes: Optional[bytes] = None,
    image_format: str = "png",
    progress_callback: Optional[ProgressCallback] = None
) -> Dict[str, Any]:
    """
    Extract only Pass 1 (structural skeleton)
    
    Convenience function for Pass 1 extraction.
    
    Args:
        resource_id: Resource UUID
        taste_id: Taste UUID
        figma_json: Optional Figma JSON document
        image_bytes: Optional image data
        image_format: Image format
        progress_callback: Optional async callback for progress updates
    
    Returns:
        Pass 1 results
    """
    pipeline = ExtractionPipeline(resource_id, taste_id, progress_callback)
    return await pipeline.run_pass_1_only(figma_json, image_bytes, image_format)


async def extract_pass_2_only(
    resource_id: str,
    taste_id: str,
    figma_json: Optional[Dict[str, Any]] = None,
    image_bytes: Optional[bytes] = None,
    image_format: str = "png",
    progress_callback: Optional[ProgressCallback] = None
) -> Dict[str, Any]:
    """
    Extract only Pass 2 (surface treatment)
    
    Convenience function for Pass 2 extraction.
    
    Args:
        resource_id: Resource UUID
        taste_id: Taste UUID
        figma_json: Optional Figma JSON document
        image_bytes: Optional image data
        image_format: Image format
        progress_callback: Optional async callback for progress updates
    
    Returns:
        Pass 2 results
    """
    try:
        # Update status
        save_extraction_status(
            resource_id,
            status="processing",
            current_pass="pass_2_surface"
        )
        
        # Report progress
        if progress_callback:
            await progress_callback("pass-2", "Extracting surface treatment...")
        
        # Run Pass 2
        result = await run_pass_2(
            figma_json=figma_json,
            image_bytes=image_bytes,
            image_format=image_format
        )
        
        # Convert to dict
        result_dict = result.model_dump(by_alias=True)
        
        # Save result
        save_pass_result(
            resource_id,
            "pass_2_surface",
            result_dict
        )
        
        # Update status
        save_extraction_status(
            resource_id,
            status="completed",
            current_pass="pass_2_surface"
        )
        
        if progress_callback:
            await progress_callback("pass-2", "Surface treatment extraction complete")
        
        return result_dict
    
    except Exception as e:
        # Update status to failed
        save_extraction_status(
            resource_id,
            status="failed",
            current_pass="pass_2_surface",
            error=str(e)
        )
        raise


async def extract_pass_3_only(
    resource_id: str,
    taste_id: str,
    figma_json: Optional[Dict[str, Any]] = None,
    image_bytes: Optional[bytes] = None,
    image_format: str = "png",
    progress_callback: Optional[ProgressCallback] = None
) -> Dict[str, Any]:
    """
    Extract only Pass 3 (typography system)
    
    Convenience function for Pass 3 extraction.
    
    Args:
        resource_id: Resource UUID
        taste_id: Taste UUID
        figma_json: Optional Figma JSON document
        image_bytes: Optional image data
        image_format: Image format
        progress_callback: Optional async callback for progress updates
    
    Returns:
        Pass 3 results
    """
    try:
        # Update status
        save_extraction_status(
            resource_id,
            status="processing",
            current_pass="pass_3_typography"
        )
        
        # Report progress
        if progress_callback:
            await progress_callback("pass-3", "Extracting typography system...")
        
        # Run Pass 3
        result = await run_pass_3(
            figma_json=figma_json,
            image_bytes=image_bytes,
            image_format=image_format
        )
        
        # Convert to dict
        result_dict = result.model_dump(by_alias=True)
        
        # Save result
        save_pass_result(
            resource_id,
            "pass_3_typography",
            result_dict
        )
        
        # Update status
        save_extraction_status(
            resource_id,
            status="completed",
            current_pass="pass_3_typography"
        )
        
        if progress_callback:
            await progress_callback("pass-3", "Typography system extraction complete")
        
        return result_dict
    
    except Exception as e:
        # Update status to failed
        save_extraction_status(
            resource_id,
            status="failed",
            current_pass="pass_3_typography",
            error=str(e)
        )
        raise


async def extract_pass_4_only(
    resource_id: str,
    taste_id: str,
    figma_json: Optional[Dict[str, Any]] = None,
    image_bytes: Optional[bytes] = None,
    image_format: str = "png",
    progress_callback: Optional[ProgressCallback] = None
) -> Dict[str, Any]:
    """
    Extract only Pass 4 (image usage patterns)
    
    Convenience function for Pass 4 extraction.
    
    Args:
        resource_id: Resource UUID
        taste_id: Taste UUID
        figma_json: Optional Figma JSON document
        image_bytes: Image data (required for content analysis)
        image_format: Image format
        progress_callback: Optional async callback for progress updates
    
    Returns:
        Pass 4 results
    """
    try:
        # Update status
        save_extraction_status(
            resource_id,
            status="processing",
            current_pass="pass_4_image_usage"
        )
        
        # Report progress
        if progress_callback:
            await progress_callback("pass-4", "Analyzing image usage patterns...")
        
        # Run Pass 4 (pass resource_id for asset extraction)
        pass_4 = Pass4ImageUsage()
        pass_4.resource_id = resource_id  # Set resource_id for asset extraction
        result = await pass_4.execute(
            figma_json=figma_json,
            image_bytes=image_bytes,
            image_format=image_format
        )
        
        # Convert to dict
        result_dict = result.model_dump(by_alias=True)
        
        # Save result
        save_pass_result(
            resource_id,
            "pass_4_image_usage",
            result_dict
        )
        
        # Update status
        save_extraction_status(
            resource_id,
            status="completed",
            current_pass="pass_4_image_usage"
        )
        
        if progress_callback:
            await progress_callback("pass-4", "Image usage analysis complete")
        
        return result_dict
    
    except Exception as e:
        # Update status to failed
        save_extraction_status(
            resource_id,
            status="failed",
            current_pass="pass_4_image_usage",
            error=str(e)
        )
        raise


async def extract_pass_5_only(
    resource_id: str,
    taste_id: str,
    figma_json: Optional[Dict[str, Any]] = None,
    image_bytes: Optional[bytes] = None,
    image_format: str = "png",
    progress_callback: Optional[ProgressCallback] = None
) -> Dict[str, Any]:
    """
    Extract only Pass 5 (component vocabulary)
    
    Convenience function for Pass 5 extraction.
    
    Args:
        resource_id: Resource UUID
        taste_id: Taste UUID
        figma_json: Optional Figma JSON document
        image_bytes: Image data
        image_format: Image format
        progress_callback: Optional async callback for progress updates
    
    Returns:
        Pass 5 results
    """
    try:
        # Update status
        save_extraction_status(
            resource_id,
            status="processing",
            current_pass="pass_5_components"
        )
        
        # Report progress
        if progress_callback:
            await progress_callback("pass-5", "Identifying component vocabulary...")
        
        # Run Pass 5
        from .passes import run_pass_5
        result = await run_pass_5(
            figma_json=figma_json,
            image_bytes=image_bytes,
            image_format=image_format
        )
        
        # Convert to dict
        result_dict = result.model_dump(by_alias=True)
        
        # Save result
        save_pass_result(
            resource_id,
            "pass_5_components",
            result_dict
        )
        
        # Update status
        save_extraction_status(
            resource_id,
            status="completed",
            current_pass="pass_5_components"
        )
        
        if progress_callback:
            await progress_callback("pass-5", "Component vocabulary extraction complete")
        
        return result_dict
    
    except Exception as e:
        # Update status to failed
        save_extraction_status(
            resource_id,
            status="failed",
            current_pass="pass_5_components",
            error=str(e)
        )
        raise


async def extract_all_passes_parallel(
    resource_id: str,
    taste_id: str,
    figma_json: Optional[Dict[str, Any]] = None,
    image_bytes: Optional[bytes] = None,
    image_format: str = "png",
    progress_callback: Optional[ProgressCallback] = None
) -> Dict[str, Any]:
    """
    Run Passes 1-5 in parallel
    
    Passes 1-5 are independent and can run simultaneously for faster extraction.
    
    Args:
        resource_id: Resource UUID
        taste_id: Taste UUID
        figma_json: Optional Figma JSON document
        image_bytes: Optional image data
        image_format: Image format
        progress_callback: Optional async callback for progress updates
    
    Returns:
        Dict with results from all passes
    """
    # Update status to processing
    save_extraction_status(
        resource_id,
        status="processing",
        current_pass="all_passes_parallel"
    )
    
    if progress_callback:
        await progress_callback("start", "Running all extraction passes in parallel...")
    
    try:
        # Launch all passes in parallel
        pass_1_task = extract_pass_1_only(
            resource_id, taste_id, figma_json, image_bytes, image_format, progress_callback
        )
        pass_2_task = extract_pass_2_only(
            resource_id, taste_id, figma_json, image_bytes, image_format, progress_callback
        )
        pass_3_task = extract_pass_3_only(
            resource_id, taste_id, figma_json, image_bytes, image_format, progress_callback
        )
        pass_4_task = extract_pass_4_only(
            resource_id, taste_id, figma_json, image_bytes, image_format, progress_callback
        )
        pass_5_task = extract_pass_5_only(
            resource_id, taste_id, figma_json, image_bytes, image_format, progress_callback
        )
        
        # Wait for all to complete
        results = await asyncio.gather(
            pass_1_task,
            pass_2_task,
            pass_3_task,
            pass_4_task,
            pass_5_task,
            return_exceptions=True
        )
        
        pass_1_result, pass_2_result, pass_3_result, pass_4_result, pass_5_result = results
        
        # Check for errors
        errors = []
        if isinstance(pass_1_result, Exception):
            errors.append(f"Pass 1: {str(pass_1_result)}")
        if isinstance(pass_2_result, Exception):
            errors.append(f"Pass 2: {str(pass_2_result)}")
        if isinstance(pass_3_result, Exception):
            errors.append(f"Pass 3: {str(pass_3_result)}")
        if isinstance(pass_4_result, Exception):
            errors.append(f"Pass 4: {str(pass_4_result)}")
        if isinstance(pass_5_result, Exception):
            errors.append(f"Pass 5: {str(pass_5_result)}")
        
        if errors:
            error_msg = "; ".join(errors)
            save_extraction_status(
                resource_id,
                status="failed",
                current_pass="all_passes_parallel",
                error=error_msg
            )
            raise Exception(f"One or more passes failed: {error_msg}")
        
        # All passes succeeded
        save_extraction_status(
            resource_id,
            status="completed",
            current_pass="all_passes_parallel"
        )
        
        if progress_callback:
            await progress_callback("complete", "All extraction passes completed")
        
        return {
            "pass_1_structure": pass_1_result,
            "pass_2_surface": pass_2_result,
            "pass_3_typography": pass_3_result,
            "pass_4_image_usage": pass_4_result,
            "pass_5_components": pass_5_result
        }
    
    except Exception as e:
        save_extraction_status(
            resource_id,
            status="failed",
            current_pass="all_passes_parallel",
            error=str(e)
        )
        raise