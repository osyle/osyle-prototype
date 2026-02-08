"""
DTR Passes

Extraction pass implementations.
Each pass analyzes a different dimension of the design.
"""
from .base import BasePass, PassRegistry
from .pass_1_structure import Pass1Structure, run_pass_1
from .pass_2_surface import Pass2Surface, run_pass_2
from .pass_3_typography import Pass3Typography, run_pass_3
from .pass_4_image_usage import Pass4ImageUsage, run_pass_4
from .pass_5_components import Pass5Components, run_pass_5
from .pass_6_personality import Pass6Personality, run_pass_6

__all__ = [
    # Base class
    'BasePass',
    'PassRegistry',
    
    # Pass 1
    'Pass1Structure',
    'run_pass_1',
    
    # Pass 2
    'Pass2Surface',
    'run_pass_2',
    
    # Pass 3
    'Pass3Typography',
    'run_pass_3',
    
    # Pass 4
    'Pass4ImageUsage',
    'run_pass_4',
    
    # Pass 5
    'Pass5Components',
    'run_pass_5',
    
    # Pass 6
    'Pass6Personality',
    'run_pass_6',
]