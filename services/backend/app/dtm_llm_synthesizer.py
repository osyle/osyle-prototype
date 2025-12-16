"""
DTM LLM Synthesizer
Uses LLM to extract semantic rules from statistical patterns + sample DTRs
Lightweight - only processes summary statistics, not full DTRs
"""
from typing import Dict, Any, List
import json


class DTMLLMSynthesizer:
    """Synthesize semantic rules using LLM"""
    
    def __init__(self, llm_client):
        """
        Args:
            llm_client: LLM client with call_claude method
        """
        self.llm = llm_client
    
    async def synthesize_rules(
        self,
        statistical_patterns: Dict[str, Any],
        sample_dtrs: List[Dict[str, Any]],
        max_samples: int = 3
    ) -> Dict[str, Any]:
        """
        Synthesize semantic rules from statistical patterns
        
        Args:
            statistical_patterns: From DTMStatisticalExtractor
            sample_dtrs: Sample DTRs for context (full DTRs, we'll extract excerpts)
            max_samples: Maximum DTRs to include as examples (default 3)
            
        Returns:
            Semantic rules dict with invariants, contextual_rules, meta_rules
        """
        
        # Format statistical patterns for prompt
        stats_text = self._format_statistical_patterns(statistical_patterns)
        
        # Extract cognitive excerpts from sample DTRs
        excerpts_text = self._extract_dtr_excerpts(sample_dtrs[:max_samples])
        
        # Build prompt
        prompt = f"""=== STATISTICAL PATTERNS ===

{stats_text}

=== SAMPLE DTR EXCERPTS ===

{excerpts_text}
"""
        
        # Call LLM
        response = await self.llm.call_claude(
            prompt_name="synthesize_semantic_rules",
            user_message=prompt,
            max_tokens=4000,
            parse_json=True
        )
        
        return response
    
    def _format_statistical_patterns(self, patterns: Dict[str, Any]) -> str:
        """Format statistical patterns as readable text"""
        
        lines = []
        
        # Spacing
        if "spacing" in patterns:
            spacing = patterns["spacing"]
            lines.append("Spacing:")
            
            if "quantum" in spacing:
                q = spacing["quantum"]
                lines.append(f"  - Quantum: mean={q.get('mean', 0):.1f}, "
                           f"median={q.get('median', 0)}, "
                           f"mode={q.get('mode', 0)}, "
                           f"std_dev={q.get('std_dev', 0):.2f}, "
                           f"consistency={q.get('consistency', 0):.2f}")
                lines.append(f"    All observed: {q.get('all_observed', [])}")
            
            if "common_values" in spacing:
                cv = spacing["common_values"]
                lines.append(f"  - Common values: {cv.get('top_10', [])} "
                           f"(frequency: top={cv.get('frequency', {})})")
            
            lines.append("")
        
        # Colors
        if "colors" in patterns:
            colors = patterns["colors"]
            lines.append("Colors:")
            
            if "common_colors" in colors:
                cc = colors["common_colors"]
                lines.append(f"  - Common colors: {cc.get('top_20', [])} "
                           f"(appears in {patterns['metadata']['total_dtrs']} designs)")
                lines.append(f"  - Total unique: {cc.get('total_unique', 0)}, "
                           f"Reuse rate: {cc.get('reuse_rate', 0):.2f}")
            
            if "temperature" in colors:
                lines.append(f"  - Temperature: {colors['temperature']}")
            
            if "saturation" in colors:
                lines.append(f"  - Saturation: {colors['saturation']}")
            
            lines.append("")
        
        # Typography
        if "typography" in patterns:
            typo = patterns["typography"]
            lines.append("Typography:")
            
            if "scale_ratio" in typo:
                sr = typo["scale_ratio"]
                lines.append(f"  - Scale ratio: mean={sr.get('mean', 0):.2f}, "
                           f"median={sr.get('median', 0):.2f}, "
                           f"std_dev={sr.get('std_dev', 0):.2f}, "
                           f"consistency={sr.get('consistency', 0):.2f}")
                lines.append(f"    All observed: {sr.get('all_observed', [])}")
            
            if "sizes" in typo:
                sizes = typo["sizes"]
                lines.append(f"  - Common sizes: {sizes.get('common_sizes', [])}")
                lines.append(f"  - Range: {sizes.get('range', [])}px")
            
            if "weights" in typo:
                weights = typo["weights"]
                lines.append(f"  - Weights: {weights.get('common_weights', [])} "
                           f"(consistency: 1.0)")
            
            lines.append("")
        
        # Forms
        if "forms" in patterns:
            forms = patterns["forms"]
            lines.append("Forms:")
            
            if "corner_radii" in forms:
                cr = forms["corner_radii"]
                lines.append(f"  - Corner radii: {cr.get('common_radii', [])} "
                           f"(frequency: {cr.get('frequency', {})})")
            
            if "radius_quantum" in forms:
                rq = forms["radius_quantum"]
                lines.append(f"  - Radius quantum: mean={rq.get('mean', 0):.1f}, "
                           f"consistency={rq.get('consistency', 0):.2f}")
            
            lines.append("")
        
        # Gradients
        if "gradients" in patterns:
            grads = patterns["gradients"]
            lines.append("Gradients:")
            lines.append(f"  - Usage rate: {grads.get('usage_rate', 0):.2f}")
            if grads.get("common_types"):
                lines.append(f"  - Types: {grads['common_types']}")
            lines.append("")
        
        # Effects
        if "effects" in patterns:
            effects = patterns["effects"]
            lines.append("Effects:")
            if effects.get("common_effects"):
                lines.append(f"  - Common: {effects['common_effects']}")
            lines.append("")
        
        return "\n".join(lines)
    
    def _extract_dtr_excerpts(self, dtrs: List[Dict[str, Any]]) -> str:
        """Extract relevant excerpts from DTRs for LLM context"""
        
        excerpts = []
        
        for i, dtr in enumerate(dtrs, 1):
            dtr_id = dtr.get("meta", {}).get("resource_id", f"dtr_{i}")
            context = dtr.get("meta", {}).get("context", {})
            
            excerpt = [f"\nDTR {i} ({dtr_id})"]
            excerpt.append(f"Context: {context}")
            
            # Cognitive process
            if "cognitive_process" in dtr:
                cog = dtr["cognitive_process"]
                
                if "decision_tree" in cog:
                    excerpt.append("Decision tree:")
                    for step in cog["decision_tree"][:5]:  # First 5 steps
                        if isinstance(step, dict):
                            excerpt.append(f"  - {step.get('action', step)}")
                        else:
                            excerpt.append(f"  - {step}")
                
                if "constraint_hierarchy" in cog:
                    excerpt.append("Constraint hierarchy:")
                    for constraint in cog["constraint_hierarchy"][:5]:
                        level = constraint.get("level", "SHOULD")
                        rule = constraint.get("rule", str(constraint))
                        excerpt.append(f"  [{level}] {rule}")
                
                if "adaptation_heuristics" in cog:
                    excerpt.append("Adaptation heuristics:")
                    for key, value in list(cog["adaptation_heuristics"].items())[:3]:
                        if isinstance(value, dict):
                            strategy = value.get("strategy", "")
                            excerpt.append(f"  {key}: {strategy}")
                        else:
                            excerpt.append(f"  {key}: {value}")
            
            # Philosophy
            if "philosophy" in dtr:
                phil = dtr["philosophy"]
                
                if "signature_moves" in phil:
                    excerpt.append(f"Signature moves: {phil['signature_moves'][:3]}")
                
                if "visual_principles" in phil:
                    vp = phil["visual_principles"]
                    if isinstance(vp, dict):
                        excerpt.append(f"Dominant principle: {vp.get('dominant', '')}")
            
            excerpts.append("\n".join(excerpt))
        
        return "\n".join(excerpts)


# Mock test
if __name__ == "__main__":
    print("DTMLLMSynthesizer - use with LLM client")
    print("Example usage:")
    print("""
    synthesizer = DTMLLMSynthesizer(llm_client)
    rules = await synthesizer.synthesize_rules(
        statistical_patterns=patterns,
        sample_dtrs=[dtr1, dtr2, dtr3]
    )
    """)