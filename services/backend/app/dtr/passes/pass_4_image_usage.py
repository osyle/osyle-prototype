"""
Pass 4: Image Usage Patterns

Analyzes how the designer uses imagery - photographs, illustrations,
graphics, avatars - in their designs.
"""
from typing import Dict, Any, Optional, List
import json
import os
import base64
from datetime import datetime
from .base import BasePass, PassRegistry
from app.llm import LLMService, Message, MessageRole
from app.dtr.schemas import Pass4ImageUsageDTR
from app.dtr.extractors.figma_parser import parse_figma_images
from app.dtr.extractors import analyze_image_usage_from_image


class Pass4ImageUsage(BasePass):
    """
    Pass 4: Image Usage Patterns
    
    Uses centralized vision analysis + Figma metadata extraction + asset extraction.
    """
    
    def __init__(self):
        super().__init__()
        self.llm = LLMService()
        self.resource_id: Optional[str] = None  # Set by pipeline for asset extraction
    
    async def execute(
        self,
        figma_json: Optional[Dict[str, Any]] = None,
        image_bytes: Optional[bytes] = None,
        image_format: str = "png",
        prev_passes: Optional[Dict[str, Any]] = None
    ) -> Pass4ImageUsageDTR:
        """
        Execute Pass 4 image usage extraction.
        
        Strategy:
        1. Use centralized vision analysis (analyze_image_usage_from_image)
        2. Extract Figma image metadata from JSON
        3. Merge vision + Figma data
        4. Extract embedded image assets from Figma JSON
        5. Generate narrative synthesis
        
        Args:
            figma_json: Optional Figma JSON data
            image_bytes: Optional image data (REQUIRED for vision analysis)
            image_format: Image format (png, jpg, webp)
            prev_passes: Results from previous passes (unused in Pass 4)
        
        Returns:
            Pass4ImageUsageDTR with image usage analysis
        """
        self._start_timing()
        
        # Image is required for this pass (vision-based)
        if image_bytes is None:
            return self._create_no_images_dtr()
        
        # Extract embedded images from Figma JSON (for asset extraction later)
        figma_image_exports = {}
        figma_image_data = None
        
        if figma_json:
            # Get embedded images
            figma_image_exports = figma_json.get("_imageExports", {})
            if figma_image_exports:
                print(f"Found {len(figma_image_exports)} embedded images in Figma JSON")
            
            # Parse image metadata
            figma_image_data = parse_figma_images(figma_json)
            image_count = figma_image_data.get("image_count", 0)
            print(f"Found {image_count} image nodes in Figma JSON metadata")
        
        # Run centralized vision analysis
        print("Running centralized vision analysis...")
        vision_analysis = await analyze_image_usage_from_image(image_bytes, image_format)
        
        # Safety check - ensure we have valid data
        if not vision_analysis or not isinstance(vision_analysis, dict):
            print("ERROR: Vision analysis returned None or invalid data")
            return self._create_no_images_dtr()
        
        print(f"Vision analysis complete: has_images={vision_analysis.get('has_images')}, placements={len(vision_analysis.get('placements', []))}")
        
        # Determine authority and confidence
        has_figma_images = figma_image_data and figma_image_data.get("has_images", False)
        authority = "hybrid" if figma_json and has_figma_images else "vision"
        confidence = 0.85 if authority == "hybrid" else 0.75
        
        # Merge Figma metadata if available
        if has_figma_images:
            vision_analysis = self._merge_figma_metadata(
                vision_analysis,
                figma_image_data.get("image_nodes", [])
            )
        
        # Extract image assets from embedded Figma data
        if figma_image_exports and self.resource_id:
            print(f"Extracting {len(figma_image_exports)} image assets...")
            vision_analysis["placements"] = await self._extract_image_assets(
                vision_analysis.get("placements", []),
                figma_image_exports,
                self.resource_id
            )
        
        # Generate narrative synthesis
        narrative = await self._generate_narrative(vision_analysis)
        if not narrative or not isinstance(narrative, str):
            narrative = "Image usage narrative could not be generated."
        vision_analysis["narrative"] = narrative
        
        # Add metadata
        elapsed = self._end_timing()
        vision_analysis["authority"] = authority
        vision_analysis["confidence"] = confidence
        vision_analysis["extracted_at"] = datetime.utcnow().isoformat()
        vision_analysis["extraction_time_ms"] = elapsed
        
        # Validate and return
        return Pass4ImageUsageDTR(**vision_analysis)
    
    def _merge_figma_metadata(
        self,
        vision_analysis: Dict[str, Any],
        figma_nodes: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Merge Figma metadata into vision analysis.
        
        Enhances vision-detected placements with exact coordinates from Figma.
        """
        placements = vision_analysis.get("placements", [])
        
        # For each vision-detected placement, try to match with Figma node
        for placement in placements:
            vision_coords = placement.get("coordinates", {})
            
            # Try to match by position/size similarity
            best_match = None
            best_distance = float('inf')
            
            for figma_node in figma_nodes:
                # Calculate distance between vision coords and Figma coords
                dx = abs(vision_coords.get("x", 0) - figma_node["x"])
                dy = abs(vision_coords.get("y", 0) - figma_node["y"])
                distance = dx + dy
                
                if distance < best_distance:
                    best_distance = distance
                    best_match = figma_node
            
            # If we found a good match (within 100px), enhance with Figma data
            if best_match and best_distance < 100:
                placement["coordinates"] = {
                    "x": best_match["x"],
                    "y": best_match["y"],
                    "width": best_match["width"],
                    "height": best_match["height"]
                }
                placement["treatment"]["border_radius"] = f"{best_match['corner_radius']}px"
                placement["figma_name"] = best_match["name"]
                placement["figma_node_id"] = best_match.get("id", "")  # For asset matching
        
        return vision_analysis
    
    async def _extract_image_assets(
        self,
        placements: List[Dict[str, Any]],
        figma_image_exports: Dict[str, str],
        resource_id: str
    ) -> List[Dict[str, Any]]:
        """
        Extract and save image assets from Figma JSON to S3.
        
        The Figma plugin embeds exported images as base64 in figma.json
        under the _imageExports key: { "node-id": "base64data", ... }
        
        This method extracts those images and saves them to S3.
        
        Args:
            placements: List of placement dicts from vision analysis
            figma_image_exports: Dict mapping node IDs to base64 image data
            resource_id: Resource ID
        
        Returns:
            Updated placements list with asset_path (S3 key) filled in
        """
        try:
            from app import db
            from app import storage as s3_storage
            
            # Get resource to find owner_id and taste_id
            resource = db.get_resource(resource_id)
            if not resource:
                print(f"⚠️  Resource {resource_id} not found, skipping image extraction")
                return placements
            
            owner_id = resource["owner_id"]
            taste_id = resource["taste_id"]
            
            # Save each embedded image to S3
            saved_images = {}
            for node_id, base64_data in figma_image_exports.items():
                try:
                    # Decode base64 to bytes
                    img_bytes = base64.b64decode(base64_data)
                    
                    # Generate S3 key for this image asset
                    # Format: resources/{owner_id}/{taste_id}/{resource_id}/dtr/assets/image-{node_id}.png
                    s3_key = f"resources/{owner_id}/{taste_id}/{resource_id}/dtr/assets/image-{node_id}.png"
                    
                    # Upload to S3
                    s3_storage.s3_client.put_object(
                        Bucket=s3_storage.S3_BUCKET,
                        Key=s3_key,
                        Body=img_bytes,
                        ContentType='image/png'
                    )
                    
                    saved_images[node_id] = s3_key
                    print(f"✓ Saved embedded image to S3: {s3_key}")
                except Exception as e:
                    print(f"✗ Failed to extract image {node_id}: {e}")
            
            print(f"Successfully extracted {len(saved_images)}/{len(figma_image_exports)} images to S3")
            
            # Match placements to extracted images
            matched_count = 0
            for placement in placements:
                figma_node_id = placement.get("figma_node_id")
                if figma_node_id and figma_node_id in saved_images:
                    placement["asset_path"] = saved_images[figma_node_id]
                    matched_count += 1
                    print(f"✓ Matched placement '{placement.get('role')}' to {saved_images[figma_node_id]}")
            
            print(f"Matched {matched_count}/{len(placements)} placements to assets")
            return placements
        
        except Exception as e:
            print(f"ERROR in _extract_image_assets: {e}")
            import traceback
            traceback.print_exc()
            return placements
    
    async def _generate_narrative(
        self,
        analysis_data: Dict[str, Any]
    ) -> str:
        """
        Generate rich narrative synthesis from structured analysis.
        
        Uses Claude for high-quality synthesis.
        """
        try:
            # Prepare analysis summary
            summary = f"""Image Usage Analysis:
- Has images: {analysis_data.get('has_images')}
- Density: {analysis_data.get('image_density')}
- Number of placements: {len(analysis_data.get('placements', []))}
- Content style: {analysis_data.get('content_style', {}).get('primary_type') if analysis_data.get('content_style') else 'None'}
- Rhythm: {analysis_data.get('rhythm')}

Placements:
{json.dumps(analysis_data.get('placements', []), indent=2)}

Content Style:
{json.dumps(analysis_data.get('content_style', {}), indent=2)}
"""
            
            system_prompt = """You are a design critic analyzing a designer's image usage philosophy.

Given the structured analysis of image usage in a design, synthesize a rich narrative that explains:
1. The designer's overall approach to imagery (sparingly vs heavily, decorative vs functional)
2. The visual character and consistency of the imagery
3. How images are integrated with the overall design system
4. The emotional/atmospheric role images play
5. Any notable patterns or signature approaches

Write 2-3 paragraphs that capture the essence of this designer's image philosophy.
Be specific and insightful, not generic.

Return ONLY the narrative text, no preamble."""
            
            response = await self.llm.generate(
                model="claude-sonnet-4.5",  # Changed from gemini for consistency
                messages=[
                    Message(role=MessageRole.SYSTEM, content=system_prompt),
                    Message(role=MessageRole.USER, content=summary)
                ],
                max_tokens=1000,  # Increased from 500 to prevent truncation
                temperature=0.3
            )
            
            # Claude responses use .text attribute
            narrative = response.text if hasattr(response, 'text') else "No narrative generated."
            
            # Warn if narrative seems truncated
            if len(narrative.strip()) < 100:
                print(f"Warning: Narrative seems truncated (length: {len(narrative)})")
            
            return narrative.strip()
        
        except Exception as e:
            print(f"ERROR in _generate_narrative: {e}")
            import traceback
            traceback.print_exc()
            return "Image usage narrative could not be generated due to an error."
    
    def _create_no_images_dtr(self) -> Pass4ImageUsageDTR:
        """Create minimal DTR when no image is available"""
        return Pass4ImageUsageDTR(
            authority="vision",
            confidence=0.0,
            has_images=False,
            image_density="unknown",
            placements=[],
            content_style=None,
            rhythm="No image available for analysis",
            narrative="Image analysis could not be performed - no image data provided.",
            extracted_at=datetime.utcnow().isoformat(),
            extraction_time_ms=0
        )


# Helper function for pipeline
async def run_pass_4(
    figma_json: Optional[Dict[str, Any]] = None,
    image_bytes: Optional[bytes] = None,
    image_format: str = "png"
) -> Pass4ImageUsageDTR:
    """
    Run Pass 4 image usage extraction.
    
    Convenience function for running Pass 4 directly.
    
    Args:
        figma_json: Optional Figma JSON document
        image_bytes: Optional image data
        image_format: Image format (png, jpg, webp)
    
    Returns:
        Pass4ImageUsageDTR with image usage analysis
    """
    pass_instance = Pass4ImageUsage()
    return await pass_instance.execute(
        figma_json=figma_json,
        image_bytes=image_bytes,
        image_format=image_format
    )