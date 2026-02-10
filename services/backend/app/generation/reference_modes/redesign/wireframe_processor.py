"""
Wireframe Processing for Redesign Mode

This module strips all styling information from reference files (Figma JSON and images),
keeping only structural and content information needed for wireframing.

Used when reference_mode == "redesign" to ensure the LLM cannot see any styling
that it might accidentally copy.
"""

import base64
import io
from typing import Dict, List, Any, Optional
import json


def extract_figma_wireframe(figma_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Strip all styling from Figma JSON, keeping only structure and content.
    
    REMOVES:
    - fills (colors, gradients, images)
    - strokes (colors, weights)
    - effects (shadows, blurs)
    - opacity
    - blendMode
    - any style-related properties
    
    KEEPS:
    - type (FRAME, TEXT, RECTANGLE, etc.)
    - name
    - characters (text content)
    - layoutMode (HORIZONTAL, VERTICAL, NONE)
    - constraints
    - size categories (not exact pixels)
    - relative positioning
    - component hierarchy
    
    Args:
        figma_data: Full Figma JSON data
        
    Returns:
        Wireframe-only JSON with styling stripped
    """
    
    def categorize_size(width: float, height: float) -> str:
        """Categorize size instead of exact pixels"""
        area = width * height
        if area < 2000:
            return "small"  # icons, small text
        elif area < 10000:
            return "medium"  # buttons, input fields
        elif area < 50000:
            return "large"   # cards, sections
        else:
            return "extra_large"  # full backgrounds, containers
    
    def strip_node(node: Dict[str, Any]) -> Dict[str, Any]:
        """Recursively strip styling from a node"""
        wireframe_node = {
            'type': node.get('type'),
            'name': node.get('name', ''),
        }
        
        # Keep text content (most important!)
        if node.get('characters'):
            wireframe_node['characters'] = node['characters']
        
        # Keep layout mode (how children are arranged)
        if 'layoutMode' in node:
            wireframe_node['layoutMode'] = node['layoutMode']
        
        # Generalize size to categories
        if 'absoluteBoundingBox' in node:
            bbox = node['absoluteBoundingBox']
            wireframe_node['size_category'] = categorize_size(
                bbox.get('width', 0), 
                bbox.get('height', 0)
            )
            # Keep aspect ratio for proportions
            if bbox.get('height', 0) > 0:
                wireframe_node['aspect_ratio'] = round(
                    bbox.get('width', 0) / bbox['height'], 
                    2
                )
        
        # Keep constraints (how element is positioned relative to parent)
        if 'constraints' in node:
            wireframe_node['constraints'] = node['constraints']
        
        # Keep component instance info (if it's a component)
        if node.get('type') == 'INSTANCE':
            wireframe_node['is_component_instance'] = True
        
        # Recursively process children
        if 'children' in node and isinstance(node['children'], list):
            wireframe_node['children'] = [
                strip_node(child) for child in node['children']
            ]
        
        return wireframe_node
    
    # Process the entire document
    wireframe = {
        'wireframe_mode': True,
        'note': 'All styling has been removed. Only structure and content remain.',
        'document': strip_node(figma_data.get('document', {}))
    }
    
    return wireframe


def convert_image_to_wireframe(base64_image: str) -> str:
    """
    Convert a color image to a grayscale wireframe.
    
    Uses grayscale conversion with optional edge detection to create
    a wireframe-like appearance that shows layout without color information.
    
    Args:
        base64_image: Base64-encoded image data
        
    Returns:
        Base64-encoded wireframe image (grayscale)
    """
    try:
        from PIL import Image, ImageOps, ImageFilter
        
        # Decode base64
        image_data = base64.b64decode(base64_image)
        image = Image.open(io.BytesIO(image_data))
        
        # Convert to RGB if needed (in case of RGBA)
        if image.mode in ('RGBA', 'LA', 'P'):
            # Create white background
            background = Image.new('RGB', image.size, (255, 255, 255))
            if image.mode == 'P':
                image = image.convert('RGBA')
            background.paste(image, mask=image.split()[-1] if image.mode in ('RGBA', 'LA') else None)
            image = background
        
        # Convert to grayscale
        gray_image = ImageOps.grayscale(image)
        
        # Optional: Enhance edges slightly for better wireframe feel
        # (subtle edge enhancement without full edge detection)
        enhanced = gray_image.filter(ImageFilter.EDGE_ENHANCE)
        
        # Blend original grayscale with enhanced version (70/30 mix)
        from PIL import ImageChops
        result = ImageChops.blend(gray_image, enhanced, 0.3)
        
        # Re-encode to base64
        buffer = io.BytesIO()
        result.save(buffer, format='PNG')
        buffer.seek(0)
        
        return base64.b64encode(buffer.getvalue()).decode('utf-8')
        
    except ImportError:
        # PIL not available, return original (fallback)
        print("WARNING: PIL not available, returning original image")
        return base64_image
    except Exception as e:
        # Any error, return original
        print(f"WARNING: Error converting to wireframe: {e}")
        return base64_image


async def extract_wireframe_description(
    base64_image: str,
    llm_client: Any,
    media_type: str = "image/png"
) -> str:
    """
    Use Claude vision to extract a text-based wireframe description.
    
    Calls Claude with a special prompt to analyze the image and extract
    only structural/content information, ignoring all styling.
    
    Args:
        base64_image: Base64-encoded image data
        llm_client: LLM client instance with call_claude method
        media_type: Image media type (default: image/png)
        
    Returns:
        Markdown-formatted wireframe description
    """
    try:
        response = await llm_client.call_claude(
            prompt_name="extract_wireframe_structure",
            user_message=[
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": media_type,
                        "data": base64_image
                    }
                }
            ],
            max_tokens=3000,
            temperature=0.3  # Lower temperature for more structured output
        )
        
        wireframe_text = response.get("text", "")
        return wireframe_text
        
    except Exception as e:
        print(f"ERROR: Failed to extract wireframe description: {e}")
        return f"# Wireframe Extraction Failed\n\nError: {str(e)}\n\nProceeding with image-only wireframe."


async def process_redesign_references(
    reference_files: Dict[str, Any],
    llm_client: Any
) -> Dict[str, Any]:
    """
    Process reference files for redesign mode.
    
    Strips all styling and returns wireframe-only representations:
    - Figma JSON: Structure and content only (no colors, effects, etc.)
    - Images: Text descriptions + grayscale wireframes
    
    Args:
        reference_files: Dict with 'figma_data' and 'images' keys
        llm_client: LLM client for vision analysis
        
    Returns:
        Dict with processed wireframe data:
        {
            'wireframe_figma': {...},  # Stripped Figma JSON
            'wireframe_descriptions': [...],  # Text descriptions of images
            'wireframe_images': [...],  # Grayscale wireframe images
            'has_wireframes': True
        }
    """
    processed = {
        'wireframe_figma': None,
        'wireframe_descriptions': [],
        'wireframe_images': [],
        'has_wireframes': False
    }
    
    # Process Figma data if available
    if reference_files.get('figma_data'):
        print("  → Stripping styling from Figma JSON...")
        processed['wireframe_figma'] = extract_figma_wireframe(
            reference_files['figma_data']
        )
        processed['has_wireframes'] = True
    
    # Process images if available
    if reference_files.get('images'):
        print(f"  → Processing {len(reference_files['images'])} reference images...")
        
        for idx, img in enumerate(reference_files['images']):
            print(f"    - Image {idx + 1}: Extracting wireframe description...")
            
            # Extract text description using vision
            description = await extract_wireframe_description(
                img['data'],
                llm_client,
                img.get('media_type', 'image/png')
            )
            processed['wireframe_descriptions'].append(description)
            
            print(f"    - Image {idx + 1}: Converting to grayscale wireframe...")
            
            # Convert to wireframe image
            wireframe_img = convert_image_to_wireframe(img['data'])
            processed['wireframe_images'].append({
                'data': wireframe_img,
                'media_type': 'image/png'
            })
            
            processed['has_wireframes'] = True
    
    return processed


def prepare_wireframe_for_llm(wireframe_data: Dict[str, Any], max_depth: int = 6) -> str:
    """
    Prepare wireframe Figma data for LLM context.
    
    Similar to prepare_figma_for_llm but for wireframe-only data.
    Formats it as readable JSON.
    
    Args:
        wireframe_data: Wireframe Figma JSON
        max_depth: Maximum nesting depth to include
        
    Returns:
        Formatted JSON string
    """
    try:
        # Pretty print with indentation
        formatted = json.dumps(wireframe_data, indent=2)
        
        # Add a header note
        header = "=== WIREFRAME DATA (STYLING REMOVED) ===\n\n"
        
        return header + formatted
        
    except Exception as e:
        print(f"ERROR: Failed to format wireframe data: {e}")
        return str(wireframe_data)


# Export main functions
__all__ = [
    'extract_figma_wireframe',
    'convert_image_to_wireframe',
    'extract_wireframe_description',
    'process_redesign_references',
    'prepare_wireframe_for_llm'
]