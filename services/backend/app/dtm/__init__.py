"""
DTM (Design Taste Model) Module - Pass 7
Multi-resource synthesis with narrative-rich outputs
"""

from . import schemas
from . import storage
from . import fingerprinting
from . import consensus
from . import conflicts
from . import synthesizer

# Public API
from .synthesizer import synthesize_dtm
from .storage import (
    save_dtm,
    load_dtm,
    dtm_exists,
    delete_dtm,
    save_fingerprint,
    load_fingerprint,
    load_all_fingerprints,
    save_subset_dtm,
    load_subset_dtm,
    is_dtm_fresh
)

__all__ = [
    # Schemas
    "schemas",
    
    # Core modules
    "storage",
    "fingerprinting",
    "consensus",
    "conflicts",
    "synthesizer",
    
    # Main functions
    "synthesize_dtm",
    "save_dtm",
    "load_dtm",
    "dtm_exists",
    "delete_dtm",
    "save_fingerprint",
    "load_fingerprint",
    "load_all_fingerprints",
    "save_subset_dtm",
    "load_subset_dtm",
    "is_dtm_fresh"
]