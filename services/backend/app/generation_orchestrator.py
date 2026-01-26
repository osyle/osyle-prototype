"""
Generation Orchestrator - Uses DTM v2 for UI Generation
Combines three tiers + visual examples for tasteful output

Generation Strategy:
1. Select relevant examples from visual library (based on context)
2. Extract Tier 1 rules (universal - always apply)
3. Extract Tier 2 rules (systems - context-specific)
4. Extract Tier 3 rules (signatures - make it recognizable)
5. Generate with LLM using: rules + visual examples + signature guidance
"""
from typing import Dict, Any, List, Optional
import base64

from app.parametric import ParametricGenerator
from app.prompt_selector import get_prompt_name


class GenerationOrchestrator:
    """Orchestrate UI generation using DTM v2"""
    
    def __init__(self, llm_client, storage_client):
        """
        Args:
            llm_client: LLM service
            storage_client: S3 storage service
        """
        self.llm = llm_client
        self.storage = storage_client
    
    async def generate_ui(
        self,
        dtm: Dict[str, Any],
        task_description: str,
        device_info: Dict[str, Any],
        user_id: str,
        taste_id: str,
        selected_resource_ids: Optional[List[str]] = None,
        max_examples: int = 3,
        flow_context: Optional[Dict[str, Any]] = None,  # Flow context for multi-screen flows
        reference_mode: Optional[str] = None,  # NEW: "exact" | "redesign" | "inspiration" | "parametric"
        screen_description: Optional[str] = None,  # NEW: Screen description
        reference_files: Optional[Dict[str, Any]] = None,  # NEW: Reference files (figma_data, images)
        rendering_mode: Optional[str] = None  # NEW: "react" or "parametric"
    ) -> Dict[str, Any]:
        """
        Generate UI using DTM v2 (or exact recreation for exact mode, or parametric for parametric mode)
        
        Args:
            dtm: DTM v2 dictionary (potentially filtered) - not used for exact mode
            task_description: What to build
            device_info: Platform and screen dimensions
            user_id: For loading examples from S3
            taste_id: For loading examples from S3
            selected_resource_ids: Optional resource filter
            max_examples: Max visual examples to include
            flow_context: Optional flow context for multi-screen navigation
            reference_mode: How to use reference files - "exact", "redesign", "inspiration", or None
            screen_description: Optional screen description from user
            reference_files: Optional reference files (figma_data, images)
            rendering_mode: "react" (default) or "parametric"
            
        Returns:
            For react mode: Generated React code (string)
            For parametric mode: {"ui_code": str, "variation_space": dict}
        """
        
        # NEW: Handle parametric mode
        if rendering_mode == "parametric":
            print(f"\n{'='*60}")
            print(f"PARAMETRIC MODE - Generating with Variation Dimensions")
            print(f"{'='*60}")
            
            parametric_generator = ParametricGenerator(self.llm)
            
            result = await parametric_generator.generate(
                task_description=task_description,
                dtm=dtm,
                device_info=device_info,
                screen_context={
                    "flow_context": flow_context,
                    "screen_description": screen_description
                }
            )
            
            print(f"✓ Parametric generation complete with {len(result['variation_space']['dimensions'])} dimensions")
            
            return result  # Returns {ui_code, variation_space}
        
        # NEW: Handle exact recreation mode (no DTM needed)
        if reference_mode == "exact":
            return await self._generate_ui_exact_recreation(
                task_description=task_description,
                device_info=device_info,
                flow_context=flow_context,
                screen_description=screen_description,
                reference_files=reference_files
            )
        
        # For redesign and inspiration modes, use DTM-based generation
        print(f"\n{'='*60}")
        print(f"GENERATING UI - Visual-First Approach")
        print(f"{'='*60}")
        
        # Filter DTM if specific resources selected
        if selected_resource_ids and len(selected_resource_ids) > 0:
            print(f"\n[0/6] Filtering DTM to {len(selected_resource_ids)} selected resource(s)...")
            dtm = self._filter_dtm_by_resources(
                dtm, 
                selected_resource_ids,
                user_id,
                taste_id
            )
        
        # Step 1: Infer task context
        print("\n[1/6] Inferring task context...")
        task_context = self._infer_task_context(task_description, device_info)
        print(f"  Context: {task_context}")
        
        # Step 2: Select relevant visual examples
        print("\n[2/6] Selecting visual examples...")
        visual_examples = await self._select_visual_examples(
            dtm=dtm,
            task_context=task_context,
            user_id=user_id,
            taste_id=taste_id,
            selected_resource_ids=selected_resource_ids,
            max_examples=max_examples
        )
        print(f"  Selected {len(visual_examples)} examples")
        
        # Step 3: Extract Tier 1 rules (universal)
        print("\n[3/6] Extracting universal principles...")
        universal_rules = self._extract_universal_rules(dtm)
        
        # Step 4: Extract Tier 2 rules (systems - context-specific)
        print("\n[4/6] Extracting designer systems...")
        system_rules = self._extract_system_rules(dtm, task_context)
        
        # Step 5: Extract Tier 3 rules (signatures)
        print("\n[5/7] Extracting signature patterns...")
        signature_rules = self._extract_signature_rules(dtm, task_context)
        
        # Step 6: Extract Tier 4 rules (quirks) - NEW
        print("\n[6/7] Extracting quirks...")
        quirk_rules = self._extract_quirk_rules(dtm)
        
        # Step 7: Build prompt and generate
        print("\n[7/7] Generating UI with LLM...")
        prompt_text = self._build_generation_prompt(
            task_description=task_description,
            device_info=device_info,
            universal_rules=universal_rules,
            system_rules=system_rules,
            signature_rules=signature_rules,
            quirk_rules=quirk_rules,  # NEW: Pass quirks
            flow_context=flow_context
        )
        
        # Build message with text + images
        message_content = [
            {"type": "text", "text": prompt_text}
        ]
        
        # Add visual examples
        for example in visual_examples:
            message_content.append({
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": "image/png",
                    "data": example["image_base64"]
                }
            })
        
        # Add instruction about examples
        if visual_examples:
            example_instruction = f"\n\nVisual Reference: Above are {len(visual_examples)} examples of the designer's work. Notice their signature style, effects, and component treatments. Apply this aesthetic to the new design."
            message_content.append({
                "type": "text",
                "text": example_instruction
            })
        
        # Call LLM
        response = await self.llm.call_claude(
            prompt_name=get_prompt_name("generate_ui_with_taste"),
            user_message=message_content,
            max_tokens=8000,
            temperature=0.7
        )
        
        ui_code = response.get("text", "")
        
        print(f"✓ UI generated successfully ({len(ui_code)} characters)")
        
        return ui_code
    
    def _filter_dtm_by_resources(
        self,
        dtm: Dict[str, Any],
        selected_resource_ids: List[str],
        user_id: str,
        taste_id: str
    ) -> Dict[str, Any]:
        """
        Filter DTM to prioritize selected resources
        
        Strategy:
        1. Keep only signature patterns from selected resources
        2. Adjust designer systems to reflect selected resources
        3. Filter visual library to selected resources
        
        This ensures selecting "Light Theme" gives light-themed outputs,
        not a blend of all resources.
        """
        import copy
        filtered_dtm = copy.deepcopy(dtm)
        
        # Filter signature patterns
        original_signatures = filtered_dtm.get("signature_patterns", [])
        filtered_signatures = []
        
        for sig in original_signatures:
            # Keep signature if ANY of its resource_examples match selected resources
            sig_resources = sig.get("resource_examples", [])
            if any(res_id in selected_resource_ids for res_id in sig_resources):
                filtered_signatures.append(sig)
        
        filtered_dtm["signature_patterns"] = filtered_signatures
        
        print(f"  Signatures: {len(original_signatures)} → {len(filtered_signatures)} (filtered to selected resources)")
        
        # Filter visual library (only show selected resources)
        if "visual_library" in filtered_dtm:
            visual_lib = filtered_dtm["visual_library"]
            
            # Filter all_resources
            if "all_resources" in visual_lib:
                visual_lib["all_resources"] = [
                    r for r in visual_lib["all_resources"] 
                    if r in selected_resource_ids
                ]
            
            # Filter by_context
            if "by_context" in visual_lib:
                for context, resources in visual_lib["by_context"].items():
                    visual_lib["by_context"][context] = [
                        r for r in resources 
                        if r in selected_resource_ids
                    ]
            
            # Filter by_signature
            if "by_signature" in visual_lib:
                for sig_type, resources in visual_lib["by_signature"].items():
                    visual_lib["by_signature"][sig_type] = [
                        r for r in resources 
                        if r in selected_resource_ids
                    ]
        
        # Filter context_map (only keep selected resources)
        if "context_map" in filtered_dtm:
            filtered_dtm["context_map"] = {
                res_id: ctx 
                for res_id, ctx in filtered_dtm["context_map"].items()
                if res_id in selected_resource_ids
            }
        
        # CRITICAL: Replace designer_systems with selected resource values
        # When prioritizing specific resources, use THEIR design decisions,
        # not the aggregated DTM values
        filtered_dtm = self._replace_designer_systems(
            filtered_dtm, 
            selected_resource_ids,
            user_id,
            taste_id
        )
        
        return filtered_dtm
    
    def _replace_designer_systems(
        self,
        dtm: Dict[str, Any],
        selected_resource_ids: List[str],
        user_id: str,
        taste_id: str
    ) -> Dict[str, Any]:
        """
        Replace designer_systems with values from selected resources
        
        When user selects specific resources, they want THOSE resources' design
        decisions, not aggregated values from the entire DTM.
        
        Strategy:
        - For single resource: Use that resource's DTR values directly
        - For multiple resources: Merge their DTR values (first resource priority)
        - Extract gradient colors and prioritize them over neutral colors
        """
        try:
            # Collect design systems from selected resources
            all_spacing = []
            all_type_sizes = []
            all_base_colors = []
            all_gradient_colors = []  # NEW: Extract gradient colors separately
            all_radii = []
            all_scale_ratios = []
            
            for resource_id in selected_resource_ids:
                try:
                    # Load DTR from S3
                    dtr_data = self.storage.get_resource_dtr(user_id, taste_id, resource_id)
                    if not dtr_data:
                        print(f"  Warning: Could not load DTR for {resource_id[:8]}...")
                        continue
                    
                    quantitative = dtr_data.get("quantitative", {})
                    
                    # Spacing
                    spacing = quantitative.get("spacing", {})
                    if spacing.get("quantum"):
                        all_spacing.append(spacing["quantum"])
                    
                    # Typography
                    typography = quantitative.get("typography", {})
                    if typography.get("common_sizes"):
                        all_type_sizes.extend(typography["common_sizes"])
                    if typography.get("scale_ratio"):
                        all_scale_ratios.append(typography["scale_ratio"])
                    
                    # Colors - separate base colors and gradient colors
                    colors = quantitative.get("colors", {})
                    if colors.get("primary_palette"):
                        all_base_colors.extend(colors["primary_palette"])
                    
                    # NEW: Extract colors from gradients
                    effects = quantitative.get("effects", {})
                    gradients = effects.get("gradients", {}).get("gradients", [])
                    for gradient in gradients:
                        gradient_colors = gradient.get("colors", [])
                        all_gradient_colors.extend(gradient_colors)
                    
                    # Corner radii
                    forms = quantitative.get("forms", {})
                    if forms.get("common_radii"):
                        all_radii.extend(forms["common_radii"])
                    
                except Exception as e:
                    print(f"  Warning: Error loading DTR for {resource_id[:8]}...: {e}")
                    continue
            
            if not all_spacing and not all_type_sizes and not all_base_colors and not all_radii:
                print(f"  Warning: No design systems found in selected resources")
                return dtm
            
            # Build new designer_systems
            new_systems = {}
            
            # Spacing - use first resource's quantum or average
            if all_spacing:
                new_systems["spacing"] = {
                    "by_context": {
                        "general": {
                            "quantum": all_spacing[0],  # First resource priority
                            "confidence": 1.0
                        }
                    },
                    "default": all_spacing[0]
                }
            
            # Typography - combine unique sizes, use first scale ratio
            if all_type_sizes:
                # Deduplicate while preserving order
                unique_sizes = list(dict.fromkeys(all_type_sizes))
                new_systems["typography"] = {
                    "common_sizes": unique_sizes[:10],  # Top 10
                    "scale_ratio": {
                        "mean": all_scale_ratios[0] if all_scale_ratios else 1.5
                    }
                }
            
            # Colors - prioritize gradient colors over base colors
            if all_base_colors or all_gradient_colors:
                # Deduplicate gradient colors
                unique_gradient_colors = list(dict.fromkeys(all_gradient_colors))
                
                # Deduplicate base colors
                unique_base_colors = list(dict.fromkeys(all_base_colors))
                
                # Filter out neutrals (black, white, grays) from base colors
                # These should come AFTER gradient colors
                neutrals = []
                chromatic = []
                for color in unique_base_colors:
                    # Simple heuristic: if R, G, B are very similar, it's neutral
                    # Extract RGB values
                    import re
                    match = re.match(r'rgb\((\d+),\s*(\d+),\s*(\d+)\)', color)
                    if match:
                        r, g, b = int(match.group(1)), int(match.group(2)), int(match.group(3))
                        # If R, G, B are within 30 of each other, consider it neutral
                        if max(r, g, b) - min(r, g, b) < 30:
                            neutrals.append(color)
                        else:
                            chromatic.append(color)
                    else:
                        chromatic.append(color)  # If can't parse, keep it
                
                # Priority: gradient colors > chromatic base colors > neutrals
                final_palette = []
                
                # Add gradient colors first (these define the aesthetic)
                final_palette.extend(unique_gradient_colors)
                
                # Add chromatic base colors
                for color in chromatic:
                    if color not in final_palette:
                        final_palette.append(color)
                
                # Add neutrals last
                for color in neutrals:
                    if color not in final_palette:
                        final_palette.append(color)
                
                new_systems["color_system"] = {
                    "common_palette": final_palette[:15]  # Top 15
                }
            
            # Corner radii - deduplicate
            if all_radii:
                unique_radii = list(dict.fromkeys(all_radii))
                new_systems["form_language"] = {
                    "common_radii": unique_radii[:8]  # Top 8
                }
            
            # Replace designer_systems
            dtm["designer_systems"] = new_systems
            
            print(f"  Design systems: Replaced with values from selected resource(s)")
            print(f"    Spacing: {all_spacing[0] if all_spacing else 'N/A'}px quantum")
            print(f"    Colors: {len(unique_gradient_colors)} gradient + {len(chromatic)} chromatic + {len(neutrals)} neutrals")
            print(f"    Radii: {len(unique_radii) if all_radii else 0} from selected resources")
            
        except Exception as e:
            print(f"  Warning: Could not replace designer systems: {e}")
        
        return dtm
    
    def _infer_task_context(
        self,
        task_description: str,
        device_info: Dict[str, Any]
    ) -> Dict[str, str]:
        """Infer context from task description"""
        
        task_lower = task_description.lower()
        
        # Infer use case
        use_case = "general"
        if any(word in task_lower for word in ["dashboard", "analytics", "data"]):
            use_case = "dashboard"
        elif any(word in task_lower for word in ["landing", "hero", "marketing"]):
            use_case = "marketing"
        elif any(word in task_lower for word in ["profile", "settings", "account"]):
            use_case = "profile"
        
        # Infer content density
        content_density = "medium"
        if any(word in task_lower for word in ["data", "table", "list"]):
            content_density = "high"
        elif any(word in task_lower for word in ["minimal", "simple", "clean"]):
            content_density = "low"
        
        # Platform from device_info
        platform = device_info.get("platform", "web")
        
        return {
            "primary_use_case": use_case,
            "platform": platform,
            "content_density": content_density
        }
    
    async def _select_visual_examples(
        self,
        dtm: Dict[str, Any],
        task_context: Dict[str, str],
        user_id: str,
        taste_id: str,
        selected_resource_ids: Optional[List[str]],
        max_examples: int
    ) -> List[Dict[str, str]]:
        """
        Select most relevant visual examples from library
        
        Strategy:
        1. If resources selected → use those
        2. Else → use context-matching resources
        3. Prioritize high-confidence resources
        """
        
        visual_library = dtm.get("visual_library", {})
        context_map = dtm.get("context_map", {})
        
        # Determine candidate resources
        if selected_resource_ids:
            # User selected specific resources
            candidates = selected_resource_ids
        else:
            # Auto-select by context
            use_case = task_context["primary_use_case"]
            by_context = visual_library.get("by_context", {})
            candidates = by_context.get(use_case, visual_library.get("all_resources", []))
        
        # Sort by confidence
        candidates_with_conf = [
            (res_id, context_map.get(res_id, {}).get("confidence", 0))
            for res_id in candidates
        ]
        candidates_with_conf.sort(key=lambda x: x[1], reverse=True)
        
        # Take top N
        selected_ids = [res_id for res_id, _ in candidates_with_conf[:max_examples]]
        
        # Load images from S3
        examples = []
        for resource_id in selected_ids:
            try:
                image_bytes = self.storage.get_resource_image(user_id, taste_id, resource_id)
                if image_bytes:
                    image_base64 = base64.b64encode(image_bytes).decode('utf-8')
                    examples.append({
                        "resource_id": resource_id,
                        "image_base64": image_base64
                    })
            except Exception as e:
                print(f"Warning: Could not load image for {resource_id}: {e}")
        
        return examples
    
    def _extract_universal_rules(self, dtm: Dict) -> str:
        """Extract Tier 1: Universal principles"""
        
        universal = dtm.get("universal_principles", {})
        
        rules = []
        rules.append("## UNIVERSAL PRINCIPLES (MUST Follow)")
        
        # Accessibility
        if "accessibility" in universal:
            acc = universal["accessibility"]
            rules.append(f"✓ Contrast ratio ≥ {acc.get('min_contrast_ratio', 4.5)}")
            rules.append(f"✓ Touch targets ≥ {acc.get('min_touch_target', 44)}px")
        
        # Usability
        if "usability" in universal:
            usab = universal["usability"]
            rules.append("✓ Clear visual hierarchy")
            rules.append("✓ Consistent spacing system")
        
        return "\n".join(rules)
    
    def _extract_system_rules(self, dtm: Dict, task_context: Dict) -> str:
        """Extract Tier 2: Designer systems (context-aware)"""
        
        systems = dtm.get("designer_systems", {})
        
        rules = []
        rules.append("## DESIGNER SYSTEMS (Context-Specific Rules)")
        
        # Spacing system
        if "spacing" in systems:
            spacing = systems["spacing"]
            use_case = task_context["primary_use_case"]
            
            # Get context-specific spacing or default
            by_context = spacing.get("by_context", {})
            spacing_rule = by_context.get(use_case, {"quantum": spacing.get("default", 8)})
            
            rules.append(f"Spacing quantum: {spacing_rule['quantum']}px")
            rules.append(f"  Context: {use_case}")
        
        # Typography
        if "typography" in systems:
            typo = systems["typography"]
            scale = typo.get("scale_ratio", {})
            rules.append(f"Type scale ratio: {scale.get('mean', 1.5)}")
            rules.append(f"Common sizes: {typo.get('common_sizes', [])[:6]}px")
        
        # Colors (increased from 8 to 15 since we now extract gradient colors)
        if "color_system" in systems:
            colors = systems["color_system"]
            palette = colors.get("common_palette", [])[:15]
            if len(palette) > 10:
                rules.append(f"Designer's palette (primary 10): {palette[:10]}")
                rules.append(f"Additional colors: {palette[10:]}")
            else:
                rules.append(f"Designer's palette: {palette}")
        
        # Forms
        if "form_language" in systems:
            forms = systems["form_language"]
            radii = forms.get("common_radii", [])[:4]
            rules.append(f"Corner radii: {radii}px")
        
        return "\n".join(rules)
    
    def _extract_signature_rules(self, dtm: Dict, task_context: Dict) -> str:
        """Extract Tier 3: Signature patterns (recognizable style)"""
        
        signatures = dtm.get("signature_patterns", [])
        
        rules = []
        rules.append("## SIGNATURE PATTERNS (Designer's Unique Style)")
        rules.append("These patterns appear consistently (60-95%) and define the designer's aesthetic.")
        
        # Extract gradients first - they're critical for aesthetic
        gradient_signatures = [s for s in signatures if s.get("pattern_type") == "gradient"]
        if gradient_signatures:
            rules.append("\n### GRADIENTS - USE THESE EXACT CSS VALUES:")
            for sig in gradient_signatures[:5]:
                impl = sig.get("implementation", {})
                if "css" in impl:
                    freq = sig.get("frequency", 0)
                    rules.append(f"  {impl['css']}  // Appears {freq*100:.0f}%")
            rules.append("IMPORTANT: Use these gradients on hero sections, cards, backgrounds")
            rules.append("")
        
        # Then show other patterns
        non_gradient_sigs = [s for s in signatures if s.get("pattern_type") != "gradient"]
        for sig in non_gradient_sigs[:8]:
            pattern_type = sig.get("pattern_type")
            subtype = sig.get("pattern_subtype")
            impact = sig.get("visual_impact")
            frequency = sig.get("frequency", 0)
            
            # Build pattern header
            header = f"\n{pattern_type.upper()}"
            if subtype:
                header += f" - {subtype}"
            header += f" (appears {frequency*100:.0f}%, {impact} impact):"
            rules.append(header)
            
            # Implementation details - format nicely
            impl = sig.get("implementation", {})
            if impl:
                # Handle CSS specially (it's often long)
                if "css" in impl:
                    rules.append(f"  CSS: {impl['css']}")
                
                # Handle colors specially (it's a list)
                if "colors" in impl and isinstance(impl["colors"], list):
                    rules.append(f"  Colors: {', '.join(impl['colors'])}")
                
                # Handle other fields
                for key, value in impl.items():
                    if key not in ["css", "colors", "type"]:  # Skip already shown
                        rules.append(f"  {key.replace('_', ' ').title()}: {value}")
            
            # Contexts
            contexts = sig.get("contexts", [])
            if contexts:
                rules.append(f"  Apply in: {', '.join(contexts)}")
            
            rules.append(f"  NOTE: {sig.get('note', 'Signature pattern')}")
        
        if not signatures:
            rules.append("(No strong signatures detected - fewer than 3 resources)")
        
        return "\n".join(rules)
    
    def _extract_quirk_rules(self, dtm: Dict) -> str:
        """Extract Tier 4: Quirks (unconventional patterns that define personality)"""
        
        quirk_signatures = dtm.get("quirk_signatures", {})
        
        if not quirk_signatures:
            return "## QUIRKS\n(No quirk data available - using DTM v2 or earlier)"
        
        rules = []
        rules.append("## QUIRKS (Unconventional Patterns & Personality)")
        rules.append("These patterns break conventions and define the designer's unique voice.")
        rules.append("")
        
        # Obsessions
        if "obsessions" in quirk_signatures:
            obs = quirk_signatures["obsessions"]
            sig_obs = obs.get("signature_obsessions", [])
            
            if sig_obs:
                rules.append("### SIGNATURE OBSESSIONS:")
                for item in sig_obs:
                    pattern = item.get("pattern", "")
                    freq = item.get("frequency", 0)
                    rules.append(f"  • {pattern.replace('_', ' ').title()} (appears {freq*100:.0f}%)")
                rules.append("")
        
        # Personality
        if "personality" in quirk_signatures:
            pers = quirk_signatures["personality"]
            dominant = pers.get("dominant_traits", [])
            
            if dominant:
                rules.append("### PERSONALITY:")
                rules.append(f"  Dominant traits: {', '.join(dominant)}")
        
        # Compositional (glassmorphism etc)
        if "compositional" in quirk_signatures:
            comp = quirk_signatures["compositional"]
            if "glassmorphism_signature" in comp:
                rules.append("### GLASSMORPHISM:")
                rules.append(f"  {comp['glassmorphism_signature'].get('structure', '')}")
        
        return "\n".join(rules)
    
    def _build_generation_prompt(
        self,
        task_description: str,
        device_info: Dict,
        universal_rules: str,
        system_rules: str,
        signature_rules: str,
        quirk_rules: str,  # NEW
        flow_context: Optional[Dict[str, Any]] = None
    ) -> str:
        """Build complete generation prompt"""
        
        platform = device_info.get("platform", "web")
        width = device_info.get("screen", {}).get("width", 1440)
        height = device_info.get("screen", {}).get("height", 900)
        
        # Build flow context section if provided
        flow_context_section = ""
        if flow_context:
            import json
            
            # Get transitions safely
            outgoing_transitions = flow_context.get('outgoing_transitions', [])
            
            # Build navigation instruction
            nav_instruction = ""
            if outgoing_transitions:
                nav_instruction = f"""
IMPORTANT - Navigation Implementation:
- This screen is part of a multi-screen flow
- You MUST implement ALL {len(outgoing_transitions)} outgoing_transitions listed above
- For each transition, create a UI element (button/link) that calls: onTransition(transition_id)
- Use the 'label' field for button/link text
- Style according to 'flow_type': forward (primary), back (secondary), error (red), success (green)
- Example: <button onClick={{() => onTransition("trans_1")}}>Sign Up</button>
"""
            else:
                nav_instruction = """
NOTE: This is the final screen in the flow (no outgoing transitions).
- No navigation buttons needed
- Focus on completion/success state
"""
            
            flow_context_section = f"""
FLOW CONTEXT (Multi-Screen Flow):
{json.dumps(flow_context, indent=2)}
{nav_instruction}
"""
        
        prompt = f"""Generate a single-screen React component for the following task:

TASK: {task_description}

DEVICE: {platform} ({width}x{height}px)
{flow_context_section}
{universal_rules}

{system_rules}

{signature_rules}

{quirk_rules}

CRITICAL INSTRUCTIONS:
1. USE THE EXACT GRADIENT CSS VALUES shown in Signature Patterns - do not invent your own gradients
2. Apply ALL signature patterns (blur, blend modes, shadows) - these define the designer's unique style
3. EMBODY THE QUIRKS - these are what make this designer's work uniquely recognizable (personality, obsessions, compositional patterns)
4. Use exact spacing quantum and type scale from Designer Systems
5. Pull colors from Designer's palette in order shown (first colors are most characteristic)
6. Reference the visual examples provided - match their aesthetic feel
7. Ensure universal principles are met (accessibility, usability)
{"8. IMPLEMENT ALL OUTGOING TRANSITIONS - see Flow Context above" if flow_context else ""}

OUTPUT FORMAT:
Return ONLY the React component code:
```jsx
export default function App({{ onTransition }}) {{
  return (
    <div style={{ width: '{width}px', height: '{height}px', ... }}>
      {{/* Your implementation */}}
    </div>
  );
}}
```

No explanations, no markdown except the code block. Just the component.
"""
        
        return prompt
    
    async def _generate_ui_exact_recreation(
        self,
        task_description: str,
        device_info: Dict[str, Any],
        flow_context: Optional[Dict[str, Any]] = None,
        screen_description: Optional[str] = None,
        reference_files: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Generate UI using exact recreation mode (pixel-perfect copying, no DTM)
        
        Args:
            task_description: What to build
            device_info: Platform and screen dimensions
            flow_context: Optional flow context for multi-screen navigation
            screen_description: Optional screen description from user
            reference_files: Reference files (figma_data, images)
            
        Returns:
            Generated React code
        """
        
        print(f"\n{'='*60}")
        print(f"GENERATING UI - Exact Recreation Mode (No DTM)")
        print(f"{'='*60}")
        
        platform = device_info.get("platform", "web")
        width = device_info.get("screen", {}).get("width", 1440)
        height = device_info.get("screen", {}).get("height", 900)
        
        # Build prompt text
        prompt_text = f"""Task: {task_description}

Device: {platform} ({width}x{height}px)
"""
        
        if screen_description:
            prompt_text += f"\nScreen Description: {screen_description}\n"
        
        if flow_context:
            import json
            prompt_text += f"\nFlow Context:\n{json.dumps(flow_context, indent=2)}\n"
        
        # Build message content
        message_content = [
            {"type": "text", "text": prompt_text}
        ]
        
        # Add reference files if available
        if reference_files:
            # Add figma data if available
            if reference_files.get('figma_data'):
                from app.unified_dtr_builder import prepare_figma_for_llm
                compressed_figma = prepare_figma_for_llm(reference_files['figma_data'], max_depth=6)
                message_content.append({
                    "type": "text",
                    "text": f"\nReference Figma Data:\n{compressed_figma}"
                })
            
            # Add images if available
            if reference_files.get('images'):
                for img in reference_files['images']:
                    message_content.append({
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": img.get('media_type', 'image/png'),
                            "data": img['data']
                        }
                    })
        
        # Call LLM with exact recreation prompt
        response = await self.llm.call_claude(
            prompt_name=get_prompt_name("generate_ui_exact_recreation"),
            user_message=message_content,
            max_tokens=8000,
            temperature=0.3  # Lower temperature for more literal copying
        )
        
        ui_code = response.get("text", "")
        
        print(f"✓ UI generated successfully (exact recreation, {len(ui_code)} characters)")
        
        return ui_code


# Export
__all__ = ["GenerationOrchestrator"]