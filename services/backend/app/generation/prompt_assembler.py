"""
Prompt Assembler - Dynamically build generation prompts from modular templates + DTM data

This is the core of the new 10x taste system. It takes:
1. Modular prompt templates (core, taste_injection, etc.)
2. Actual DTM/DTR data from the new system
3. Task description and constraints

And produces a complete, taste-rich prompt that enforces:
- Layer 1: Hard constraints (exact tokens)
- Layer 2: Strong preferences (patterns)
- Layer 3: Contextual reasoning (personality)
- Layer 4: Few-shot learning (code examples)
"""

import os
from pathlib import Path
from typing import Dict, Any, List, Optional
import json


class PromptAssembler:
    """
    Assembles generation prompts from modular templates + DTM data
    
    Implements the 4-layer constraint system:
    1. HARD CONSTRAINTS: Exact tokens (colors, fonts, spacing)
    2. STRONG PREFERENCES: Patterns & philosophy
    3. CONTEXTUAL REASONING: Personality & heuristics
    4. FEW-SHOT LEARNING: Code examples
    """
    
    def __init__(self, prompts_dir: Optional[str] = None):
        """
        Args:
            prompts_dir: Path to prompts directory. Defaults to app/generation/prompts/
        """
        if prompts_dir is None:
            # Default to app/generation/prompts/
            current_file = Path(__file__)
            prompts_dir = current_file.parent / "prompts"
        
        self.prompts_dir = Path(prompts_dir)
        
        # Verify directory exists
        if not self.prompts_dir.exists():
            raise ValueError(f"Prompts directory not found: {self.prompts_dir}")
    
    def assemble(
        self,
        task_description: str,
        taste_data: Dict[str, Any],
        taste_source: str,
        device_info: Dict[str, Any],
        flow_context: Optional[Dict[str, Any]] = None,
        mode: str = "default",
        model: str = "claude-sonnet-4.5",
        responsive: bool = True
    ) -> str:
        """
        Assemble complete generation prompt
        
        Args:
            task_description: What to build
            taste_data: DTM or DTR data
            taste_source: "dtr", "subset_dtm", or "full_dtm"
            device_info: Platform and screen dimensions
            flow_context: Optional flow context for multi-screen
            mode: Generation mode ("default", "parametric", etc.)
            model: Target LLM model
            responsive: Enable responsive design mode (default: True)
        
        Returns:
            Complete prompt string
        """
        
        sections = []
        
        # 1. Core role and rules
        sections.append(self._load_template("core/role_and_rules.md"))
        
        # 2. Design quality standards (ALWAYS included)
        sections.append(self._load_template("core/design_quality.md"))
        
        # 3. Responsive system (if enabled)
        if responsive:
            sections.append(self._load_template("core/responsive_system.md"))
        
        # 4. Taste context (4-layer system)
        taste_context = self._format_taste_context(
            taste_data,
            taste_source,
            responsive=responsive
        )
        sections.append(taste_context)
        
        # 4. Task and constraints
        task_section = self._format_task(
            task_description,
            device_info,
            flow_context,
            is_responsive=responsive
        )
        sections.append(task_section)
        
        # 5. Output structure
        sections.append(self._load_template("core/output_structure.md"))
        
        # 6. Mode-specific additions (if needed)
        if mode == "parametric":
            # Add parametric-specific instructions
            pass
        
        return "\n\n---\n\n".join(sections)
    
    def _load_template(self, template_path: str) -> str:
        """Load template file from prompts directory"""
        full_path = self.prompts_dir / template_path
        
        if not full_path.exists():
            raise ValueError(f"Template not found: {full_path}")
        
        with open(full_path, 'r', encoding='utf-8') as f:
            return f.read()
    
    def _format_taste_context(
        self,
        taste_data: Dict[str, Any],
        taste_source: str,
        responsive: bool = True
    ) -> str:
        """
        Convert DTM/DTR data into 4-layer constraint system
        
        This is where the magic happens - taking raw DTM JSON and
        formatting it into explicit, hierarchical constraints.
        
        Args:
            taste_data: DTM or DTR data
            taste_source: Source type
            responsive: Enable responsive adaptations
        """
        
        # Start with source-specific emphasis
        emphasis = self._get_source_emphasis(taste_source)
        
        # Extract data for each layer
        exact_tokens = taste_data.get("consolidated_tokens", taste_data.get("exact_tokens", {}))
        personality = taste_data.get("unified_personality", taste_data.get("personality", {}))
        consensus = taste_data.get("consensus_narrative", taste_data.get("cross_cutting_patterns", {}))
        
        # Build each layer
        layer1 = self._format_layer1_exact_tokens(exact_tokens, responsive=responsive)
        layer2 = self._format_layer2_patterns(consensus)
        layer3 = self._format_layer3_personality(personality)
        layer4 = self._format_layer4_examples(exact_tokens.get("components", []))
        
        return f"""# DESIGN TASTE - COMPLETE SYNTHESIS

{emphasis}

---

{layer1}

---

{layer2}

---

{layer3}

---

{layer4}
"""
    
    def _get_source_emphasis(self, taste_source: str) -> str:
        """Get emphasis text based on DTM/DTR source"""
        if taste_source == "dtr":
            return """**SOURCE**: Single design resource (DTR)

**EMPHASIS**: Maximum fidelity to this ONE design. Every decision should match this specific reference as closely as possible within the task constraints."""
        
        elif taste_source == "subset_dtm":
            return """**SOURCE**: Subset DTM (selected resources prioritized)

**EMPHASIS**: These specific resources were chosen by the user. Prioritize patterns and tokens from these resources over the full taste."""
        
        else:  # full_dtm
            return """**SOURCE**: Complete taste synthesis (all resources)

**EMPHASIS**: This represents the designer's overall aesthetic across all their work. Apply the consensus patterns and unified personality."""
    
    def _format_layer1_exact_tokens(self, exact_tokens: Dict[str, Any], responsive: bool = True) -> str:
        """Format Layer 1: Hard constraints (exact tokens)"""
        
        sections = []
        sections.append("# LAYER 1: HARD CONSTRAINTS - ABSOLUTELY NON-NEGOTIABLE\n")
        
        if responsive:
            sections.append("These are EXACT tokens extracted from the designer's work. In **RESPONSIVE MODE**, you must MAINTAIN THE ESSENCE while adapting to viewport:\n")
            sections.append("- **Colors**: Use exact hex values at ALL viewport sizes")
            sections.append("- **Fonts**: Use exact families/weights at ALL sizes, scale sizes proportionally with responsive classes")
            sections.append("- **Spacing**: Maintain quantum multiples, scale quantum with viewport (0.75x mobile, 1x tablet, 1.25x desktop)")
            sections.append("- **Effects**: Same materials/shadows/radii at all viewport sizes\n")
        else:
            sections.append("These are EXACT tokens extracted from the designer's work. You are **FORBIDDEN** from using anything not explicitly listed here.\n")
        
        # Colors
        if "colors" in exact_tokens:
            sections.append(self._format_colors(exact_tokens["colors"]))
        
        # Typography
        if "typography" in exact_tokens:
            sections.append(self._format_typography(exact_tokens["typography"], responsive=responsive))
        
        # Spacing
        if "spacing" in exact_tokens:
            sections.append(self._format_spacing(exact_tokens["spacing"], responsive=responsive))
        
        # Materials & Effects
        if "materials" in exact_tokens:
            sections.append(self._format_materials(exact_tokens["materials"]))
        
        return "\n\n".join(sections)
    
    def _format_colors(self, colors: Dict[str, Any]) -> str:
        """Format color constraints"""
        parts = []
        parts.append("## Colors - ONLY USE THESE\n")
        
        # Exact palette
        if "exact_palette" in colors:
            parts.append("### Approved Color Palette\n")
            for color in colors["exact_palette"]:
                hex_val = color.get("hex", "")
                role = color.get("role", "unknown")
                freq = color.get("frequency", 0)
                contexts = ", ".join(color.get("contexts", []))
                
                parts.append(f"**{hex_val}** ({role})")
                parts.append(f"- Frequency: {freq}")
                if contexts:
                    parts.append(f"- Used in: {contexts}")
                parts.append("")
        
        # Relationships
        if "relationships" in colors:
            parts.append("### Color Relationships & Usage\n")
            parts.append(colors["relationships"])
            parts.append("")
        
        # Critical rules
        parts.append("**CRITICAL RULES**:")
        parts.append("- ❌ FORBIDDEN: Any hex value not listed above")
        parts.append("- ❌ FORBIDDEN: CSS color names (blue, red, green, etc.)")
        parts.append("- ❌ FORBIDDEN: Creating new colors through mixing")
        parts.append("- ✅ ALLOWED: Exact hex values from list above")
        parts.append("- ✅ ALLOWED: Opacity variations of listed colors")
        parts.append("")
        parts.append("**Before using ANY color**: Verify it's in the approved list. If tempted to use unlisted color, STOP and use closest approved color instead.")
        
        return "\n".join(parts)
    
    def _format_typography(self, typography: Dict[str, Any], responsive: bool = True) -> str:
        """Format typography constraints"""
        parts = []
        parts.append("## Typography - ONLY USE THESE\n")
        
        # Font families
        if "families" in typography:
            parts.append("### Font Families\n")
            for family in typography["families"]:
                name = family.get("name", family.get("family_name", ""))
                weights = family.get("weights", [])
                
                parts.append(f"**{name}**")
                if weights:
                    parts.append(f"- Weights: {', '.join(map(str, weights))}")
                parts.append("")
        
        # Font sizes
        if "sizes_used" in typography:
            sizes = typography["sizes_used"]
            parts.append(f"### Font Sizes (px)\n")
            if responsive:
                parts.append("**RESPONSIVE MODE**: These are BASE sizes. Scale proportionally:")
                parts.append("- Mobile (< 640px): ~0.75-0.85x")
                parts.append("- Desktop (> 1024px): ~1.0-1.15x")
                parts.append("- Use responsive classes: `text-xl md:text-2xl lg:text-3xl`\n")
            parts.append(f"Approved sizes: {', '.join(map(str, sorted(sizes)))}\n")
        
        # Scale metrics
        if "scale_metrics" in typography:
            metrics = typography["scale_metrics"]
            ratio = metrics.get("ratio_mean", 0)
            consistency = metrics.get("ratio_consistency", 0)
            
            parts.append(f"### Type Scale")
            parts.append(f"- Scale ratio: {ratio:.2f}")
            parts.append(f"- Consistency: {consistency:.2f}")
            if responsive:
                parts.append("- **CRITICAL**: Maintain this ratio across ALL viewport sizes")
            else:
                parts.append("- This ratio MUST be maintained when choosing sizes")
            parts.append("")
        
        # Critical rules
        parts.append("**CRITICAL RULES**:")
        parts.append("- ❌ FORBIDDEN: Any font family not listed")
        parts.append("- ❌ FORBIDDEN: Font weights not in approved list")
        if responsive:
            parts.append("- ⚠️  Font sizes: Scale proportionally with responsive classes")
            parts.append("- ⚠️  Hierarchy ratios: MUST maintain at all viewport sizes")
        else:
            parts.append("- ❌ FORBIDDEN: Font sizes not in the scale")
        parts.append("- ✅ ALLOWED: Only listed fonts, weights, and sizes")
        
        return "\n".join(parts)
    
    def _format_spacing(self, spacing: Dict[str, Any], responsive: bool = True) -> str:
        """Format spacing constraints"""
        parts = []
        parts.append("## Spacing - ONLY USE THESE VALUES\n")
        
        # Quantum
        quantum = spacing.get("quantum", "4px")
        parts.append(f"### Spacing Quantum\n")
        parts.append(f"**Base quantum**: {quantum}\n")
        
        if responsive:
            parts.append("\n**RESPONSIVE MODE - Quantum Scaling**:")
            parts.append(f"- Mobile (< 640px): {quantum} × 0.75")
            parts.append(f"- Tablet (640-1024px): {quantum} × 1.0 (base)")
            parts.append(f"- Desktop (> 1024px): {quantum} × 1.25")
            parts.append("\nAll spacing at each breakpoint MUST be multiples of the scaled quantum.")
            parts.append("Use responsive classes: `p-4 md:p-6 lg:p-8`\n")
        else:
            parts.append("All spacing MUST be a multiple of this quantum.\n")
        
        # Scale
        if "scale" in spacing:
            scale = spacing["scale"]
            parts.append(f"### Spacing Scale\n")
            if responsive:
                parts.append(f"Base scale (tablet): {', '.join(map(str, scale))} px\n")
            else:
                parts.append(f"Approved values (px): {', '.join(map(str, scale))}\n")
        
        # Critical rules
        parts.append("**CRITICAL RULES**:")
        if responsive:
            parts.append("- ⚠️  Scale quantum with viewport (0.75x, 1x, 1.25x)")
            parts.append("- ⚠️  Maintain quantum multiples at each breakpoint")
            parts.append("- ✅ Use responsive classes: `p-4 md:p-6 lg:p-8`")
            parts.append("- ❌ FORBIDDEN: Fixed pixel values that don't scale")
        else:
            parts.append("- ❌ FORBIDDEN: Values not in the scale (e.g., 10px, 15px if not listed)")
            parts.append("- ❌ FORBIDDEN: Arbitrary spacing that breaks the quantum")
            parts.append("- ✅ ALLOWED: Only values from the approved scale")
        parts.append("")
        parts.append("**Before using ANY spacing value**: Verify it maintains quantum multiples at each breakpoint.")
        
        return "\n".join(parts)
    
    def _format_materials(self, materials: Dict[str, Any]) -> str:
        """Format materials & effects constraints"""
        parts = []
        parts.append("## Materials & Effects\n")
        
        # Depth planes
        if "depth_planes" in materials:
            parts.append("### Elevation & Depth\n")
            for plane in materials["depth_planes"]:
                name = plane.get("name", "")
                z_index = plane.get("z_index", 0)
                treatment = plane.get("treatment", "")
                
                parts.append(f"**{name}** (z-index: {z_index})")
                if treatment:
                    parts.append(f"- Treatment: {treatment}")
                parts.append("")
        
        # Effects vocabulary
        if "effects_vocabulary" in materials:
            parts.append("### Effects Vocabulary\n")
            for effect in materials["effects_vocabulary"]:
                name = effect.get("name", "")
                effect_type = effect.get("type", "")
                params = effect.get("parameters", {})
                
                parts.append(f"**{name}**")
                parts.append(f"- Type: {effect_type}")
                if params:
                    params_str = ", ".join([f"{k}: {v}" for k, v in params.items()])
                    parts.append(f"- Parameters: {params_str}")
                parts.append("")
        
        return "\n".join(parts)
    
    def _format_layer2_patterns(self, consensus: Dict[str, Any]) -> str:
        """Format Layer 2: Strong preferences (patterns & philosophy)"""
        
        parts = []
        parts.append("# LAYER 2: STRONG PREFERENCES - APPLY CONSISTENTLY\n")
        parts.append("These are patterns and philosophies extracted from the designer's work. Apply these as strong preferences.\n")
        
        # Spatial philosophy
        if "spatial_philosophy" in consensus:
            parts.append("## Spatial Philosophy\n")
            parts.append(consensus["spatial_philosophy"])
            parts.append("")
        
        # Color relationships
        if "color_relationships" in consensus:
            parts.append("## Color Relationships\n")
            parts.append(consensus["color_relationships"])
            parts.append("")
        
        # Typography philosophy
        if "typography_philosophy" in consensus:
            parts.append("## Typography Philosophy\n")
            parts.append(consensus["typography_philosophy"])
            parts.append("")
        
        # Surface treatment
        if "surface_treatment" in consensus:
            parts.append("## Surface Treatment\n")
            parts.append(consensus["surface_treatment"])
            parts.append("")
        
        # Component vocabulary
        if "component_vocabulary" in consensus:
            parts.append("## Component Vocabulary\n")
            parts.append(consensus["component_vocabulary"])
            parts.append("")
        
        # Image integration
        if "image_integration" in consensus:
            parts.append("## Image Integration\n")
            parts.append(consensus["image_integration"])
            parts.append("")
        
        return "\n".join(parts)
    
    def _format_layer3_personality(self, personality: Dict[str, Any]) -> str:
        """Format Layer 3: Contextual reasoning (personality & heuristics)"""
        
        parts = []
        parts.append("# LAYER 3: PERSONALITY - DECISION-MAKING GUIDE\n")
        parts.append("This is how the designer THINKS. Use these heuristics when making design decisions.\n")
        
        # Design lineage
        if "design_lineage" in personality:
            parts.append("## Design Lineage\n")
            parts.append(personality["design_lineage"])
            parts.append("")
        
        # Emotional register
        if "emotional_register" in personality:
            parts.append("## Emotional Register\n")
            parts.append(personality["emotional_register"])
            parts.append("")
        
        # Decision heuristics
        if "decision_heuristics" in personality:
            parts.append("## Decision Heuristics\n")
            parts.append("When choosing between options, apply these rules:\n")
            
            heuristics = personality["decision_heuristics"]
            
            if "complexity_approach" in heuristics:
                parts.append("### Complexity Approach\n")
                parts.append(heuristics["complexity_approach"])
                parts.append("")
            
            if "drama_vs_usability" in heuristics:
                parts.append("### Drama vs Usability\n")
                parts.append(heuristics["drama_vs_usability"])
                parts.append("")
            
            if "density_preference" in heuristics:
                parts.append("### Density Preference\n")
                parts.append(heuristics["density_preference"])
                parts.append("")
            
            if "color_philosophy" in heuristics:
                parts.append("### Color Philosophy\n")
                parts.append(heuristics["color_philosophy"])
                parts.append("")
            
            if "spacing_philosophy" in heuristics:
                parts.append("### Spacing Philosophy\n")
                parts.append(heuristics["spacing_philosophy"])
                parts.append("")
        
        # Signature obsessions
        if "cross_resource_obsessions" in personality:
            parts.append("## Signature Obsessions - ALWAYS APPLY THESE\n")
            parts.append("These are patterns this designer uses with near-100% consistency. **These are NOT optional**.\n")
            
            for obsession in personality["cross_resource_obsessions"]:
                pattern = obsession.get("pattern", "")
                universality = obsession.get("universality", "")
                rule = obsession.get("application_rule", "")
                
                parts.append(f"### {pattern}\n")
                parts.append(f"- Universality: {universality}")
                parts.append(f"- **Application rule**: {rule}")
                parts.append("")
        
        # Universal absences
        if "universal_absences" in personality:
            parts.append("## Notable Absences - NEVER DO THESE\n")
            parts.append("These are things this designer **never** does. Avoid them completely.\n")
            
            for absence in personality["universal_absences"]:
                parts.append(f"- ❌ {absence}")
            
            parts.append("")
            parts.append("**These absences are as important as what the designer DOES do.**")
        
        return "\n".join(parts)
    
    def _format_layer4_examples(self, components: List[Dict[str, Any]]) -> str:
        """Format Layer 4: Few-shot learning (code examples)"""
        
        parts = []
        parts.append("# LAYER 4: CODE EXAMPLES - STUDY THESE\n")
        parts.append("These are actual component implementations from this designer's work.\n")
        
        if not components:
            parts.append("*No component examples available yet. Apply Layers 1-3 carefully.*")
            return "\n".join(parts)
        
        for component in components[:5]:  # Limit to top 5 components
            name = component.get("name", "Component")
            frequency = component.get("frequency", 0)
            code = component.get("code_example", "")
            
            parts.append(f"## {name}\n")
            parts.append(f"**Occurrences**: {frequency}\n")
            
            if code:
                parts.append("### Code Pattern\n")
                parts.append("```jsx")
                parts.append(code)
                parts.append("```\n")
            
            parts.append("Study how this designer:")
            parts.append("- Uses exact spacing values")
            parts.append("- Applies color palette")
            parts.append("- Handles typography hierarchy")
            parts.append("- Implements signature patterns\n")
        
        return "\n".join(parts)
    
    def _format_task(
        self,
        task_description: str,
        device_info: Dict[str, Any],
        flow_context: Optional[Dict[str, Any]],
        is_responsive: bool = True
    ) -> str:
        """Format task description and constraints"""
        
        parts = []
        parts.append("# YOUR TASK\n")
        
        # Task description
        parts.append("## What to Build\n")
        parts.append(task_description)
        parts.append("")
        
        # Device context
        parts.append("## Device Context\n")
        platform = device_info.get("platform", "web")
        width = device_info.get("screen", {}).get("width", 1440)
        height = device_info.get("screen", {}).get("height", 900)
        
        parts.append(f"- Platform: {platform}")
        parts.append(f"- Initial viewport: {width}x{height}px")
        parts.append("")
        
        if is_responsive:
            # Responsive mode
            parts.append("## Responsive Design Requirements\n")
            parts.append(f"**Initial rendering size**: {width}x{height}px (this is your starting reference)")
            parts.append("")
            parts.append("**CRITICAL**: The design will be viewed at MANY different viewport sizes.")
            parts.append("The user can freely resize from mobile (320px) to ultra-wide (2560px+).\n")
            parts.append("**Root container MUST be fluid**:")
            parts.append("```jsx")
            parts.append('<div className="w-full h-full min-h-screen">')
            parts.append("  {/* NOT fixed pixels */}")
            parts.append("</div>")
            parts.append("```\n")
            parts.append("**Platform determines UX patterns, NOT layout adaptation**:")
            if platform == "phone":
                parts.append("- Platform='phone' → Use touch-friendly interactions (≥44px tap targets, bottom nav)")
                parts.append("- BUT: Layout MUST still adapt - use multi-column grids when space allows")
                parts.append("- A phone app at 1440px wide should use that space efficiently")
            else:
                parts.append("- Platform='web' → Use desktop-capable interactions (hover states, keyboard nav)")
                parts.append("- Adapt down gracefully if viewport shrinks to mobile size")
                parts.append("- Always fill available space - never create fixed-width centered cards")
            parts.append("")
            parts.append("**Implementation approach**:")
            parts.append("1. Use the initial size as your BASE for proportion decisions")
            parts.append("2. Make everything fluid with Tailwind responsive classes")
            parts.append("3. Scale spacing quantum: 0.75x (mobile), 1x (tablet), 1.25x (desktop)")
            parts.append("4. Scale typography proportionally while maintaining hierarchy ratios")
            parts.append("5. Adapt layout from single-column → multi-column as space allows")
            parts.append("")
        else:
            # Legacy fixed-size mode
            parts.append(f"- Screen: {width}x{height}px (fixed)")
            parts.append("")
            parts.append("**Root div must match these exact dimensions**:")
            parts.append(f"```jsx")
            parts.append(f'<div style={{ width: "{width}px", height: "{height}px" }}>')
            parts.append("```\n")
        
        # Flow context (if multi-screen)
        if flow_context:
            parts.append("## Flow Context\n")
            parts.append("This screen is part of a multi-screen flow.\n")
            
            screen_name = flow_context.get("screen_name", "")
            position = flow_context.get("position_in_flow", 0)
            total = flow_context.get("total_screens", 1)
            
            parts.append(f"- Screen: {screen_name}")
            parts.append(f"- Position: {position} of {total}")
            parts.append("")
            
            # Transitions
            if "outgoing_transitions" in flow_context:
                parts.append("### Navigation\n")
                parts.append("Implement these transitions:\n")
                
                for transition in flow_context["outgoing_transitions"]:
                    trans_id = transition.get("transition_id", "")
                    label = transition.get("label", "")
                    trigger = transition.get("trigger", "")
                    flow_type = transition.get("flow_type", "")
                    
                    parts.append(f"**{label}**:")
                    parts.append(f"- Trigger: {trigger}")
                    parts.append(f"- Type: {flow_type}")
                    parts.append(f"- Call: `onTransition('{trans_id}')`")
                    parts.append("")
        
        return "\n".join(parts)