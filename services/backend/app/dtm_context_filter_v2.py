"""
DTM v2 Context Filter
Filters three-tier DTM based on selected resources

When user selects specific resources to prioritize:
- Tier 1 (Universal): Keep unchanged (always apply)
- Tier 2 (Systems): Filter to context of selected resources
- Tier 3 (Signatures): Filter to patterns present in selected resources
- Visual Library: Filter to selected resources only
"""
from typing import Dict, Any, List, Optional
from collections import Counter
import copy


class DTMContextFilterV2:
    """Filter DTM v2 based on selected resources"""
    
    def filter_by_resources(
        self,
        dtm: Dict[str, Any],
        selected_resource_ids: List[str]
    ) -> Dict[str, Any]:
        """
        Filter DTM v2 to prioritize patterns from selected resources
        
        Args:
            dtm: Full DTM v2
            selected_resource_ids: Resources to prioritize
            
        Returns:
            Filtered DTM v2 with resource-specific emphasis
        """
        
        if not selected_resource_ids:
            return dtm  # No filtering
        
        print(f"\n[DTM Filter] Filtering to {len(selected_resource_ids)} selected resources")
        
        filtered = copy.deepcopy(dtm)
        
        # Add filter metadata
        filtered["filter_applied"] = {
            "type": "resource_selection",
            "selected_resources": selected_resource_ids,
            "original_total": dtm["meta"]["total_resources"]
        }
        
        # Tier 1: Keep universal principles unchanged
        # (Universal rules apply regardless of resource)
        
        # Tier 2: Filter designer systems by selected resource contexts
        print("  Filtering designer systems...")
        filtered["designer_systems"] = self._filter_designer_systems(
            systems=dtm.get("designer_systems", {}),
            selected_resources=selected_resource_ids,
            context_map=dtm.get("context_map", {})
        )
        
        # Tier 3: Filter signature patterns
        print("  Filtering signature patterns...")
        filtered["signature_patterns"] = self._filter_signature_patterns(
            signatures=dtm.get("signature_patterns", []),
            selected_resources=selected_resource_ids,
            visual_library=dtm.get("visual_library", {})
        )
        
        # Visual Library: Filter to selected resources only
        print("  Filtering visual library...")
        filtered["visual_library"] = self._filter_visual_library(
            library=dtm.get("visual_library", {}),
            selected_resources=selected_resource_ids
        )
        
        # Context Map: Keep only selected resources
        filtered["context_map"] = {
            res_id: ctx
            for res_id, ctx in dtm.get("context_map", {}).items()
            if res_id in selected_resource_ids
        }
        
        print(f"  ✓ Filtered DTM ready")
        print(f"    Signature patterns: {len(filtered.get('signature_patterns', []))}")
        print(f"    Visual examples: {len(filtered['visual_library'].get('all_resources', []))}")
        
        return filtered
    
    def _filter_designer_systems(
        self,
        systems: Dict[str, Any],
        selected_resources: List[str],
        context_map: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Filter designer systems to contexts of selected resources
        
        Strategy: Only include context-specific rules for selected resources' contexts
        """
        
        filtered_systems = copy.deepcopy(systems)
        
        # Get contexts of selected resources
        selected_contexts = set()
        for res_id in selected_resources:
            if res_id in context_map:
                use_case = context_map[res_id].get("use_case")
                if use_case:
                    selected_contexts.add(use_case)
        
        # Filter spacing system
        if "spacing" in filtered_systems:
            spacing = filtered_systems["spacing"]
            by_context = spacing.get("by_context", {})
            
            # Keep only contexts from selected resources
            filtered_by_context = {
                ctx: rules
                for ctx, rules in by_context.items()
                if ctx in selected_contexts
            }
            
            spacing["by_context"] = filtered_by_context
            
            # Update default to most common from selected contexts
            if filtered_by_context:
                all_quantums = []
                for ctx_data in filtered_by_context.values():
                    q = ctx_data["quantum"]
                    count = ctx_data.get("evidence_count", 1)
                    all_quantums.extend([q] * count)
                
                if all_quantums:
                    spacing["default"] = Counter(all_quantums).most_common(1)[0][0]
        
        # Typography, colors, forms stay the same (they're aggregated across all)
        # But we could add weighting here in the future
        
        return filtered_systems
    
    def _filter_signature_patterns(
        self,
        signatures: List[Dict[str, Any]],
        selected_resources: List[str],
        visual_library: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Filter signature patterns to only those present in selected resources
        
        Strategy: Check visual_library.by_signature to see which patterns
        are in selected resources
        """
        
        by_signature = visual_library.get("by_signature", {})
        
        # Build reverse map: which patterns appear in selected resources
        patterns_in_selected = set()
        
        for pattern_type, resource_ids in by_signature.items():
            # If any selected resource has this pattern
            if any(res_id in selected_resources for res_id in resource_ids):
                patterns_in_selected.add(pattern_type)
        
        # Filter signatures to only those in selected resources
        filtered_signatures = []
        for sig in signatures:
            pattern_type = sig.get("pattern_type")
            if pattern_type in patterns_in_selected:
                filtered_signatures.append(sig)
        
        return filtered_signatures
    
    def _filter_visual_library(
        self,
        library: Dict[str, Any],
        selected_resources: List[str]
    ) -> Dict[str, Any]:
        """
        Filter visual library to only selected resources
        """
        
        filtered_library = {
            "by_context": {},
            "by_signature": {},
            "all_resources": selected_resources
        }
        
        # Filter by_context
        for context, resource_ids in library.get("by_context", {}).items():
            filtered_ids = [r for r in resource_ids if r in selected_resources]
            if filtered_ids:
                filtered_library["by_context"][context] = filtered_ids
        
        # Filter by_signature
        for pattern_type, resource_ids in library.get("by_signature", {}).items():
            filtered_ids = [r for r in resource_ids if r in selected_resources]
            if filtered_ids:
                filtered_library["by_signature"][pattern_type] = filtered_ids
        
        return filtered_library


# Export
__all__ = ["DTMContextFilterV2"]