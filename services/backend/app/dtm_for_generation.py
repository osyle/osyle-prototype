"""
DTM for Generation - Extract and format DTM rules for UI generation
Reads DTM/DTR, never modifies them
"""
from typing import Dict, Any, List, Optional


class DTMForGeneration:
    """Extract relevant DTM rules for UI generation task"""
    
    def extract_for_task(
        self,
        dtm: Dict[str, Any],
        task_description: str,
        platform: str = "web"
    ) -> Dict[str, Any]:
        """
        Extract ~20% of DTM rules relevant to this task
        
        Args:
            dtm: Full or filtered DTM
            task_description: User's task (e.g., "dashboard")
            platform: "web" | "phone"
            
        Returns:
            Relevant rules dict for prompt
        """
        
        # Infer context from task
        task_context = self._infer_context(task_description, platform)
        
        semantic = dtm.get("semantic_rules", {})
        stats = dtm.get("statistical_patterns", {})
        
        relevant = {
            "invariants": semantic.get("invariants", []),  # All (MUST follow)
            "contextual_rules": self._filter_contextual_rules(
                semantic.get("contextual_rules", []),
                task_context
            ),
            "meta_rules": semantic.get("meta_rules", []),  # All (HOW to think)
            "statistical_constraints": self._extract_statistical_constraints(stats),
            "task_context": task_context
        }
        
        return relevant
    
    def format_for_prompt(self, relevant_rules: Dict[str, Any]) -> str:
        """
        Format relevant rules as text for prompt injection
        
        Returns concise, actionable text for LLM
        """
        
        lines = []
        
        # Header
        lines.append("=== DESIGNER TASTE MODEL (DTM) ===")
        lines.append("Apply the designer's intelligence below:\n")
        
        # Invariants (MUST)
        if relevant_rules.get("invariants"):
            lines.append("## INVARIANTS (MUST Follow)")
            for inv in relevant_rules["invariants"]:
                lines.append(f"  âœ… {inv.get('description', inv.get('rule', ''))}")
            lines.append("")
        
        # Contextual rules (SHOULD)
        if relevant_rules.get("contextual_rules"):
            lines.append("## CONTEXTUAL RULES (SHOULD Follow for this task)")
            for rule in relevant_rules["contextual_rules"]:
                ctx = rule.get("context", {})
                rules = rule.get("rules", {})
                lines.append(f"  Context: {ctx}")
                lines.append(f"  Rules: {rules}")
            lines.append("")
        
        # Meta-rules (HOW)
        if relevant_rules.get("meta_rules"):
            lines.append("## DESIGNER THINKING (How designer approaches design)")
            for mr in relevant_rules["meta_rules"]:
                lines.append(f"  đź'ˇ {mr.get('rule', '')}: {mr.get('description', '')[:100]}")
            lines.append("")
        
        # Statistical constraints
        if relevant_rules.get("statistical_constraints"):
            lines.append("## QUANTITATIVE CONSTRAINTS")
            constraints = relevant_rules["statistical_constraints"]
            
            if "spacing_quantum" in constraints:
                lines.append(f"  Spacing quantum: {constraints['spacing_quantum']}px")
                if constraints.get("common_spacings"):
                    lines.append(f"  Common values: {constraints['common_spacings']}px")
            
            if "type_scale_ratio" in constraints:
                lines.append(f"  Type scale ratio: {constraints['type_scale_ratio']}")
                if constraints.get("common_sizes"):
                    lines.append(f"  Common sizes: {constraints['common_sizes']}px")
            
            if "common_colors" in constraints:
                lines.append(f"  Common colors: {constraints['common_colors']}")
            
            if "common_radii" in constraints:
                lines.append(f"  Corner radii: {constraints['common_radii']}px")
            
            lines.append("")
        
        lines.append("Use these rules to generate UI that embodies the designer's taste.\n")
        
        return "\n".join(lines)
    
    def _infer_context(self, task_description: str, platform: str) -> Dict[str, str]:
        """Infer design context from task description"""
        
        task_lower = task_description.lower()
        
        # Infer screen type
        screen_type = "general"
        if any(word in task_lower for word in ["dashboard", "analytics", "metrics", "data"]):
            screen_type = "dashboard"
        elif any(word in task_lower for word in ["landing", "marketing", "hero", "promo"]):
            screen_type = "marketing"
        elif any(word in task_lower for word in ["form", "signup", "login", "input"]):
            screen_type = "form"
        elif any(word in task_lower for word in ["profile", "settings", "account"]):
            screen_type = "profile"
        
        # Infer content density
        content_density = "medium"
        if any(word in task_lower for word in ["dashboard", "data", "table", "list", "many"]):
            content_density = "high"
        elif any(word in task_lower for word in ["hero", "landing", "minimal", "simple"]):
            content_density = "low"
        
        return {
            "screen_type": screen_type,
            "platform": platform,
            "content_density": content_density,
            "primary_use_case": screen_type
        }
    
    def _filter_contextual_rules(
        self,
        contextual_rules: List[Dict],
        task_context: Dict[str, str]
    ) -> List[Dict]:
        """Filter contextual rules by similarity to task context"""
        
        relevant = []
        
        for rule in contextual_rules:
            rule_context = rule.get("context", {})
            similarity = self._calculate_context_similarity(rule_context, task_context)
            
            if similarity > 0.5:  # 50% match threshold
                relevant.append(rule)
        
        return relevant
    
    def _calculate_context_similarity(
        self,
        context1: Dict[str, str],
        context2: Dict[str, str]
    ) -> float:
        """Calculate similarity between two contexts"""
        
        if not context1 or not context2:
            return 0.0
        
        matches = 0
        total = 0
        
        for key in set(context1.keys()) | set(context2.keys()):
            total += 1
            if context1.get(key) == context2.get(key):
                matches += 1
        
        return matches / total if total > 0 else 0.0
    
    def _extract_statistical_constraints(self, stats: Dict[str, Any]) -> Dict[str, Any]:
        """Extract key statistical values for generation"""
        
        constraints = {}
        
        # Spacing
        spacing = stats.get("spacing", {})
        if spacing:
            quantum = spacing.get("quantum", {})
            constraints["spacing_quantum"] = quantum.get("mode") or quantum.get("mean")
            
            common_vals = spacing.get("common_values", {})
            if common_vals.get("top_10"):
                constraints["common_spacings"] = common_vals["top_10"][:5]
        
        # Typography
        typo = stats.get("typography", {})
        if typo:
            scale = typo.get("scale_ratio", {})
            constraints["type_scale_ratio"] = scale.get("mean") or scale.get("median")
            
            sizes = typo.get("sizes", {})
            if sizes.get("common_sizes"):
                constraints["common_sizes"] = sizes["common_sizes"][:6]
        
        # Colors
        colors = stats.get("colors", {})
        if colors:
            common = colors.get("common_colors", {})
            if common.get("top_20"):
                constraints["common_colors"] = common["top_20"][:8]
        
        # Forms
        forms = stats.get("forms", {})
        if forms:
            radii = forms.get("corner_radii", {})
            if radii.get("common_radii"):
                constraints["common_radii"] = radii["common_radii"][:5]
        
        return constraints


# Example usage
if __name__ == "__main__":
    print("DTMForGeneration - Extract rules for UI generation")
    print("\nUsage:")
    print("""
    extractor = DTMForGeneration()
    
    # Extract relevant rules
    relevant = extractor.extract_for_task(
        dtm=filtered_dtm,
        task_description="dashboard showing user metrics",
        platform="web"
    )
    
    # Format for prompt
    prompt_text = extractor.format_for_prompt(relevant)
    """)