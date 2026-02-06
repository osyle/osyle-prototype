"""
DTR Extraction Pipeline

Orchestrates the execution of all extraction passes.
Handles progress tracking, error handling, and result storage.
"""
from typing import Dict, Any, Optional, Callable, Awaitable
import asyncio
from .passes import run_pass_1
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