"""
DTM v3 Incremental Updater
Updates existing DTM v3 with new DTR v6

Key improvements from v2:
- Updates three-tier structure incrementally
- Re-evaluates signatures (new DTR might reveal new patterns)
- Updates visual library
- Preserves context variance
- NEW: Aggregates quirk patterns from DTR v6
"""
from typing import Dict, Any, List
from datetime import datetime
from collections import Counter, defaultdict
import copy
import statistics

# Import quirk aggregator
from app.quirk_aggregator import QuirkAggregator


class DTMUpdaterV3:
    """Incrementally update DTM v3 with new DTR v6"""
    
    def __init__(self):
        self.quirk_aggregator = QuirkAggregator()
    
    async def update_dtm(
        self,
        existing_dtm: Dict[str, Any],
        new_dtr: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Update DTM v3 with new DTR v6
        
        Args:
            existing_dtm: Current DTM v3
            new_dtr: New DTR v6 to incorporate
            
        Returns:
            Updated DTM v3
        """
        
        print(f"\n{'='*60}")
        print(f"UPDATING DTM v3 - Incremental Update with Quirks")
        print(f"{'='*60}")
        
        dtm = copy.deepcopy(existing_dtm)
        resource_id = new_dtr["meta"]["resource_id"]
        
        # Check if resource already exists in DTM
        if resource_id in dtm.get("visual_library", {}).get("all_resources", []):
            print(f"\n⚠️  Resource {resource_id[:8]}... already exists in DTM - skipping update")
            return dtm
        
        print(f"\n✓ Adding new resource {resource_id[:8]}... to DTM")
        
        # Update metadata
        dtm["meta"]["updated_at"] = datetime.utcnow().isoformat() + "Z"
        dtm["meta"]["total_resources"] += 1
        dtm["meta"]["total_dtrs_analyzed"] = dtm["meta"].get("total_dtrs_analyzed", dtm["meta"]["total_resources"] - 1) + 1  # For backward compatibility
        
        # Step 1: Update Tier 2 - Designer Systems
        print("\n[1/5] Updating Designer Systems...")
        dtm["designer_systems"] = self._update_designer_systems(
            existing_systems=dtm["designer_systems"],
            new_dtr=new_dtr,
            total_resources=dtm["meta"]["total_resources"]
        )
        
        # Step 2: Update Tier 3 - Signature Patterns
        print("\n[2/5] Re-evaluating Signature Patterns...")
        # Need to re-check all patterns with new data
        # This is more expensive but necessary for accuracy
        dtm["signature_patterns"] = self._update_signature_patterns(
            existing_signatures=dtm["signature_patterns"],
            new_dtr=new_dtr,
            total_resources=dtm["meta"]["total_resources"]
        )
        
        # Step 3: Update Visual Library
        print("\n[3/5] Updating Visual Library...")
        dtm["visual_library"] = self._update_visual_library(
            existing_library=dtm["visual_library"],
            new_dtr=new_dtr
        )
        
        # Step 4: Update Context Map
        print("\n[4/5] Updating Context Map...")
        dtm["context_map"][resource_id] = {
            "use_case": new_dtr["meta"]["context"]["primary_use_case"],
            "platform": new_dtr["meta"]["context"]["platform"],
            "content_density": new_dtr["meta"]["context"]["content_density"],
            "confidence": new_dtr["meta"]["confidence_scores"]["overall"]
        }
        
        # Step 5: Update Quirk Signatures (NEW for v3)
        print("\n[5/5] Aggregating quirk signatures...")
        dtm["quirk_signatures"] = await self._update_quirk_signatures(
            existing_quirks=dtm.get("quirk_signatures", {}),
            new_dtr=new_dtr,
            dtm=dtm
        )
        
        # Recalculate overall confidence
        all_confidences = [ctx["confidence"] for ctx in dtm["context_map"].values()]
        dtm["meta"]["overall_confidence"] = round(
            sum(all_confidences) / len(all_confidences), 2
        )
        
        # Update version
        dtm["version"] = "3.0"
        
        print(f"\n✓ DTM v3 updated successfully")
        print(f"  Total resources: {dtm['meta']['total_resources']}")
        print(f"  Overall confidence: {dtm['meta']['overall_confidence']:.2f}")
        
        return dtm
    
    def _update_designer_systems(
        self,
        existing_systems: Dict,
        new_dtr: Dict,
        total_resources: int
    ) -> Dict[str, Any]:
        """Update Tier 2: Designer Systems with new DTR"""
        
        systems = copy.deepcopy(existing_systems)
        
        # Update spacing system (context-aware)
        systems["spacing"] = self._update_spacing_system(
            existing_spacing=systems.get("spacing", {}),
            new_dtr=new_dtr,
            total_resources=total_resources
        )
        
        # Update typography system
        systems["typography"] = self._update_typography_system(
            existing_typo=systems.get("typography", {}),
            new_dtr=new_dtr,
            total_resources=total_resources
        )
        
        # Update color system
        systems["color_system"] = self._update_color_system(
            existing_colors=systems.get("color_system", {}),
            new_dtr=new_dtr,
            total_resources=total_resources
        )
        
        # Update form language
        systems["form_language"] = self._update_form_system(
            existing_forms=systems.get("form_language", {}),
            new_dtr=new_dtr,
            total_resources=total_resources
        )
        
        return systems
    
    def _update_spacing_system(
        self,
        existing_spacing: Dict,
        new_dtr: Dict,
        total_resources: int
    ) -> Dict[str, Any]:
        """Update spacing system (preserving context-specific patterns)"""
        
        by_context = existing_spacing.get("by_context", {})
        
        # Get new spacing data
        new_context = new_dtr["meta"]["context"]["primary_use_case"]
        new_quantum = new_dtr["quantitative"]["spacing"]["quantum"]
        
        if new_quantum:
            # Update context-specific rule
            if new_context in by_context:
                # Append to existing
                old_quantum = by_context[new_context]["quantum"]
                old_count = by_context[new_context]["evidence_count"]
                
                # Update using mode (most common)
                all_quantums = [old_quantum] * old_count + [new_quantum]
                mode_quantum = Counter(all_quantums).most_common(1)[0][0]
                
                by_context[new_context] = {
                    "quantum": mode_quantum,
                    "confidence": (old_count + 1) / total_resources,
                    "evidence_count": old_count + 1
                }
            else:
                # New context
                by_context[new_context] = {
                    "quantum": new_quantum,
                    "confidence": 1 / total_resources,
                    "evidence_count": 1
                }
            
            # Update default (most common across all contexts)
            all_quantums = []
            for ctx_data in by_context.values():
                q = ctx_data["quantum"]
                count = ctx_data["evidence_count"]
                all_quantums.extend([q] * count)
            
            default_quantum = Counter(all_quantums).most_common(1)[0][0] if all_quantums else 8
        else:
            default_quantum = existing_spacing.get("default", 8)
        
        return {
            "by_context": by_context,
            "default": default_quantum,
            "note": "Context-specific spacing - varies by use case"
        }
    
    def _update_typography_system(
        self,
        existing_typo: Dict,
        new_dtr: Dict,
        total_resources: int
    ) -> Dict[str, Any]:
        """Update typography system"""
        
        # Update scale ratio (weighted average)
        new_ratio = new_dtr["quantitative"]["typography"]["scale_ratio"]
        
        if new_ratio:
            old_mean = existing_typo.get("scale_ratio", {}).get("mean", 1.5)
            new_mean = (old_mean * (total_resources - 1) + new_ratio) / total_resources
            
            # Update range
            old_range = existing_typo.get("scale_ratio", {}).get("range", [1.5, 1.5])
            new_range = [min(old_range[0], new_ratio), max(old_range[1], new_ratio)]
            
            scale_ratio = {
                "mean": round(new_mean, 2),
                "range": new_range,
                "consistency": 0.85  # Simplified
            }
        else:
            scale_ratio = existing_typo.get("scale_ratio", {"mean": 1.5, "range": [1.5, 1.5]})
        
        # Update common sizes (merge)
        old_sizes = existing_typo.get("common_sizes", [])
        new_sizes = new_dtr["quantitative"]["typography"]["common_sizes"]
        
        all_sizes = old_sizes + new_sizes
        size_counts = Counter(all_sizes)
        common_sizes = [s for s, _ in size_counts.most_common(10)]
        
        # Update weights (union)
        old_weights = set(existing_typo.get("weights", []))
        new_weights = set(new_dtr["quantitative"]["typography"]["weights"])
        weights = sorted(list(old_weights | new_weights))
        
        return {
            "scale_ratio": scale_ratio,
            "common_sizes": common_sizes,
            "weights": weights,
            "note": "Typography system - sizes and scale ratios"
        }
    
    def _update_color_system(
        self,
        existing_colors: Dict,
        new_dtr: Dict,
        total_resources: int
    ) -> Dict[str, Any]:
        """Update color system"""
        
        # Merge palettes
        old_palette = existing_colors.get("common_palette", [])
        new_palette = new_dtr["quantitative"]["colors"]["primary_palette"]
        
        all_colors = old_palette + new_palette
        color_counts = Counter(all_colors)
        common_palette = [c for c, _ in color_counts.most_common(15)]
        
        # Update temperature (weighted average)
        old_temp = existing_colors.get("temperature_preference", {})
        new_temp = new_dtr["quantitative"]["colors"]["temperature"]
        
        updated_temp = {}
        for key in ["warm", "cool", "neutral"]:
            old_val = old_temp.get(key, 0)
            new_val = new_temp.get(key, 0)
            updated_temp[key] = round((old_val * (total_resources - 1) + new_val) / total_resources, 2)
        
        return {
            "common_palette": common_palette,
            "temperature_preference": updated_temp,
            "note": "Color system - designer's recurring palette"
        }
    
    def _update_form_system(
        self,
        existing_forms: Dict,
        new_dtr: Dict,
        total_resources: int
    ) -> Dict[str, Any]:
        """Update form system"""
        
        old_radii = existing_forms.get("common_radii", [])
        new_radii = new_dtr["quantitative"]["forms"]["common_radii"]
        
        all_radii = old_radii + new_radii
        radii_counts = Counter(all_radii)
        common_radii = [r for r, _ in radii_counts.most_common(8)]
        
        return {
            "common_radii": common_radii,
            "note": "Form language - corner radii preferences"
        }
    
    def _update_signature_patterns(
        self,
        existing_signatures: List[Dict],
        new_dtr: Dict,
        total_resources: int
    ) -> List[Dict[str, Any]]:
        """
        Update Tier 3: Signature Patterns
        
        Challenge: Need to re-evaluate what counts as a signature
        A pattern that was 100% (not signature) might drop to 75% (signature!)
        """
        
        # Build pattern frequency map
        pattern_frequencies = {}
        
        # Count existing patterns
        for sig in existing_signatures:
            pattern_id = sig["pattern_id"]
            old_freq = sig["frequency"]
            old_count = round(old_freq * (total_resources - 1))
            
            pattern_frequencies[pattern_id] = {
                "count": old_count,
                "signature_data": sig
            }
        
        # Add new patterns
        for pattern in new_dtr.get("visual_patterns", []):
            pattern_id = f"{pattern['type']}_{pattern.get('subtype', 'default')}"
            
            if pattern_id in pattern_frequencies:
                pattern_frequencies[pattern_id]["count"] += 1
            else:
                # New pattern
                pattern_frequencies[pattern_id] = {
                    "count": 1,
                    "signature_data": {
                        "pattern_type": pattern["type"],
                        "pattern_subtype": pattern.get("subtype"),
                        "implementation": pattern.get("implementation", {}),
                        "contexts": pattern.get("contexts", []),
                        "visual_impact": pattern.get("visual_impact", "medium")
                    }
                }
        
        # Re-evaluate signatures
        # Use adaptive threshold based on sample size
        updated_signatures = []
        
        # Adjust threshold based on total resources
        if total_resources <= 3:
            min_frequency = 0.6
            max_frequency = 1.0  # Allow 100% for small samples
        else:
            min_frequency = 0.6
            max_frequency = 0.95  # Exclude universal patterns for larger samples
        
        for pattern_id, data in pattern_frequencies.items():
            frequency = data["count"] / total_resources
            
            # Signature range: varies by sample size
            if min_frequency <= frequency <= max_frequency:
                sig_data = data["signature_data"]
                
                updated_signatures.append({
                    "pattern_id": pattern_id,
                    "pattern_type": sig_data.get("pattern_type"),
                    "pattern_subtype": sig_data.get("pattern_subtype"),
                    "frequency": round(frequency, 2),
                    "visual_impact": sig_data.get("visual_impact", "medium"),
                    "implementation": sig_data.get("implementation", {}),
                    "contexts": sig_data.get("contexts", []),
                    "note": f"Appears in {frequency*100:.0f}% of designs - signature pattern"
                })
        
        return updated_signatures
    
    def _update_visual_library(
        self,
        existing_library: Dict,
        new_dtr: Dict
    ) -> Dict[str, Any]:
        """Update visual library with new resource"""
        
        library = copy.deepcopy(existing_library)
        
        resource_id = new_dtr["meta"]["resource_id"]
        context = new_dtr["meta"]["context"]["primary_use_case"]
        
        # Defensive check: if resource already exists, don't add again
        if resource_id in library.get("all_resources", []):
            print(f"  ⚠️  Resource {resource_id[:8]}... already in visual library - skipping")
            return library
        
        # Add to context library
        if context not in library["by_context"]:
            library["by_context"][context] = []
        library["by_context"][context].append(resource_id)
        
        # Add to all resources
        library["all_resources"].append(resource_id)
        
        # Add to signature library
        for pattern in new_dtr.get("signature_patterns", []):
            pattern_type = pattern.get("pattern_type", "unknown")
            if pattern_type not in library["by_signature"]:
                library["by_signature"][pattern_type] = []
            library["by_signature"][pattern_type].append(resource_id)
        
        return library
    
    async def _update_quirk_signatures(
        self,
        existing_quirks: Dict[str, Any],
        new_dtr: Dict[str, Any],
        dtm: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Update quirk signatures with new DTR v6
        
        CRITICAL: If existing_quirks is empty (DTM built before quirks existed),
        we need to rebuild quirks from ALL DTRs, not incrementally.
        """
        
        total_resources = dtm["meta"]["total_resources"]
        new_quirk_patterns = new_dtr.get("quirk_patterns", {})
        
        if not new_quirk_patterns:
            print("  No quirk patterns in new DTR (might be DTR v5)")
            return existing_quirks
        
        # Check if quirks need initialization (DTM built before quirks existed)
        needs_rebuild = (
            not existing_quirks or
            "personality" not in existing_quirks or
            not existing_quirks.get("personality")
        )
        
        if needs_rebuild:
            print(f"  âš ï¸  Quirks missing in DTM - rebuilding from all {total_resources} DTRs...")
            # Need to rebuild quirks from ALL DTRs
            # Import QuirkAggregator for batch processing
            from app.quirk_aggregator import QuirkAggregator
            
            # Get all resource IDs
            all_resource_ids = dtm["visual_library"]["all_resources"]
            
            # Load all DTRs (we need their quirk patterns)
            all_dtrs = []
            user_id = dtm["owner_id"]
            taste_id = dtm["taste_id"]
            
            from app import storage
            for resource_id in all_resource_ids:
                try:
                    dtr = storage.get_resource_dtr(user_id, taste_id, resource_id)
                    if dtr and dtr.get("quirk_patterns"):
                        all_dtrs.append(dtr)
                except Exception as e:
                    print(f"    ⚠️ Could not load DTR for {resource_id[:8]}: {e}")
            
            if len(all_dtrs) >= 2:
                # Use QuirkAggregator for proper batch aggregation
                aggregator = QuirkAggregator()
                quirk_signatures = aggregator.aggregate_quirks(
                    all_dtrs,
                    min_frequency=0.6
                )
                print(f"  ✓ Rebuilt quirks from {len(all_dtrs)} DTRs")
                return quirk_signatures
            else:
                print(f"  ⚠️ Not enough DTRs with quirks ({len(all_dtrs)}), skipping")
                return existing_quirks
        
        # Normal incremental update path
        updated_quirks = copy.deepcopy(existing_quirks)
        
        # Update each category
        for category, new_data in new_quirk_patterns.items():
            if category not in updated_quirks:
                updated_quirks[category] = {}
            
            # Category-specific aggregation
            if category == "obsessions":
                updated_quirks[category] = self._aggregate_obsessions_incremental(
                    existing_quirks.get(category, {}),
                    new_data,
                    total_resources
                )
            
            elif category == "personality":
                updated_quirks[category] = self._aggregate_personality_incremental(
                    existing_quirks.get(category, {}),
                    new_data,
                    total_resources
                )
            
            elif category == "compositional":
                updated_quirks[category] = self._aggregate_compositional_incremental(
                    existing_quirks.get(category, {}),
                    new_data,
                    total_resources
                )
            
            else:
                # Generic merge - just keep both
                if isinstance(new_data, dict):
                    for key, value in new_data.items():
                        if key not in updated_quirks[category]:
                            updated_quirks[category][key] = value
        
        return updated_quirks
    
    def _aggregate_obsessions_incremental(
        self,
        existing: Dict,
        new_data: Dict,
        total: int
    ) -> Dict:
        """Incrementally aggregate obsession patterns"""
        
        result = copy.deepcopy(existing)
        
        # Track always_uses patterns
        if "always_uses" in new_data:
            existing_patterns = {}
            
            # Parse existing signature_obsessions
            for sig_obs in existing.get("signature_obsessions", []):
                pattern = sig_obs.get("pattern")
                freq = sig_obs.get("frequency", 0)
                count = round(freq * (total - 1))
                existing_patterns[pattern] = count
            
            # Add new patterns
            for new_item in new_data["always_uses"]:
                pattern = new_item.get("pattern")
                if pattern in existing_patterns:
                    existing_patterns[pattern] += 1
                else:
                    existing_patterns[pattern] = 1
            
            # Rebuild signature_obsessions (60%+ threshold)
            signature_obsessions = []
            for pattern, count in existing_patterns.items():
                freq = count / total
                if freq >= 0.6:
                    signature_obsessions.append({
                        "pattern": pattern,
                        "frequency": freq,
                        "appears_in": f"{count}/{total} resources",
                        "note": "Consistent signature obsession"
                    })
            
            result["signature_obsessions"] = signature_obsessions
        
        return result
    
    def _aggregate_personality_incremental(
        self,
        existing: Dict,
        new_data: Dict,
        total: int
    ) -> Dict:
        """Incrementally aggregate personality scores"""
        
        result = {}
        
        # Average each personality trait
        for trait in ["playfulness", "sophistication", "energy_level", "approachability"]:
            old_val = existing.get(trait, 0)
            new_val = new_data.get(trait, 0)
            
            if new_val:  # Only update if new data has this trait
                result[trait] = (old_val * (total - 1) + new_val) / total
        
        # Update dominant traits (score > 0.6)
        dominant = [trait for trait, score in result.items() if score > 0.6]
        result["dominant_traits"] = dominant
        result["consistency"] = total / total  # Always 1.0 for now
        result["note"] = f"Averaged from {total} resources"
        
        return result
    
    def _aggregate_compositional_incremental(
        self,
        existing: Dict,
        new_data: Dict,
        total: int
    ) -> Dict:
        """Incrementally aggregate compositional patterns"""
        
        result = copy.deepcopy(existing)
        
        # Check for glassmorphism
        if "glassmorphism" in new_data:
            if "glassmorphism_signature" in existing:
                # Update frequency
                old_freq = existing["glassmorphism_signature"]["frequency"]
                old_count = round(old_freq * (total - 1))
                new_freq = (old_count + 1) / total
                
                result["glassmorphism_signature"] = {
                    "frequency": new_freq,
                    "structure": existing["glassmorphism_signature"]["structure"],
                    "note": "Signature glassmorphic treatment"
                }
            else:
                # New pattern
                result["glassmorphism_signature"] = {
                    "frequency": 1 / total,
                    "structure": "backdrop_blur_96px + low_opacity_bg + gradient_overlay",
                    "note": "Signature glassmorphic treatment"
                }
        
        return result


# Export
__all__ = ["DTMUpdaterV3"]