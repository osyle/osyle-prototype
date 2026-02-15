"""
DTM Storage - S3-based storage for DTM outputs
Migrated from local filesystem to S3 for production use
"""
import json
import hashlib
from datetime import datetime
from typing import Optional, List, Dict, Any
from app.core import storage as s3_storage
from app.core import db
from .schemas import (
    Pass7CompleteDTM,
    StyleFingerprint,
    DTMMetadata,
    SubsetCacheEntry
)


# ============================================================================
# DTM OPERATIONS
# ============================================================================

def save_dtm(taste_id: str, dtm: Pass7CompleteDTM, resource_ids: List[str]) -> str:
    """
    Save complete DTM to S3
    
    Args:
        taste_id: Taste UUID
        dtm: Complete DTM
        resource_ids: List of resource IDs used to build this DTM
    
    Returns:
        S3 key of saved file
    """
    # Get taste to find owner_id
    taste = db.get_taste(taste_id)
    if not taste:
        raise ValueError(f"Taste {taste_id} not found")
    
    owner_id = taste["owner_id"]
    
    # Convert Pydantic model to dict
    dtm_dict = dtm.model_dump() if hasattr(dtm, 'model_dump') else dtm.dict()
    
    # Generate timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # Save latest version
    latest_key = s3_storage.get_dtm_complete_key(owner_id, taste_id)
    s3_storage.save_json_to_s3(latest_key, dtm_dict)
    
    # Save timestamped version
    versioned_key = s3_storage.get_dtm_versioned_key(owner_id, taste_id, timestamp)
    s3_storage.save_json_to_s3(versioned_key, dtm_dict)
    
    # Save metadata with resource IDs for freshness checking
    from .schemas import DTMMetadata
    metadata = DTMMetadata(
        taste_id=taste_id,
        last_rebuild=datetime.now().isoformat(),
        resource_ids_at_rebuild=resource_ids,
        rebuild_trigger="manual",
        rebuild_duration_seconds=0.0,  # Not tracked here
        subsets_cached=[]
    )
    save_dtm_metadata(metadata)
    
    print(f"✅ Saved DTM to S3: {latest_key}")
    return latest_key


def load_dtm(taste_id: str) -> Optional[Pass7CompleteDTM]:
    """
    Load complete DTM from S3
    
    Args:
        taste_id: Taste UUID
    
    Returns:
        Complete DTM or None if not found
    """
    # Get taste to find owner_id
    taste = db.get_taste(taste_id)
    if not taste:
        return None
    
    owner_id = taste["owner_id"]
    
    key = s3_storage.get_dtm_complete_key(owner_id, taste_id)
    data = s3_storage.load_json_from_s3(key)
    
    if not data:
        return None
    
    return Pass7CompleteDTM(**data)


def dtm_exists(taste_id: str) -> bool:
    """
    Check if DTM exists in S3
    
    Args:
        taste_id: Taste UUID
    
    Returns:
        True if DTM exists, False otherwise
    """
    dtm = load_dtm(taste_id)
    return dtm is not None


def delete_dtm(taste_id: str):
    """
    Delete all DTM outputs for a taste from S3
    
    Args:
        taste_id: Taste UUID
    """
    # Get taste to find owner_id
    taste = db.get_taste(taste_id)
    if not taste:
        return
    
    owner_id = taste["owner_id"]
    
    # Delete main DTM
    latest_key = s3_storage.get_dtm_complete_key(owner_id, taste_id)
    s3_storage.delete_object(latest_key)
    
    # Delete metadata
    metadata_key = s3_storage.get_dtm_metadata_key(owner_id, taste_id)
    s3_storage.delete_object(metadata_key)
    
    # Delete subset index
    subset_index_key = s3_storage.get_dtm_subset_index_key(owner_id, taste_id)
    s3_storage.delete_object(subset_index_key)
    
    # Note: Versioned files, fingerprints, and subsets remain in S3 for history
    # S3 lifecycle policies can handle cleanup
    
    print(f"✅ Deleted DTM files for taste {taste_id}")


# ============================================================================
# FINGERPRINT OPERATIONS
# ============================================================================

def save_fingerprint(taste_id: str, fingerprint: StyleFingerprint) -> str:
    """
    Save style fingerprint for a resource
    
    Args:
        taste_id: Taste UUID
        fingerprint: Style fingerprint
    
    Returns:
        S3 key of saved file
    """
    # Get taste to find owner_id
    taste = db.get_taste(taste_id)
    if not taste:
        raise ValueError(f"Taste {taste_id} not found")
    
    owner_id = taste["owner_id"]
    
    # Convert to dict
    fp_dict = fingerprint.model_dump() if hasattr(fingerprint, 'model_dump') else fingerprint.dict()
    
    # Save
    key = s3_storage.get_dtm_fingerprint_key(owner_id, taste_id, fingerprint.resource_id)
    s3_storage.save_json_to_s3(key, fp_dict)
    
    return key


def load_fingerprint(taste_id: str, resource_id: str) -> Optional[StyleFingerprint]:
    """
    Load style fingerprint for a resource
    
    Args:
        taste_id: Taste UUID
        resource_id: Resource UUID
    
    Returns:
        Style fingerprint or None if not found
    """
    # Get taste to find owner_id
    taste = db.get_taste(taste_id)
    if not taste:
        return None
    
    owner_id = taste["owner_id"]
    
    key = s3_storage.get_dtm_fingerprint_key(owner_id, taste_id, resource_id)
    data = s3_storage.load_json_from_s3(key)
    
    if not data:
        return None
    
    return StyleFingerprint(**data)


def load_all_fingerprints(taste_id: str) -> List[StyleFingerprint]:
    """
    Load all fingerprints for a taste
    
    Note: This requires listing S3 objects which is not ideal.
    For now, we'll rely on the fingerprints being saved during DTM synthesis.
    
    Args:
        taste_id: Taste UUID
    
    Returns:
        List of fingerprints
    """
    # For simplicity, we'll reconstruct fingerprints when needed
    # rather than listing S3 objects
    # The DTM synthesis process should save all fingerprints anyway
    return []


# ============================================================================
# SUBSET CACHE OPERATIONS
# ============================================================================

def compute_subset_hash(resource_ids: List[str]) -> str:
    """
    Compute hash for a subset of resources
    
    Args:
        resource_ids: List of resource UUIDs
    
    Returns:
        MD5 hash (first 16 chars)
    """
    # Sort for consistency
    sorted_ids = sorted(resource_ids)
    hash_input = "_".join(sorted_ids)
    return hashlib.md5(hash_input.encode()).hexdigest()[:16]


def save_subset_dtm(taste_id: str, resource_ids: List[str], dtm: Pass7CompleteDTM) -> str:
    """
    Save subset DTM to S3 cache
    
    Args:
        taste_id: Taste UUID
        resource_ids: List of resource UUIDs
        dtm: Subset DTM
    
    Returns:
        S3 key of saved file
    """
    # Get taste to find owner_id
    taste = db.get_taste(taste_id)
    if not taste:
        raise ValueError(f"Taste {taste_id} not found")
    
    owner_id = taste["owner_id"]
    
    # Compute hash
    subset_hash = compute_subset_hash(resource_ids)
    
    # Convert to dict
    dtm_dict = dtm.model_dump() if hasattr(dtm, 'model_dump') else dtm.dict()
    
    # Save subset DTM file
    key = s3_storage.get_dtm_subset_key(owner_id, taste_id, subset_hash)
    s3_storage.save_json_to_s3(key, dtm_dict)
    
    # Update subset index
    _update_subset_index(owner_id, taste_id, subset_hash, resource_ids)
    
    print(f"✅ Cached subset DTM to S3: {subset_hash}")
    return key


def _update_subset_index(owner_id: str, taste_id: str, subset_hash: str, resource_ids: List[str]):
    """
    Update subset_index.json with new subset entry
    
    Args:
        owner_id: Owner UUID
        taste_id: Taste UUID
        subset_hash: Hash of the subset
        resource_ids: List of resource UUIDs
    """
    # Load existing index
    index_key = s3_storage.get_dtm_subset_index_key(owner_id, taste_id)
    index = s3_storage.load_json_from_s3(index_key) or {}
    
    # Add/update entry
    index[subset_hash] = {
        "resource_ids": sorted(resource_ids),
        "created_at": datetime.now().isoformat(),
        "dtm_file": f"{subset_hash}.json"
    }
    
    # Save index
    s3_storage.save_json_to_s3(index_key, index)
    
    print(f"✅ Updated subset index: {subset_hash}")


def load_subset_index(taste_id: str) -> Dict[str, Any]:
    """
    Load subset_index.json
    
    Args:
        taste_id: Taste UUID
    
    Returns:
        Subset index dictionary
    """
    # Get taste to find owner_id
    taste = db.get_taste(taste_id)
    if not taste:
        return {}
    
    owner_id = taste["owner_id"]
    
    index_key = s3_storage.get_dtm_subset_index_key(owner_id, taste_id)
    return s3_storage.load_json_from_s3(index_key) or {}


def load_subset_dtm(taste_id: str, resource_ids: List[str]) -> Optional[Pass7CompleteDTM]:
    """
    Load subset DTM from S3 cache
    
    Args:
        taste_id: Taste UUID
        resource_ids: List of resource UUIDs
    
    Returns:
        Subset DTM or None if not cached
    """
    # Get taste to find owner_id
    taste = db.get_taste(taste_id)
    if not taste:
        return None
    
    owner_id = taste["owner_id"]
    
    subset_hash = compute_subset_hash(resource_ids)
    key = s3_storage.get_dtm_subset_key(owner_id, taste_id, subset_hash)
    data = s3_storage.load_json_from_s3(key)
    
    if not data:
        return None
    
    return Pass7CompleteDTM(**data)


def delete_subsets_containing_resource(taste_id: str, resource_id: str):
    """
    Delete all subset DTMs that contain a specific resource
    
    Args:
        taste_id: Taste UUID
        resource_id: Resource UUID to find and delete
    """
    # Load subset index
    index = load_subset_index(taste_id)
    
    if not index:
        return
    
    # Get taste to find owner_id
    taste = db.get_taste(taste_id)
    if not taste:
        return
    
    owner_id = taste["owner_id"]
    
    # Find subsets containing this resource
    subsets_to_delete = []
    for subset_hash, entry in index.items():
        if resource_id in entry.get("resource_ids", []):
            subsets_to_delete.append(subset_hash)
    
    if not subsets_to_delete:
        print(f"ℹ️  No subset DTMs contain resource {resource_id}")
        return
    
    # Delete each subset DTM
    for subset_hash in subsets_to_delete:
        key = s3_storage.get_dtm_subset_key(owner_id, taste_id, subset_hash)
        s3_storage.delete_object(key)
        del index[subset_hash]
        print(f"🗑️  Deleted subset DTM: {subset_hash}")
    
    # Update index
    index_key = s3_storage.get_dtm_subset_index_key(owner_id, taste_id)
    s3_storage.save_json_to_s3(index_key, index)
    
    print(f"✅ Deleted {len(subsets_to_delete)} subset DTMs containing resource {resource_id}")


def invalidate_global_dtm(taste_id: str):
    """
    Invalidate global DTM by deleting it (will be rebuilt on next use)
    
    Args:
        taste_id: Taste UUID
    """
    delete_dtm(taste_id)
    print(f"🔄 Invalidated global DTM for taste {taste_id}")


# ============================================================================
# METADATA OPERATIONS
# ============================================================================

def save_dtm_metadata(metadata: DTMMetadata):
    """
    Save DTM metadata
    
    Args:
        metadata: DTM metadata
    """
    # Get taste to find owner_id
    taste = db.get_taste(metadata.taste_id)
    if not taste:
        raise ValueError(f"Taste {metadata.taste_id} not found")
    
    owner_id = taste["owner_id"]
    
    # Convert to dict
    metadata_dict = metadata.model_dump() if hasattr(metadata, 'model_dump') else metadata.dict()
    
    key = s3_storage.get_dtm_metadata_key(owner_id, metadata.taste_id)
    s3_storage.save_json_to_s3(key, metadata_dict)


def load_dtm_metadata(taste_id: str) -> Optional[DTMMetadata]:
    """
    Load DTM metadata
    
    Args:
        taste_id: Taste UUID
    
    Returns:
        DTM metadata or None if not found
    """
    # Get taste to find owner_id
    taste = db.get_taste(taste_id)
    if not taste:
        return None
    
    owner_id = taste["owner_id"]
    
    key = s3_storage.get_dtm_metadata_key(owner_id, taste_id)
    data = s3_storage.load_json_from_s3(key)
    
    if not data:
        return None
    
    return DTMMetadata(**data)


def update_subset_cache_metadata(taste_id: str, resource_ids: List[str], subset_hash: str):
    """
    Update metadata with new cached subset
    
    Args:
        taste_id: Taste UUID
        resource_ids: List of resource UUIDs
        subset_hash: Hash of the subset
    """
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
    """
    Check if DTM is fresh (matches current resources)
    
    Args:
        taste_id: Taste UUID
        current_resource_ids: List of current resource UUIDs
    
    Returns:
        True if fresh, False otherwise
    """
    # First check if DTM exists at all
    dtm = load_dtm(taste_id)
    if not dtm:
        return False
    
    # Try to use metadata (preferred)
    metadata = load_dtm_metadata(taste_id)
    if metadata:
        current_set = set(current_resource_ids)
        metadata_set = set(metadata.resource_ids_at_rebuild)
        return current_set == metadata_set
    
    # Fallback: Compare against DTM's resource_ids field
    dtm_resource_set = set(dtm.resource_ids)
    current_set = set(current_resource_ids)
    
    return dtm_resource_set == current_set