"""
DTM Builder v2 - Three-Tier Designer Taste Model
Learns across multiple DTRs while preserving visual signature

Architecture:
- Tier 1: Universal Principles (baseline quality - accessibility, usability)
- Tier 2: Designer Systems (contextual patterns - spacing by context, color roles)
- Tier 3: Signature Patterns (unique moves - 60-80% frequency, high impact)

Key Innovation: Visual Example Library
- Stores references to actual resource examples for each pattern
- Used in generation to show LLM what the designer's style looks like
"""
from typing import Dict, Any, List
from datetime import datetime
from collections import Counter, defaultdict
import statistics


# ============================================================================
# FEATURE FLAGS
# ============================================================================

# Diversity-Aware Signature Selection
# When enabled, ensures each resource contributes unique patterns to signatures
# This prevents common patterns from drowning out unique creative choices
ENABLE_DIVERSITY_AWARE_SELECTION = True

# Diversity selection parameters (only used when ENABLE_DIVERSITY_AWARE_SELECTION = True)
DIVERSITY_CORE_FREQUENCY_THRESHOLD = 0.8  # Patterns in 80%+ of resources are "core"
DIVERSITY_UNIQUE_PATTERNS_PER_RESOURCE = 3  # Top 3 unique patterns per resource
DIVERSITY_MAX_TOTAL_SIGNATURES = 15  # Maximum total signature patterns

# ============================================================================


class DTMBuilderV2:
    """Build DTM v2 with three-tier architecture"""
    
    def __init__(self, llm_client=None):
        """
        Args:
            llm_client: Optional LLM for enhanced semantic synthesis
        """
        self.llm = llm_client
    
    async def build_dtm(
        self,
        dtrs: List[Dict[str, Any]],
        taste_id: str,
        owner_id: str
    ) -> Dict[str, Any]:
        """
        Build complete DTM v2 from multiple DTRs
        
        Args:
            dtrs: List of DTR v5 dictionaries (minimum 2)
            taste_id: Unique taste identifier
            owner_id: Owner/designer identifier
            
        Returns:
            Complete DTM v2 dictionary
        """
        
        # Deduplicate DTRs by resource_id (defensive against duplicate uploads)
        seen_resource_ids = set()
        unique_dtrs = []
        for dtr in dtrs:
            resource_id = dtr["meta"]["resource_id"]
            if resource_id not in seen_resource_ids:
                seen_resource_ids.add(resource_id)
                unique_dtrs.append(dtr)
            else:
                print(f"⚠️  Skipping duplicate DTR for resource {resource_id}")
        
        dtrs = unique_dtrs
        
        if len(dtrs) < 2:
            raise ValueError("Need at least 2 unique DTRs to build DTM (for pattern detection)")
        
        print(f"\n{'='*60}")
        print(f"BUILDING DTM v2 - Three-Tier Architecture")
        print(f"{'='*60}")
        print(f"Total unique DTRs: {len(dtrs)}")
        
        # Step 1: Build Tier 1 - Universal Principles
        print("\n[1/5] Building Tier 1: Universal Principles...")
        universal = self._build_universal_principles(dtrs)
        
        # Step 2: Build Tier 2 - Designer Systems (context-aware)
        print("\n[2/5] Building Tier 2: Designer Systems...")
        systems = self._build_designer_systems(dtrs)
        
        # Step 3: Build Tier 3 - Signature Patterns
        print("\n[3/5] Building Tier 3: Signature Patterns...")
        signatures = self._detect_signature_patterns(dtrs)
        
        # Step 4: Build Visual Example Library
        print("\n[4/5] Building Visual Example Library...")
        visual_library = self._build_visual_library(dtrs)
        
        # Step 5: Build context map
        print("\n[5/5] Building resource context map...")
        context_map = self._build_context_map(dtrs)
        
        # Calculate overall confidence
        overall_confidence = sum(
            dtr["meta"]["confidence_scores"]["overall"]
            for dtr in dtrs
        ) / len(dtrs)
        
        # Build complete DTM
        dtm = {
            "version": "2.0",
            "taste_id": taste_id,
            "owner_id": owner_id,
            
            "meta": {
                "created_at": datetime.utcnow().isoformat() + "Z",
                "updated_at": datetime.utcnow().isoformat() + "Z",
                "total_resources": len(dtrs),
                "total_dtrs_analyzed": len(dtrs),  # For backward compatibility
                "overall_confidence": round(overall_confidence, 2),
                "analysis_method": "three_tier_visual_first"
            },
            
            # Tier 1: Universal Principles (always apply)
            "universal_principles": universal,
            
            # Tier 2: Designer Systems (context-specific)
            "designer_systems": systems,
            
            # Tier 3: Signature Patterns (recognizable uniqueness)
            "signature_patterns": signatures,
            
            # Visual Example Library (for generation)
            "visual_library": visual_library,
            
            # Context map (for filtering)
            "context_map": context_map
        }
        
        print(f"\n✓ DTM v2 built successfully")
        print(f"  Overall confidence: {dtm['meta']['overall_confidence']:.2f}")
        print(f"  Signature patterns: {len(signatures)}")
        print(f"  Visual examples: {sum(len(v) for v in visual_library.values())}")
        
        return dtm
    
    def _build_universal_principles(self, dtrs: List[Dict]) -> Dict[str, Any]:
        """
        Build Tier 1: Universal Principles
        
        These are baseline quality standards that should always be met
        Derived from industry best practices + designer's adherence
        """
        
        return {
            "accessibility": {
                "min_contrast_ratio": 4.5,
                "min_touch_target": 44,
                "note": "Based on WCAG 2.1 AA standards"
            },
            
            "usability": {
                "clear_hierarchy": "MUST",
                "consistent_spacing": "SHOULD",
                "predictable_interactions": "MUST"
            },
            
            "performance": {
                "avoid_layout_shifts": "SHOULD",
                "optimize_images": "SHOULD"
            }
        }
    
    def _build_designer_systems(self, dtrs: List[Dict]) -> Dict[str, Any]:
        """
        Build Tier 2: Designer Systems
        
        These are the designer's systematic approaches to spacing, color, type
        KEY: Preserve context-specific variance, don't average it away
        """
        
        systems = {}
        
        # Spacing System (context-aware)
        systems["spacing"] = self._build_spacing_system(dtrs)
        
        # Typography System
        systems["typography"] = self._build_typography_system(dtrs)
        
        # Color System
        systems["color_system"] = self._build_color_system(dtrs)
        
        # Form Language
        systems["form_language"] = self._build_form_system(dtrs)
        
        return systems
    
    def _build_spacing_system(self, dtrs: List[Dict]) -> Dict[str, Any]:
        """
        Build context-aware spacing system
        
        KEY: Don't average [8, 8, 16] to 10.67px
        Instead: Dashboard → 8px, Marketing → 16px
        """
        
        # Group by context
        by_context = defaultdict(list)
        
        for dtr in dtrs:
            context = dtr["meta"]["context"]["primary_use_case"]
            quantum = dtr["quantitative"]["spacing"]["quantum"]
            
            if quantum:
                by_context[context].append(quantum)
        
        # Build context-specific rules
        context_rules = {}
        for context, quantums in by_context.items():
            if quantums:
                mode_quantum = Counter(quantums).most_common(1)[0][0]
                context_rules[context] = {
                    "quantum": mode_quantum,
                    "confidence": len(quantums) / len(dtrs),
                    "evidence_count": len(quantums)
                }
        
        # Determine default
        all_quantums = []
        for dtr in dtrs:
            q = dtr["quantitative"]["spacing"]["quantum"]
            if q:
                all_quantums.append(q)
        
        default_quantum = Counter(all_quantums).most_common(1)[0][0] if all_quantums else 8
        
        return {
            "by_context": context_rules,
            "default": default_quantum,
            "note": "Context-specific spacing - varies by use case"
        }
    
    def _build_typography_system(self, dtrs: List[Dict]) -> Dict[str, Any]:
        """Build typography system (scale ratios, weights, sizes)"""
        
        # Collect scale ratios
        scale_ratios = []
        for dtr in dtrs:
            ratio = dtr["quantitative"]["typography"]["scale_ratio"]
            if ratio:
                scale_ratios.append(ratio)
        
        # Collect common sizes across all
        all_sizes = []
        for dtr in dtrs:
            all_sizes.extend(dtr["quantitative"]["typography"]["all_sizes"])
        
        common_sizes = [s for s, count in Counter(all_sizes).most_common(10)]
        
        # Collect weights
        all_weights = set()
        for dtr in dtrs:
            all_weights.update(dtr["quantitative"]["typography"]["weights"])
        
        return {
            "scale_ratio": {
                "mean": round(statistics.mean(scale_ratios), 2) if scale_ratios else 1.5,
                "range": [min(scale_ratios), max(scale_ratios)] if scale_ratios else [1.5, 1.5],
                "consistency": self._calc_consistency(scale_ratios)
            },
            "common_sizes": common_sizes,
            "weights": sorted(list(all_weights)),
            "note": "Typography system - sizes and scale ratios"
        }
    
    def _build_color_system(self, dtrs: List[Dict]) -> Dict[str, Any]:
        """Build color system (roles, temperature, common palette)"""
        
        # Collect all colors
        all_colors = []
        for dtr in dtrs:
            all_colors.extend(dtr["quantitative"]["colors"]["all_colors"])
        
        # Find most common (these are likely intentional palette)
        common_colors = [c for c, count in Counter(all_colors).most_common(15)]
        
        # Temperature analysis
        temp_dists = [dtr["quantitative"]["colors"]["temperature"] for dtr in dtrs]
        avg_temp = self._average_distributions(temp_dists)
        
        return {
            "common_palette": common_colors,
            "temperature_preference": avg_temp,
            "note": "Color system - designer's recurring palette"
        }
    
    def _build_form_system(self, dtrs: List[Dict]) -> Dict[str, Any]:
        """Build form/shape system (corner radii, etc.)"""
        
        all_radii = []
        for dtr in dtrs:
            all_radii.extend(dtr["quantitative"]["forms"]["corner_radii"])
        
        common_radii = [r for r, count in Counter(all_radii).most_common(8)]
        
        return {
            "common_radii": common_radii,
            "note": "Form language - corner radii preferences"
        }
    
    def _detect_signature_patterns(self, dtrs: List[Dict]) -> List[Dict[str, Any]]:
        """
        Build Tier 3: Signature Patterns
        
        Two strategies available (controlled by ENABLE_DIVERSITY_AWARE_SELECTION):
        
        DIVERSITY-AWARE (recommended):
        - Ensures each resource contributes unique patterns
        - Prevents common patterns from overwhelming unique ones
        - Stratified: core patterns + unique per resource + highest scoring
        
        LEGACY TOP-K:
        - Pure score-based ranking (visual_impact * frequency * usage)
        - Minimum threshold: 2 resources OR 30%
        - Top 15 patterns overall
        """
        
        if ENABLE_DIVERSITY_AWARE_SELECTION:
            return self._detect_signatures_diversity_aware(dtrs)
        else:
            return self._detect_signatures_top_k(dtrs)
    
    def _detect_signatures_diversity_aware(self, dtrs: List[Dict]) -> List[Dict[str, Any]]:
        """
        DIVERSITY-AWARE SIGNATURE SELECTION
        
        Strategy:
        1. Core patterns: Appear in 80%+ of resources (always include)
        2. Unique patterns: Top N unique patterns from each resource
        3. Fill remainder: Highest scoring patterns not already selected
        
        This ensures:
        - Common patterns across all work are captured
        - Each resource contributes its unique signature
        - Total diversity is maximized within signature limit
        """
        
        # Step 0: Collect and score all patterns
        pattern_scores = self._calculate_pattern_scores(dtrs)
        total_resources = len(dtrs)
        
        # Build resource-to-patterns index for efficient lookup
        resource_patterns = defaultdict(list)
        for ps in pattern_scores:
            for resource_id in ps["resource_examples"]:
                resource_patterns[resource_id].append(ps)
        
        signatures = []
        used_pattern_keys = set()
        
        # STEP 1: Core patterns (appear in 80%+ of resources)
        core_patterns = [
            ps for ps in pattern_scores 
            if ps["frequency"] >= DIVERSITY_CORE_FREQUENCY_THRESHOLD
        ]
        core_patterns.sort(key=lambda x: x["score"], reverse=True)
        
        for ps in core_patterns:
            signatures.append(self._format_signature(ps, total_resources))
            used_pattern_keys.add(ps["pattern_key"])
        
        print(f"  └─ Core patterns (≥80% frequency): {len(core_patterns)}")
        
        # STEP 2: Unique patterns from each resource
        unique_patterns_added = 0
        for dtr in dtrs:
            resource_id = dtr["meta"]["resource_id"]
            
            # Get patterns for this resource that aren't already used
            available_patterns = [
                ps for ps in resource_patterns[resource_id]
                if ps["pattern_key"] not in used_pattern_keys
            ]
            
            # Sort by score and take top N unique patterns per resource
            available_patterns.sort(key=lambda x: x["score"], reverse=True)
            top_unique = available_patterns[:DIVERSITY_UNIQUE_PATTERNS_PER_RESOURCE]
            
            for ps in top_unique:
                if len(signatures) >= DIVERSITY_MAX_TOTAL_SIGNATURES:
                    break  # Hit max limit
                
                signatures.append(self._format_signature(ps, total_resources))
                used_pattern_keys.add(ps["pattern_key"])
                unique_patterns_added += 1
            
            if len(signatures) >= DIVERSITY_MAX_TOTAL_SIGNATURES:
                break
        
        print(f"  └─ Unique patterns (top {DIVERSITY_UNIQUE_PATTERNS_PER_RESOURCE} per resource): {unique_patterns_added}")
        
        # STEP 3: Fill remainder with highest scoring patterns
        remaining_slots = DIVERSITY_MAX_TOTAL_SIGNATURES - len(signatures)
        if remaining_slots > 0:
            unused_patterns = [
                ps for ps in pattern_scores
                if ps["pattern_key"] not in used_pattern_keys
            ]
            unused_patterns.sort(key=lambda x: x["score"], reverse=True)
            
            for ps in unused_patterns[:remaining_slots]:
                signatures.append(self._format_signature(ps, total_resources))
            
            print(f"  └─ Additional high-scoring patterns: {min(len(unused_patterns), remaining_slots)}")
        
        print(f"  Found {len(signatures)} signature patterns (from {len(pattern_scores)} total patterns)")
        print(f"  Strategy: Diversity-aware selection")
        
        return signatures
    
    def _detect_signatures_top_k(self, dtrs: List[Dict]) -> List[Dict[str, Any]]:
        """
        LEGACY TOP-K SIGNATURE SELECTION
        
        Strategy:
        - Minimum threshold: appears in at least 2 resources OR 30%
        - Ranked by: visual_impact * frequency * usage_in_design
        - Keep top 15 patterns
        
        Simple but can lose unique patterns from individual resources.
        """
        
        pattern_scores = self._calculate_pattern_scores(dtrs)
        total_resources = len(dtrs)
        
        # Apply minimum threshold
        min_resources = min(2, max(1, int(total_resources * 0.3)))
        filtered_patterns = [
            ps for ps in pattern_scores
            if ps["num_resources"] >= min_resources
        ]
        
        # Sort by score and take top-k
        filtered_patterns.sort(key=lambda x: x["score"], reverse=True)
        top_k = min(15, len(filtered_patterns))
        
        signatures = []
        for ps in filtered_patterns[:top_k]:
            signatures.append(self._format_signature(ps, total_resources))
        
        print(f"  Found {len(signatures)} signature patterns (from {len(pattern_scores)} total patterns)")
        print(f"  Strategy: Legacy top-k selection")
        
        return signatures
    
    def _calculate_pattern_scores(self, dtrs: List[Dict]) -> List[Dict[str, Any]]:
        """
        Calculate scores for all patterns across all resources.
        
        Returns list of pattern score dictionaries with:
        - pattern_key, score, frequency, num_resources, visual_impact
        - pattern_type, pattern_subtype, implementation, contexts
        - resource_examples
        """
        
        # Collect all visual patterns with resource_id
        all_visual_patterns = []
        for dtr in dtrs:
            resource_id = dtr["meta"]["resource_id"]
            for pattern in dtr.get("visual_patterns", []):
                pattern_with_id = pattern.copy()
                pattern_with_id["resource_id"] = resource_id
                all_visual_patterns.append(pattern_with_id)
        
        # Group by type and subtype
        pattern_groups = defaultdict(list)
        for pattern in all_visual_patterns:
            key = f"{pattern['type']}:{pattern.get('subtype', 'default')}"
            pattern_groups[key].append(pattern)
        
        total_resources = len(dtrs)
        pattern_scores = []
        
        for pattern_key, patterns in pattern_groups.items():
            # Count unique resources that have this pattern
            unique_resources = set(p.get("resource_id") for p in patterns if p.get("resource_id"))
            num_resources = len(unique_resources)
            frequency = num_resources / total_resources
            
            # Calculate visual impact score
            high_impact_count = sum(1 for p in patterns if p.get("visual_impact") == "high")
            impact_score = high_impact_count / len(patterns)  # 0.0 to 1.0
            
            # Get average usage frequency within designs
            avg_usage = sum(p.get("frequency_in_design", 1) for p in patterns) / len(patterns)
            
            # Combined score: impact * frequency * usage (normalized)
            combined_score = impact_score * frequency * min(avg_usage / 10, 1.0)
            
            # Get implementation from most representative example
            representative = max(patterns, key=lambda p: p.get("frequency_in_design", 0))
            
            # Determine visual impact label
            visual_impact = "high" if impact_score > 0.5 else "medium"
            
            pattern_scores.append({
                "pattern_key": pattern_key,
                "score": combined_score,
                "frequency": frequency,
                "num_resources": num_resources,
                "visual_impact": visual_impact,
                "pattern_type": patterns[0]["type"],
                "pattern_subtype": patterns[0].get("subtype"),
                "implementation": representative.get("implementation", {}),
                "contexts": representative.get("contexts", []),
                "resource_examples": list(unique_resources)
            })
        
        return pattern_scores
    
    def _format_signature(self, pattern_score: Dict, total_resources: int) -> Dict[str, Any]:
        """Format a pattern score dictionary into a signature pattern structure."""
        return {
            "pattern_id": pattern_score["pattern_key"].replace(":", "_"),
            "pattern_type": pattern_score["pattern_type"],
            "pattern_subtype": pattern_score["pattern_subtype"],
            "frequency": round(pattern_score["frequency"], 2),
            "visual_impact": pattern_score["visual_impact"],
            "implementation": pattern_score["implementation"],
            "contexts": pattern_score["contexts"],
            "resource_examples": pattern_score["resource_examples"][:3],  # Limit to 3 examples
            "signature_score": round(pattern_score["score"], 3),
            "note": f"Appears in {pattern_score['frequency']*100:.0f}% of designs ({pattern_score['num_resources']}/{total_resources} resources) - signature pattern"
        }
    
    def _build_visual_library(self, dtrs: List[Dict]) -> Dict[str, List[str]]:
        """
        Build Visual Example Library
        
        Maps contexts/signatures to resource IDs
        Used in generation to show actual examples
        """
        
        library = {
            "by_context": defaultdict(list),
            "by_signature": defaultdict(list),
            "all_resources": []
        }
        
        for dtr in dtrs:
            resource_id = dtr["meta"]["resource_id"]
            context = dtr["meta"]["context"]["primary_use_case"]
            
            # Add to context library
            library["by_context"][context].append(resource_id)
            
            # Add to all resources
            library["all_resources"].append(resource_id)
            
            # Add to signature library (if has signature patterns)
            for pattern in dtr.get("signature_patterns", []):
                pattern_id = pattern.get("pattern_type", "unknown")
                library["by_signature"][pattern_id].append(resource_id)
        
        # Convert defaultdicts to regular dicts
        return {
            "by_context": dict(library["by_context"]),
            "by_signature": dict(library["by_signature"]),
            "all_resources": library["all_resources"]
        }
    
    def _build_context_map(self, dtrs: List[Dict]) -> Dict[str, Dict]:
        """Build map of resource contexts for filtering"""
        
        context_map = {}
        
        for dtr in dtrs:
            resource_id = dtr["meta"]["resource_id"]
            context = dtr["meta"]["context"]
            
            context_map[resource_id] = {
                "use_case": context.get("primary_use_case"),
                "platform": context.get("platform"),
                "content_density": context.get("content_density"),
                "confidence": dtr["meta"]["confidence_scores"]["overall"]
            }
        
        return context_map
    
    # Helper methods
    
    def _calc_consistency(self, values: List[float]) -> float:
        """Calculate consistency score (0-1)"""
        if not values or len(values) < 2:
            return 1.0
        
        mean_val = statistics.mean(values)
        if mean_val == 0:
            return 1.0
        
        std_dev = statistics.stdev(values)
        cv = std_dev / mean_val
        
        return max(0.0, min(1.0, 1.0 - cv))
    
    def _average_distributions(self, distributions: List[Dict]) -> Dict[str, float]:
        """Average multiple distributions"""
        if not distributions:
            return {}
        
        all_keys = set()
        for dist in distributions:
            all_keys.update(dist.keys())
        
        averaged = {}
        for key in all_keys:
            values = [dist.get(key, 0) for dist in distributions]
            averaged[key] = round(statistics.mean(values), 2)
        
        return averaged


# Export
__all__ = ["DTMBuilderV2"]