"""
DTM Storage - Local filesystem I/O for DTM outputs
Parallel structure to dtr/storage.py
"""
import os
import json
import hashlib
from datetime import datetime
from typing import Optional, List, Dict, Any
from .schemas import (
    Pass7CompleteDTM,
    StyleFingerprint,
    DTMMetadata,
    SubsetCacheEntry
)


# Base directory for DTM outputs
DTM_OUTPUTS_DIR = os.path.join(os.getcwd(), "dtm_outputs")


def ensure_dtm_directory(taste_id: str) -> str:
    """Ensure DTM output directory exists for a taste"""
    taste_dir = os.path.join(DTM_OUTPUTS_DIR, taste_id)
    os.makedirs(taste_dir, exist_ok=True)
    
    # Create subdirectories
    os.makedirs(os.path.join(taste_dir, "fingerprints"), exist_ok=True)
    os.makedirs(os.path.join(taste_dir, "subsets"), exist_ok=True)
    
    return taste_dir


# ============================================================================
# DTM OPERATIONS
# ============================================================================

def save_dtm(taste_id: str, dtm: Pass7CompleteDTM, resource_ids: List[str]) -> str:
    """
    Save complete DTM to filesystem
    Returns path to saved file
    """
    taste_dir = ensure_dtm_directory(taste_id)
    
    # Convert Pydantic model to dict
    dtm_dict = dtm.model_dump() if hasattr(dtm, 'model_dump') else dtm.dict()
    
    # Save latest version
    latest_path = os.path.join(taste_dir, "complete_dtm_latest.json")
    with open(latest_path, 'w') as f:
        json.dump(dtm_dict, f, indent=2)
    
    # Save timestamped version
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    versioned_path = os.path.join(taste_dir, f"complete_dtm_{timestamp}.json")
    with open(versioned_path, 'w') as f:
        json.dump(dtm_dict, f, indent=2)
    
    print(f"✅ Saved DTM to {latest_path}")
    return latest_path


def load_dtm(taste_id: str) -> Optional[Pass7CompleteDTM]:
    """Load complete DTM from filesystem"""
    taste_dir = os.path.join(DTM_OUTPUTS_DIR, taste_id)
    dtm_path = os.path.join(taste_dir, "complete_dtm_latest.json")
    
    if not os.path.exists(dtm_path):
        return None
    
    with open(dtm_path, 'r') as f:
        data = json.load(f)
    
    return Pass7CompleteDTM(**data)


def dtm_exists(taste_id: str) -> bool:
    """Check if DTM exists for a taste"""
    taste_dir = os.path.join(DTM_OUTPUTS_DIR, taste_id)
    dtm_path = os.path.join(taste_dir, "complete_dtm_latest.json")
    return os.path.exists(dtm_path)


def delete_dtm(taste_id: str):
    """Delete all DTM outputs for a taste"""
    taste_dir = os.path.join(DTM_OUTPUTS_DIR, taste_id)
    
    if os.path.exists(taste_dir):
        import shutil
        shutil.rmtree(taste_dir)
        print(f"✅ Deleted DTM directory: {taste_dir}")


# ============================================================================
# FINGERPRINT OPERATIONS
# ============================================================================

def save_fingerprint(taste_id: str, fingerprint: StyleFingerprint) -> str:
    """Save style fingerprint for a resource"""
    taste_dir = ensure_dtm_directory(taste_id)
    fingerprints_dir = os.path.join(taste_dir, "fingerprints")
    
    # Convert to dict
    fp_dict = fingerprint.model_dump() if hasattr(fingerprint, 'model_dump') else fingerprint.dict()
    
    # Save
    fp_path = os.path.join(fingerprints_dir, f"{fingerprint.resource_id}_fingerprint.json")
    with open(fp_path, 'w') as f:
        json.dump(fp_dict, f, indent=2)
    
    return fp_path


def load_fingerprint(taste_id: str, resource_id: str) -> Optional[StyleFingerprint]:
    """Load style fingerprint for a resource"""
    taste_dir = os.path.join(DTM_OUTPUTS_DIR, taste_id)
    fp_path = os.path.join(taste_dir, "fingerprints", f"{resource_id}_fingerprint.json")
    
    if not os.path.exists(fp_path):
        return None
    
    with open(fp_path, 'r') as f:
        data = json.load(f)
    
    return StyleFingerprint(**data)


def load_all_fingerprints(taste_id: str) -> List[StyleFingerprint]:
    """Load all fingerprints for a taste"""
    taste_dir = os.path.join(DTM_OUTPUTS_DIR, taste_id)
    fingerprints_dir = os.path.join(taste_dir, "fingerprints")
    
    if not os.path.exists(fingerprints_dir):
        return []
    
    fingerprints = []
    for filename in os.listdir(fingerprints_dir):
        if filename.endswith("_fingerprint.json"):
            resource_id = filename.replace("_fingerprint.json", "")
            fp = load_fingerprint(taste_id, resource_id)
            if fp:
                fingerprints.append(fp)
    
    return fingerprints


# ============================================================================
# SUBSET CACHE OPERATIONS
# ============================================================================

def compute_subset_hash(resource_ids: List[str]) -> str:
    """Compute hash for a subset of resources"""
    # Sort for consistency
    sorted_ids = sorted(resource_ids)
    hash_input = "_".join(sorted_ids)
    return hashlib.md5(hash_input.encode()).hexdigest()[:16]


def save_subset_dtm(taste_id: str, resource_ids: List[str], dtm: Pass7CompleteDTM) -> str:
    """Save subset DTM to cache"""
    taste_dir = ensure_dtm_directory(taste_id)
    subsets_dir = os.path.join(taste_dir, "subsets")
    
    # Compute hash
    subset_hash = compute_subset_hash(resource_ids)
    
    # Convert to dict
    dtm_dict = dtm.model_dump() if hasattr(dtm, 'model_dump') else dtm.dict()
    
    # Save
    subset_path = os.path.join(subsets_dir, f"{subset_hash}.json")
    with open(subset_path, 'w') as f:
        json.dump(dtm_dict, f, indent=2)
    
    # Update metadata
    update_subset_cache_metadata(taste_id, resource_ids, subset_hash)
    
    print(f"✅ Cached subset DTM: {subset_hash}")
    return subset_path


def load_subset_dtm(taste_id: str, resource_ids: List[str]) -> Optional[Pass7CompleteDTM]:
    """Load subset DTM from cache"""
    subset_hash = compute_subset_hash(resource_ids)
    taste_dir = os.path.join(DTM_OUTPUTS_DIR, taste_id)
    subset_path = os.path.join(taste_dir, "subsets", f"{subset_hash}.json")
    
    if not os.path.exists(subset_path):
        return None
    
    with open(subset_path, 'r') as f:
        data = json.load(f)
    
    return Pass7CompleteDTM(**data)


# ============================================================================
# METADATA OPERATIONS
# ============================================================================

def save_dtm_metadata(metadata: DTMMetadata):
    """Save DTM metadata"""
    taste_dir = ensure_dtm_directory(metadata.taste_id)
    metadata_path = os.path.join(taste_dir, "dtm_metadata.json")
    
    # Convert to dict
    metadata_dict = metadata.model_dump() if hasattr(metadata, 'model_dump') else metadata.dict()
    
    with open(metadata_path, 'w') as f:
        json.dump(metadata_dict, f, indent=2)


def load_dtm_metadata(taste_id: str) -> Optional[DTMMetadata]:
    """Load DTM metadata"""
    taste_dir = os.path.join(DTM_OUTPUTS_DIR, taste_id)
    metadata_path = os.path.join(taste_dir, "dtm_metadata.json")
    
    if not os.path.exists(metadata_path):
        return None
    
    with open(metadata_path, 'r') as f:
        data = json.load(f)
    
    return DTMMetadata(**data)


def update_subset_cache_metadata(taste_id: str, resource_ids: List[str], subset_hash: str):
    """Update metadata with new cached subset"""
    metadata = load_dtm_metadata(taste_id)
    
    if not metadata:
        return
    
    # Check if already exists
    for entry in metadata.subsets_cached:
        if entry.hash == subset_hash:
            return  # Already cached
    
    # Add new entry
    new_entry = SubsetCacheEntry(
        resource_ids=resource_ids,
        hash=subset_hash,
        created_at=datetime.now().isoformat()
    )
    metadata.subsets_cached.append(new_entry)
    
    # Save
    save_dtm_metadata(metadata)


def is_dtm_fresh(taste_id: str, current_resource_ids: List[str]) -> bool:
    """Check if DTM is fresh (matches current resources)"""
    metadata = load_dtm_metadata(taste_id)
    
    if not metadata:
        return False
    
    # Compare resource sets
    current_set = set(current_resource_ids)
    metadata_set = set(metadata.resource_ids_at_rebuild)
    
    return current_set == metadata_set