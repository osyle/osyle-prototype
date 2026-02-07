"""
DTR (Design Taste Representation) Module

Extract, understand, and store a designer's taste from reference designs.

Public API:
- extract_dtr(): Main extraction function
- extract_pass_1_only(): Run only Pass 1
- extract_pass_2_only(): Run only Pass 2
- extract_pass_3_only(): Run only Pass 3
- load_pass_result(): Load saved pass results
- load_complete_dtr(): Load complete DTR
"""
from .pipeline import (
    extract_dtr,
    extract_pass_1_only,
    extract_pass_2_only,
    extract_pass_3_only,
    ExtractionPipeline
)
from .storage import (
    load_pass_result,
    load_complete_dtr,
    save_pass_result,
    save_complete_dtr,
    load_extraction_status,
    delete_resource_dtr
)
from .schemas import (
    Pass1StructureDTR,
    Pass2SurfaceDTR,
    Pass3TypographyDTR,
    CompleteDTR
)
from .passes import run_pass_1, run_pass_2, run_pass_3

__version__ = "0.1.0"

__all__ = [
    # Main API
    'extract_dtr',
    'extract_pass_1_only',
    'extract_pass_2_only',
    'extract_pass_3_only',
    
    # Pipeline
    'ExtractionPipeline',
    
    # Storage
    'load_pass_result',
    'load_complete_dtr',
    'save_pass_result',
    'save_complete_dtr',
    'load_extraction_status',
    'delete_resource_dtr',
    
    # Schemas
    'Pass1StructureDTR',
    'Pass2SurfaceDTR',
    'Pass3TypographyDTR',
    'CompleteDTR',
    
    # Direct pass execution
    'run_pass_1',
    'run_pass_2',
    'run_pass_3'
]