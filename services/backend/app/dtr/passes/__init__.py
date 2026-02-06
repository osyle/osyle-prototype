"""
DTR Passes

Extraction pass implementations.
Each pass analyzes a different dimension of the design.
"""
from .base import BasePass, PassRegistry
from .pass_1_structure import Pass1Structure, run_pass_1

# TODO: Add other passes as they're implemented
# from .pass_2_surface import Pass2Surface, run_pass_2
# from .pass_3_typography import Pass3Typography, run_pass_3
# from .pass_4_components import Pass4Components, run_pass_4
# from .pass_4b_images import Pass4bImages, run_pass_4b
# from .pass_5_personality import Pass5Personality, run_pass_5

__all__ = [
    # Base class
    'BasePass',
    'PassRegistry',
    
    # Pass 1
    'Pass1Structure',
    'run_pass_1',
    
    # TODO: Add other passes
]
