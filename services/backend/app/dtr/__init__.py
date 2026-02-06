"""
DTR (Design Taste Representation) Module

Extract, understand, and store a designer's taste from reference designs.

Public API:
- extract_dtr(): Main extraction function
- extract_pass_1_only(): Run only Pass 1
- load_pass_result(): Load saved pass results
- load_complete_dtr(): Load complete DTR
"""
from .pipeline import extract_dtr, extract_pass_1_only, ExtractionPipeline
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
    CompleteDTR
)
from .passes import run_pass_1

__version__ = "0.1.0"

__all__ = [
    # Main API
    'extract_dtr',
    'extract_pass_1_only',
    
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
    'CompleteDTR',
    
    # Direct pass execution
    'run_pass_1'
]
