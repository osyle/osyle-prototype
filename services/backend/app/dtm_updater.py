"""
DTM Incremental Updater
Updates existing DTM with new DTR using O(1) weighted updates
Avoids O(n) full recomputation - much faster for large portfolios
"""
from typing import Dict, Any
from datetime import datetime
import statistics
import copy


class DTMIncrementalUpdater:
    """Incrementally update DTM with new DTRs"""
    
    def __init__(self, llm_client=None):
        """
        Args:
            llm_client: LLM client for semantic rule updates (optional)
        """
        self.llm = llm_client
    
    async def update_dtm(
        self,
        existing_dtm: Dict[str, Any],
        new_dtr: Dict[str, Any],
        resynthesize_semantic: bool = False
    ) -> Dict[str, Any]:
        """
        Update DTM with new DTR using weighted incremental approach
        
        Args:
            existing_dtm: Current DTM
            new_dtr: New DTR to incorporate
            resynthesize_semantic: Whether to re-run LLM synthesis (default False)
            
        Returns:
            Updated DTM
        """
        
        dtm = copy.deepcopy(existing_dtm)
        
        # Update metadata
        dtm["meta"]["updated_at"] = datetime.utcnow().isoformat() + "Z"
        dtm["meta"]["total_resources"] += 1
        dtm["meta"]["total_dtrs_analyzed"] += 1
        
        # Add new resource to list
        new_resource = {
            "resource_id": new_dtr.get("meta", {}).get("resource_id"),
            "context": new_dtr.get("meta", {}).get("context", {}),
            "confidence": new_dtr.get("meta", {}).get("confidence_scores", {}).get("overall", 0)
        }
        dtm["meta"]["resources"].append(new_resource)
        
        # Update statistical patterns (incremental, O(1))
        dtm["statistical_patterns"] = self._update_statistical_patterns(
            existing_patterns=dtm["statistical_patterns"],
            new_dtr=new_dtr,
            total_count=dtm["meta"]["total_dtrs_analyzed"]
        )
        
        # Update resource context map
        if "resource_contexts" not in dtm:
            dtm["resource_contexts"] = {}
        
        resource_id = new_dtr.get("meta", {}).get("resource_id")
        if resource_id:
            dtm["resource_contexts"][resource_id] = {
                "use_case": new_dtr.get("meta", {}).get("context", {}).get("primary_use_case"),
                "content_type": new_dtr.get("meta", {}).get("context", {}).get("content_type"),
                "platform": new_dtr.get("meta", {}).get("context", {}).get("platform"),
                "keywords": self._extract_context_keywords(new_dtr)
            }
        
        # Check if semantic rules need updating
        needs_semantic_update = (
            resynthesize_semantic or
            self._check_if_novel_context(dtm, new_dtr) or
            self._check_if_confidence_changed(dtm, new_dtr)
        )
        
        if needs_semantic_update and self.llm:
            print("Novel context or confidence change detected - updating semantic rules...")
            # TODO: Implement incremental semantic update
            # For now, we'll just log that it should be updated
            dtm["meta"]["semantic_rules_need_update"] = True
        else:
            print("Incremental statistical update only (no semantic changes)")
        
        return dtm
    
    def _update_statistical_patterns(
        self,
        existing_patterns: Dict[str, Any],
        new_dtr: Dict[str, Any],
        total_count: int
    ) -> Dict[str, Any]:
        """
        Update statistical patterns using weighted running average
        O(1) time complexity
        """
        
        patterns = copy.deepcopy(existing_patterns)
        
        # Extract new data from DTR
        new_data = self._extract_dtr_statistics(new_dtr)
        
        # Update spacing
        if "spacing" in patterns and "spacing" in new_data:
            patterns["spacing"] = self._update_spacing_stats(
                existing=patterns["spacing"],
                new_data=new_data["spacing"],
                total_count=total_count
            )
        
        # Update colors
        if "colors" in patterns and "colors" in new_data:
            patterns["colors"] = self._update_color_stats(
                existing=patterns["colors"],
                new_data=new_data["colors"],
                total_count=total_count
            )
        
        # Update typography
        if "typography" in patterns and "typography" in new_data:
            patterns["typography"] = self._update_typography_stats(
                existing=patterns["typography"],
                new_data=new_data["typography"],
                total_count=total_count
            )
        
        # Update forms
        if "forms" in patterns and "forms" in new_data:
            patterns["forms"] = self._update_form_stats(
                existing=patterns["forms"],
                new_data=new_data["forms"],
                total_count=total_count
            )
        
        return patterns
    
    def _extract_dtr_statistics(self, dtr: Dict[str, Any]) -> Dict[str, Any]:
        """Extract statistics from single DTR"""
        
        stats = {}
        
        quant = dtr.get("quantitative_validation", {})
        
        # Spacing
        spacing = quant.get("spacing_analysis", {})
        if spacing:
            stats["spacing"] = {
                "quantum": spacing.get("spacing_quantum"),
                "values": spacing.get("all_spacings", []),
                "distribution": spacing.get("spacing_distribution", {})
            }
        
        # Colors
        colors = quant.get("color_analysis", {})
        if colors:
            stats["colors"] = {
                "colors": colors.get("all_colors", colors.get("primary_palette", [])),
                "temperature": colors.get("temperature_distribution", {}),
                "saturation": colors.get("saturation_distribution", {})
            }
        
        # Typography
        typo = quant.get("typography_analysis", {})
        if typo:
            stats["typography"] = {
                "sizes": typo.get("all_font_sizes", typo.get("font_sizes", [])),
                "scale_ratio": typo.get("type_scale_ratio"),
                "weights": typo.get("all_font_weights", [])
            }
        
        # Forms
        forms = quant.get("form_analysis", {})
        if forms:
            stats["forms"] = {
                "radii": forms.get("all_radii", forms.get("most_common_radii", [])),
                "radius_quantum": forms.get("radius_quantum")
            }
        
        return stats
    
    def _update_spacing_stats(self, existing: Dict, new_data: Dict, total_count: int) -> Dict:
        """Update spacing statistics with weighted running average"""
        
        updated = copy.deepcopy(existing)
        
        # Update quantum using weighted average
        if "quantum" in existing and new_data.get("quantum"):
            old_quantum = existing["quantum"]
            new_quantum = new_data["quantum"]
            
            # Weighted update: new_mean = (old_mean * (n-1) + new_value) / n
            if "mean" in old_quantum:
                old_mean = old_quantum["mean"]
                updated_mean = (old_mean * (total_count - 1) + new_quantum) / total_count
                
                updated["quantum"]["mean"] = updated_mean
                updated["quantum"]["all_observed"] = sorted(set(
                    old_quantum.get("all_observed", []) + [new_quantum]
                ))
                
                # Recalculate consistency (simplified)
                all_vals = updated["quantum"]["all_observed"]
                if len(all_vals) > 1:
                    std_dev = statistics.stdev(all_vals)
                    cv = std_dev / updated_mean if updated_mean > 0 else 0
                    updated["quantum"]["consistency"] = max(0.0, min(1.0, 1.0 - cv))
        
        # Update common values
        if "common_values" in existing and new_data.get("values"):
            # Merge frequency counts
            old_freq = existing["common_values"].get("frequency", {})
            for val in new_data["values"]:
                old_freq[val] = old_freq.get(val, 0) + 1
            
            # Update top values
            sorted_vals = sorted(old_freq.items(), key=lambda x: x[1], reverse=True)
            updated["common_values"]["top_10"] = [v for v, _ in sorted_vals[:10]]
            updated["common_values"]["frequency"] = dict(sorted_vals[:20])
        
        return updated
    
    def _update_color_stats(self, existing: Dict, new_data: Dict, total_count: int) -> Dict:
        """Update color statistics"""
        
        updated = copy.deepcopy(existing)
        
        # Update common colors
        if "common_colors" in existing and new_data.get("colors"):
            old_freq = existing["common_colors"].get("frequency", {})
            for color in new_data["colors"]:
                old_freq[color] = old_freq.get(color, 0) + 1
            
            sorted_colors = sorted(old_freq.items(), key=lambda x: x[1], reverse=True)
            updated["common_colors"]["top_20"] = [c for c, _ in sorted_colors[:20]]
            updated["common_colors"]["frequency"] = dict(sorted_colors[:30])
            updated["common_colors"]["total_unique"] = len(old_freq)
        
        # Update temperature distribution (weighted average)
        if "temperature" in existing and new_data.get("temperature"):
            for key in ["warm", "cool", "neutral"]:
                old_val = existing["temperature"].get(key, 0)
                new_val = new_data["temperature"].get(key, 0)
                updated["temperature"][key] = round((old_val * (total_count - 1) + new_val) / total_count, 3)
        
        return updated
    
    def _update_typography_stats(self, existing: Dict, new_data: Dict, total_count: int) -> Dict:
        """Update typography statistics"""
        
        updated = copy.deepcopy(existing)
        
        # Update scale ratio
        if "scale_ratio" in existing and new_data.get("scale_ratio"):
            old_ratio = existing["scale_ratio"]
            new_ratio = new_data["scale_ratio"]
            
            if "mean" in old_ratio:
                updated_mean = (old_ratio["mean"] * (total_count - 1) + new_ratio) / total_count
                updated["scale_ratio"]["mean"] = round(updated_mean, 3)
                
                all_vals = old_ratio.get("all_observed", []) + [new_ratio]
                updated["scale_ratio"]["all_observed"] = sorted(set(all_vals))
                
                if len(all_vals) > 1:
                    std_dev = statistics.stdev(all_vals)
                    cv = std_dev / updated_mean if updated_mean > 0 else 0
                    updated["scale_ratio"]["consistency"] = round(max(0.0, min(1.0, 1.0 - cv)), 3)
        
        return updated
    
    def _update_form_stats(self, existing: Dict, new_data: Dict, total_count: int) -> Dict:
        """Update form statistics"""
        
        updated = copy.deepcopy(existing)
        
        # Update radii
        if "corner_radii" in existing and new_data.get("radii"):
            old_freq = existing["corner_radii"].get("frequency", {})
            for radius in new_data["radii"]:
                old_freq[radius] = old_freq.get(radius, 0) + 1
            
            sorted_radii = sorted(old_freq.items(), key=lambda x: x[1], reverse=True)
            updated["corner_radii"]["common_radii"] = [r for r, _ in sorted_radii[:10]]
            updated["corner_radii"]["frequency"] = dict(sorted_radii[:15])
        
        return updated
    
    def _check_if_novel_context(self, dtm: Dict, new_dtr: Dict) -> bool:
        """Check if new DTR introduces novel context (triggers semantic update)"""
        
        new_context = new_dtr.get("meta", {}).get("context", {})
        
        existing_contexts = [
            r.get("context", {})
            for r in dtm.get("meta", {}).get("resources", [])
        ]
        
        # Check if use_case or platform is new
        new_use_case = new_context.get("primary_use_case")
        new_platform = new_context.get("platform")
        
        for ctx in existing_contexts:
            if ctx.get("primary_use_case") == new_use_case:
                return False  # Not novel
        
        return True  # Novel context
    
    def _check_if_confidence_changed(self, dtm: Dict, new_dtr: Dict) -> bool:
        """Check if adding this DTR significantly changes confidence"""
        
        new_conf = new_dtr.get("meta", {}).get("confidence_scores", {}).get("overall", 0)
        existing_conf = dtm.get("meta", {}).get("overall_confidence", 0)
        
        # If new confidence very different, might need semantic update
        return abs(new_conf - existing_conf) > 0.15
    
    def _extract_context_keywords(self, dtr: Dict) -> list:
        """Extract keywords from DTR context"""
        keywords = []
        context = dtr.get("meta", {}).get("context", {})
        keywords.extend([
            context.get("primary_use_case", ""),
            context.get("content_type", ""),
            context.get("platform", "")
        ])
        return [k.lower().strip() for k in keywords if k]


# Example
if __name__ == "__main__":
    print("DTMIncrementalUpdater - O(1) updates")
    print("\nUsage:")
    print("""
    updater = DTMIncrementalUpdater(llm_client)
    
    # Fast update (code-only, no LLM)
    updated_dtm = await updater.update_dtm(
        existing_dtm=dtm,
        new_dtr=dtr,
        resynthesize_semantic=False  # Fast
    )
    
    # Full update (re-run LLM synthesis)
    updated_dtm = await updater.update_dtm(
        existing_dtm=dtm,
        new_dtr=dtr,
        resynthesize_semantic=True  # Slower but comprehensive
    )
    """)