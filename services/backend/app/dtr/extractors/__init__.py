"""
DTR Extractors

Low-level extraction utilities for parsing Figma JSON and analyzing images.
"""
from .figma_parser import FigmaParser, parse_figma_structure, parse_figma_surface
from .vision import (
    VisionAnalyzer, 
    analyze_structure_from_image, 
    validate_hierarchy,
    analyze_surface_from_image
)
from .algorithmic import (
    k_means_color_clustering,
    edge_detection_spacing,
    fft_grid_detection
)

__all__ = [
    # Figma parsing
    'FigmaParser',
    'parse_figma_structure',
    'parse_figma_surface',
    
    # Vision analysis
    'VisionAnalyzer',
    'analyze_structure_from_image',
    'analyze_surface_from_image',
    'validate_hierarchy',
    
    # Algorithmic CV (optional)
    'k_means_color_clustering',
    'edge_detection_spacing',
    'fft_grid_detection'
]