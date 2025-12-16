"""
DTM Context Filter
Filters DTM rules based on selected resources or context
Enables: "Generate UI using patterns from dark-theme-dashboard designs"
"""
from typing import Dict, Any, List, Optional


class DTMContextFilter:
    """Filter DTM based on context or selected resources"""
    
    def filter_by_resources(
        self,
        dtm: Dict[str, Any],
        selected_resource_ids: List[str],
        fallback_to_all: bool = True
    ) -> Dict[str, Any]:
        """
        Filter DTM to prioritize patterns from selected resources
        
        Args:
            dtm: Full DTM
            selected_resource_ids: Resources to prioritize
            fallback_to_all: If True, include general patterns as fallback
            
        Returns:
            Filtered DTM with resource-specific emphasis
        """
        
        if not selected_resource_ids:
            return dtm  # No filtering
        
        filtered = {
            "version": dtm["version"],
            "taste_id": dtm["taste_id"],
            "owner_id": dtm["owner_id"],
            "meta": dtm["meta"].copy(),
            "filter_applied": {
                "type": "resource_selection",
                "selected_resources": selected_resource_ids,
                "fallback_enabled": fallback_to_all
            }
        }
        
        # Get contexts of selected resources
        selected_contexts = []
        resource_contexts = dtm.get("resource_contexts", {})
        for res_id in selected_resource_ids:
            if res_id in resource_contexts:
                selected_contexts.append(resource_contexts[res_id])
        
        # Filter contextual rules
        semantic = dtm.get("semantic_rules", {})
        filtered_contextual = []
        
        for rule in semantic.get("contextual_rules", []):
            evidence_dtrs = rule.get("evidence_dtrs", [])
            # Include if rule is from selected resources
            if any(dtr_id in selected_resource_ids for dtr_id in evidence_dtrs):
                filtered_contextual.append(rule)
        
        # Keep invariants (apply regardless of resource)
        filtered["semantic_rules"] = {
            "invariants": semantic.get("invariants", []),
            "contextual_rules": filtered_contextual,
            "meta_rules": semantic.get("meta_rules", [])  # Keep meta-rules
        }
        
        # Statistical patterns: Keep all, but add weights
        filtered["statistical_patterns"] = self._weight_statistical_patterns(
            patterns=dtm.get("statistical_patterns", {}),
            selected_resources=selected_resource_ids,
            all_resources=dtm.get("meta", {}).get("resources", [])
        )
        
        # Keep resource contexts
        filtered["resource_contexts"] = {
            res_id: ctx
            for res_id, ctx in resource_contexts.items()
            if res_id in selected_resource_ids or fallback_to_all
        }
        
        return filtered
    
    def filter_by_context(
        self,
        dtm: Dict[str, Any],
        target_context: Dict[str, str]
    ) -> Dict[str, Any]:
        """
        Filter DTM based on target context (use_case, platform, etc.)
        
        Args:
            dtm: Full DTM
            target_context: Target context dict
                Example: {"primary_use_case": "dashboard", "platform": "web_desktop"}
            
        Returns:
            Filtered DTM emphasizing relevant patterns
        """
        
        # Find resources matching target context
        matching_resources = self._find_matching_resources(dtm, target_context)
        
        if matching_resources:
            # Filter by matching resources
            return self.filter_by_resources(
                dtm=dtm,
                selected_resource_ids=matching_resources,
                fallback_to_all=True
            )
        else:
            # No exact match, return full DTM with note
            filtered = dtm.copy()
            filtered["filter_applied"] = {
                "type": "context_match",
                "target_context": target_context,
                "no_exact_match": True,
                "using_general_patterns": True
            }
            return filtered
    
    def filter_by_keywords(
        self,
        dtm: Dict[str, Any],
        keywords: List[str]
    ) -> Dict[str, Any]:
        """
        Filter DTM by keywords (e.g., "dark theme", "minimal")
        
        Args:
            dtm: Full DTM
            keywords: List of keyword strings
            
        Returns:
            Filtered DTM with keyword-matching resources prioritized
        """
        
        keywords_lower = [k.lower().strip() for k in keywords]
        
        # Find resources with matching keywords
        matching_resources = []
        resource_contexts = dtm.get("resource_contexts", {})
        
        for res_id, context in resource_contexts.items():
            res_keywords = context.get("keywords", [])
            # Check if any keyword matches
            if any(kw in res_keywords for kw in keywords_lower):
                matching_resources.append(res_id)
        
        if matching_resources:
            return self.filter_by_resources(
                dtm=dtm,
                selected_resource_ids=matching_resources,
                fallback_to_all=True
            )
        else:
            filtered = dtm.copy()
            filtered["filter_applied"] = {
                "type": "keyword_search",
                "keywords": keywords,
                "no_matches": True
            }
            return filtered
    
    def _find_matching_resources(
        self,
        dtm: Dict[str, Any],
        target_context: Dict[str, str]
    ) -> List[str]:
        """Find resources matching target context"""
        
        matching = []
        resource_contexts = dtm.get("resource_contexts", {})
        
        for res_id, context in resource_contexts.items():
            score = 0
            max_score = len(target_context)
            
            # Check each context field
            for key, value in target_context.items():
                if context.get(key) == value:
                    score += 1
            
            # If at least 50% match, include
            if score >= max_score * 0.5:
                matching.append(res_id)
        
        return matching
    
    def _weight_statistical_patterns(
        self,
        patterns: Dict[str, Any],
        selected_resources: List[str],
        all_resources: List[Dict]
    ) -> Dict[str, Any]:
        """
        Add weights to statistical patterns based on resource selection
        Doesn't change values, just adds metadata for downstream use
        """
        
        weighted = patterns.copy()
        
        # Calculate weight (what % of data is from selected resources)
        total = len(all_resources)
        selected_count = len(selected_resources)
        
        weighted["_weights"] = {
            "selected_resources": selected_resources,
            "selected_count": selected_count,
            "total_count": total,
            "weight": selected_count / total if total > 0 else 1.0,
            "note": "Patterns influenced by selected resources"
        }
        
        return weighted
    
    def get_filter_summary(self, filtered_dtm: Dict[str, Any]) -> str:
        """Generate summary of applied filter"""
        
        lines = []
        
        filter_info = filtered_dtm.get("filter_applied")
        if not filter_info:
            return "No filter applied - using full DTM"
        
        filter_type = filter_info.get("type")
        
        if filter_type == "resource_selection":
            selected = filter_info.get("selected_resources", [])
            lines.append(f"Filtered by resources: {len(selected)} selected")
            lines.append(f"Resource IDs: {', '.join(selected[:3])}...")
        
        elif filter_type == "context_match":
            target = filter_info.get("target_context", {})
            lines.append(f"Filtered by context: {target}")
            if filter_info.get("no_exact_match"):
                lines.append("Note: No exact match, using general patterns")
        
        elif filter_type == "keyword_search":
            keywords = filter_info.get("keywords", [])
            lines.append(f"Filtered by keywords: {keywords}")
            if filter_info.get("no_matches"):
                lines.append("Note: No matches found, using full DTM")
        
        # Count filtered rules
        semantic = filtered_dtm.get("semantic_rules", {})
        lines.append(f"\nFiltered rules:")
        lines.append(f"  - Invariants: {len(semantic.get('invariants', []))}")
        lines.append(f"  - Contextual: {len(semantic.get('contextual_rules', []))}")
        lines.append(f"  - Meta-rules: {len(semantic.get('meta_rules', []))}")
        
        return "\n".join(lines)


# Example
if __name__ == "__main__":
    print("DTMContextFilter - Resource-specific generation")
    print("\nUsage examples:")
    print("""
    filter = DTMContextFilter()
    
    # Filter by specific resources
    filtered = filter.filter_by_resources(
        dtm=dtm,
        selected_resource_ids=["resource_123", "resource_456"]
    )
    
    # Filter by context
    filtered = filter.filter_by_context(
        dtm=dtm,
        target_context={
            "primary_use_case": "dashboard",
            "platform": "web_desktop"
        }
    )
    
    # Filter by keywords
    filtered = filter.filter_by_keywords(
        dtm=dtm,
        keywords=["dark theme", "minimal", "data-heavy"]
    )
    
    # Summary
    print(filter.get_filter_summary(filtered))
    """)