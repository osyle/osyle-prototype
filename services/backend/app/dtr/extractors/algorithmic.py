"""
Algorithmic Computer Vision Utilities

Non-LLM image processing for verification and enhancement.
Optional verification layer that can run alongside LLM analysis.

NOTE: These are optional enhancements. Pass 1 can work without them.
Implement when needed for higher precision.
"""
from typing import List, Tuple, Optional
import numpy as np
from PIL import Image
import io


def k_means_color_clustering(
    image_bytes: bytes,
    n_colors: int = 10
) -> List[str]:
    """
    Extract dominant colors using K-means clustering.
    
    This provides algorithmic ground truth for color extraction,
    independent of LLM analysis. Used in Pass 2 for image-only scenarios.
    
    Args:
        image_bytes: Image data as bytes
        n_colors: Number of dominant colors to extract (default 10)
    
    Returns:
        List of hex color strings (e.g., ['#0A0A1A', '#5856D6', ...])
    """
    try:
        from sklearn.cluster import KMeans
        
        # Load image
        image = Image.open(io.BytesIO(image_bytes))
        image = image.convert('RGB')
        
        # Downsample for performance (k-means on full image is slow)
        # Resize to max 400px on longest side
        max_size = 400
        ratio = max_size / max(image.size)
        if ratio < 1:
            new_size = tuple(int(dim * ratio) for dim in image.size)
            image = image.resize(new_size, Image.Resampling.LANCZOS)
        
        # Reshape to array of pixels: (width * height, 3)
        pixels = np.array(image).reshape(-1, 3)
        
        # Sample pixels if still too many (for very large images)
        if len(pixels) > 10000:
            indices = np.random.choice(len(pixels), 10000, replace=False)
            pixels = pixels[indices]
        
        # K-means clustering
        kmeans = KMeans(n_clusters=n_colors, random_state=42, n_init=10)
        kmeans.fit(pixels)
        
        # Get cluster centers (dominant colors) and sort by cluster size
        labels = kmeans.labels_
        centers = kmeans.cluster_centers_.astype(int)
        
        # Count pixels in each cluster
        unique, counts = np.unique(labels, return_counts=True)
        
        # Sort colors by frequency (most common first)
        sorted_indices = np.argsort(-counts)
        sorted_colors = centers[sorted_indices]
        
        # Convert to hex
        hex_colors = []
        for color in sorted_colors:
            r, g, b = color
            hex_color = f"#{r:02X}{g:02X}{b:02X}"
            hex_colors.append(hex_color)
        
        return hex_colors
    
    except ImportError:
        print("Warning: scikit-learn not installed. K-means clustering unavailable.")
        return []
    except Exception as e:
        print(f"Error in k-means clustering: {e}")
        return []


def edge_detection_spacing(
    image_bytes: bytes
) -> List[int]:
    """
    Detect spacing values using edge detection
    
    Uses Canny edge detection to find element boundaries,
    then measures pixel distances between edges.
    
    Args:
        image_bytes: Image data as bytes
    
    Returns:
        List of detected spacing values in pixels
    
    NOTE: Requires opencv-python. Implement when needed for precision.
    """
    # TODO: Implement when higher precision spacing is needed
    # import cv2
    # 
    # # Load image
    # image = Image.open(io.BytesIO(image_bytes))
    # image_array = np.array(image.convert('L'))  # Grayscale
    # 
    # # Canny edge detection
    # edges = cv2.Canny(image_array, 100, 200)
    # 
    # # Detect spacing between edges
    # # ... (complex logic to measure gaps between edges)
    # 
    # return spacing_values
    
    raise NotImplementedError("Edge detection spacing not yet implemented")


def fft_grid_detection(
    image_bytes: bytes
) -> Optional[int]:
    """
    Detect underlying grid rhythm using FFT
    
    Uses Fast Fourier Transform to detect repeating spatial frequencies,
    revealing the base grid unit (4px, 8px, etc.).
    
    Args:
        image_bytes: Image data as bytes
    
    Returns:
        Detected grid quantum in pixels, or None if not detected
    
    NOTE: Advanced feature. Implement only if basic methods insufficient.
    """
    # TODO: Implement if needed for advanced grid detection
    # 
    # # Load image
    # image = Image.open(io.BytesIO(image_bytes))
    # image_array = np.array(image.convert('L'))
    # 
    # # Apply FFT
    # fft = np.fft.fft2(image_array)
    # fft_shifted = np.fft.fftshift(fft)
    # magnitude = np.abs(fft_shifted)
    # 
    # # Detect dominant frequencies
    # # ... (complex frequency analysis)
    # 
    # return detected_quantum
    
    raise NotImplementedError("FFT grid detection not yet implemented")


# ============================================================================
# PUBLIC API
# ============================================================================

__all__ = [
    'k_means_color_clustering',
    'edge_detection_spacing',
    'fft_grid_detection'
]