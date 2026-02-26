"""
Image Generation Service
Handles AI image generation using fal.ai and caching
"""
import os
import re
import hashlib
import fal_client
from typing import Dict, List, Optional, Tuple
from functools import lru_cache


class ImageGenerationService:
    """Service to generate images using fal.ai API"""
    
    def __init__(self, model: str = "fal-ai/flux/schnell"):
        """
        Initialize image generation service
        
        Args:
            model: fal.ai model to use (schnell, dev, or pro)
        """
        self.model = model
        # fal_client reads FAL_KEY natively; also support FALAI_API_KEY as alias
        self.api_key = os.getenv("FAL_KEY") or os.getenv("FALAI_API_KEY")
        if not self.api_key:
            print("⚠️  WARNING: Neither FAL_KEY nor FALAI_API_KEY is set. Image generation will fail.")
        else:
            # Ensure fal_client can find it
            os.environ.setdefault("FAL_KEY", self.api_key)
    
    def generate_image(
        self, 
        prompt: str, 
        width: int = 1024, 
        height: int = 768,
        num_inference_steps: int = 4
    ) -> Optional[str]:
        """
        Generate a single image from prompt
        
        Args:
            prompt: Text description of the image
            width: Image width
            height: Image height
            num_inference_steps: Number of inference steps (1-4 for schnell)
            
        Returns:
            Image URL or None if generation fails
        """
        if not self.api_key:
            print("❌ FAL_KEY not set, cannot generate image")
            return None
        
        try:
            print(f"🎨 Generating image: '{prompt[:50]}...'")
            
            # Call fal.ai API
            result = fal_client.run(
                self.model,
                arguments={
                    "prompt": prompt,
                    "image_size": {
                        "width": width,
                        "height": height
                    },
                    "num_inference_steps": num_inference_steps,
                    "num_images": 1
                }
            )
            
            # Extract image URL
            if result and "images" in result and len(result["images"]) > 0:
                image_url = result["images"][0]["url"]
                print(f"✅ Image generated: {image_url[:80]}...")
                return image_url
            else:
                print(f"❌ No image returned from API")
                return None
                
        except Exception as e:
            print(f"❌ Image generation failed: {e}")
            return None
    
    def extract_image_placeholders(self, code: str) -> List[Dict[str, str]]:
        """
        Extract image placeholder descriptions from code
        
        Patterns:
          src="GENERATE:description here"       (JSX attribute, double quotes)
          src='GENERATE:description here'       (JSX attribute, single quotes)
          'GENERATE:description here'           (JS string value, single quotes)
          "GENERATE:description here"           (JS string value, double quotes)
        
        Returns:
            List of dicts with 'match', 'description', 'width', 'height'
        """
        # Match all quote variants + backticks, deduplicate by match string
        patterns = [
            r'src="(GENERATE:[^"]+)"',    # JSX double-quote
            r"src='(GENERATE:[^']+)'",    # JSX single-quote
            r'src=`(GENERATE:[^`]+)`',     # JSX backtick
            r'"(GENERATE:[^"]+)"',        # JS string double-quote
            r"'(GENERATE:[^']+)'",        # JS string single-quote
            r'`(GENERATE:[^`]+)`',         # JS template literal
        ]
        
        seen = set()  # dedup by GENERATE: content, not by full match string
        placeholders = []
        for pat in patterns:
            for match in re.finditer(pat, code):
                full_match = match.group(0)
                generate_content = match.group(1)  # e.g. "GENERATE:a mountain..."
                if generate_content in seen:
                    continue
                seen.add(generate_content)
                content = generate_content[len("GENERATE:"):]  # strip "GENERATE:" prefix
                
                # Check for dimension hint: "description|WIDTHxHEIGHT"
                if "|" in content:
                    description, dimensions = content.split("|", 1)
                    description = description.strip()
                    if "x" in dimensions:
                        try:
                            w, h = dimensions.split("x")
                            width, height = int(w.strip()), int(h.strip())
                        except:
                            width, height = 1024, 768
                    else:
                        width, height = 1024, 768
                else:
                    description = content.strip()
                    width, height = 1024, 768
                
                placeholders.append({
                    "match": full_match,
                    "description": description,
                    "width": width,
                    "height": height
                })
        
        return placeholders
    
    def replace_placeholders_with_images(
        self, 
        code: str,
        cache: Optional[Dict[str, str]] = None
    ) -> Tuple[str, Dict[str, str]]:
        """
        Replace GENERATE: placeholders with actual image URLs
        
        Args:
            code: Code with GENERATE: placeholders
            cache: Optional dict of description -> url mappings for caching
            
        Returns:
            Tuple of (modified_code, updated_cache)
        """
        if cache is None:
            cache = {}
        
        placeholders = self.extract_image_placeholders(code)
        
        if not placeholders:
            return code, cache
        
        print(f"📸 Found {len(placeholders)} image placeholders")
        
        modified_code = code
        
        for placeholder in placeholders:
            description = placeholder["description"]
            width = placeholder["width"]
            height = placeholder["height"]
            match_str = placeholder["match"]
            
            if match_str not in modified_code:
                print(f"⚠️  Image placeholder not found in code: {repr(match_str[:80])}")
                continue
            
            # Create cache key
            cache_key = self._get_cache_key(description, width, height)
            
            # Check cache first
            if cache_key in cache:
                image_url = cache[cache_key]
                print(f"♻️  Using cached image for: '{description[:50]}...'")
            else:
                # Generate new image
                image_url = self.generate_image(description, width, height)
                
                if image_url:
                    cache[cache_key] = image_url
                else:
                    # Fallback to picsum if generation fails
                    print(f"⚠️  Falling back to picsum for: '{description[:50]}'")
                    seed = abs(hash(description)) % 1000
                    image_url = f"https://picsum.photos/seed/{seed}/{width}/{height}"
                    cache[cache_key] = image_url
            
            # Determine replacement — src= attributes vs bare JS string values
            if match_str.startswith("src="):
                replacement = f'src="{image_url}"'
            else:
                replacement = f'"{image_url}"'
            
            modified_code = modified_code.replace(match_str, replacement)
        
        return modified_code, cache
    
    def _get_cache_key(self, description: str, width: int, height: int) -> str:
        """Generate cache key for an image"""
        content = f"{description}_{width}x{height}"
        return hashlib.md5(content.encode()).hexdigest()


# Singleton instance
_image_service = None

def get_image_service(model: str = "fal-ai/flux/schnell") -> ImageGenerationService:
    """Get or create image generation service instance"""
    global _image_service
    if _image_service is None:
        _image_service = ImageGenerationService(model=model)
    return _image_service