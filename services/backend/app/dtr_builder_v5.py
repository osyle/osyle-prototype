"""
DTR Builder v5 - Visual-First Designer Taste Representation
Extracts taste from a single resource with emphasis on visual patterns and examples

Key Changes from v4:
- Visual patterns stored with actual examples (not just descriptions)
- Contextual metadata for every pattern (when/where it's used)
- Signature detection (patterns that define uniqueness)
- Three-layer structure: Quantitative + Visual + Semantic
"""
from typing import Dict, Any, List, Optional
from datetime import datetime
import json


class DTRBuilderV5:
    """Build DTR v5 from resource data"""
    
    def __init__(self, llm_client):
        """
        Args:
            llm_client: LLM service for semantic analysis
        """
        self.llm = llm_client
    
    async def build_dtr(
        self,
        figma_json: Dict[str, Any],
        code_analysis: Dict[str, Any],
        resource_id: str,
        taste_id: str,
        has_image: bool = False,
        image_base64: Optional[str] = None,
        context_override: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Build complete DTR v5 from resource
        
        Args:
            figma_json: Figma design structure
            code_analysis: Quantitative analysis results
            resource_id: Resource identifier
            taste_id: Taste identifier
            has_image: Whether image is available
            image_base64: Base64-encoded image
            context_override: Manual context specification
            
        Returns:
            Complete DTR v5 dictionary
        """
        
        print(f"\n{'='*60}")
        print(f"BUILDING DTR v5 - Visual-First Architecture")
        print(f"{'='*60}")
        
        # Step 1: Extract quantitative patterns (from code analysis)
        print("\n[1/5] Extracting quantitative patterns...")
        quantitative = self._extract_quantitative(code_analysis)
        
        # Step 2: Extract visual patterns (from Figma + code)
        print("\n[2/5] Extracting visual patterns...")
        visual_patterns = self._extract_visual_patterns(figma_json, code_analysis)
        
        # Step 3: Detect signature patterns
        print("\n[3/5] Detecting signature patterns...")
        signatures = self._detect_signatures(visual_patterns, quantitative)
        
        # Step 4: Build semantic understanding (LLM)
        print("\n[4/5] Building semantic understanding with LLM...")
        semantic = await self._build_semantic(
            figma_json=figma_json,
            quantitative=quantitative,
            visual_patterns=visual_patterns,
            image_base64=image_base64
        )
        
        # Step 5: Infer context
        print("\n[5/5] Inferring context...")
        context = context_override or self._infer_context(
            figma_json, semantic, quantitative
        )
        
        # Build complete DTR v5
        dtr = {
            "version": "5.0",
            
            "meta": {
                "resource_id": resource_id,
                "taste_id": taste_id,
                "created_at": datetime.utcnow().isoformat() + "Z",
                "has_image": has_image,
                
                # Context metadata (for filtering/grouping later)
                "context": context,
                
                # Confidence scores
                "confidence_scores": self._calculate_confidence(
                    code_analysis, visual_patterns, semantic
                )
            },
            
            # Layer 1: Quantitative (code-extracted, deterministic)
            "quantitative": quantitative,
            
            # Layer 2: Visual Patterns (extracted patterns + metadata)
            "visual_patterns": visual_patterns,
            
            # Layer 3: Signature Patterns (what makes this designer unique)
            "signature_patterns": signatures,
            
            # Layer 4: Semantic (LLM-derived principles)
            "semantic": semantic
        }
        
        print(f"\n✓ DTR v5 built successfully")
        print(f"  Confidence: {dtr['meta']['confidence_scores']['overall']:.2f}")
        print(f"  Visual patterns: {len(visual_patterns)}")
        print(f"  Signatures detected: {len(signatures)}")
        
        return dtr
    
    def _extract_quantitative(self, code_analysis: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract quantitative patterns from code analysis
        Clean, structured, ready for aggregation
        """
        
        return {
            "spacing": {
                "quantum": code_analysis.get("spacing_analysis", {}).get("spacing_quantum"),
                "all_values": code_analysis.get("spacing_analysis", {}).get("all_spacings", []),
                "distribution": code_analysis.get("spacing_analysis", {}).get("spacing_distribution", {}),
                "common_values": code_analysis.get("spacing_analysis", {}).get("most_common_spacings", [])[:10]
            },
            
            "colors": {
                "all_colors": code_analysis.get("color_analysis", {}).get("all_colors", []),
                "primary_palette": code_analysis.get("color_analysis", {}).get("primary_palette", [])[:20],  # Increased from 10 to 20 for gradient colors
                "temperature": code_analysis.get("color_analysis", {}).get("temperature_distribution", {}),
                "saturation": code_analysis.get("color_analysis", {}).get("saturation_distribution", {})
            },
            
            "typography": {
                "all_sizes": code_analysis.get("typography_analysis", {}).get("all_font_sizes", []),
                "scale_ratio": code_analysis.get("typography_analysis", {}).get("type_scale_ratio"),
                "weights": code_analysis.get("typography_analysis", {}).get("all_font_weights", []),
                "common_sizes": code_analysis.get("typography_analysis", {}).get("font_sizes", [])[:8]
            },
            
            "forms": {
                "corner_radii": code_analysis.get("form_analysis", {}).get("all_radii", []),
                "radius_quantum": code_analysis.get("form_analysis", {}).get("radius_quantum"),
                "common_radii": code_analysis.get("form_analysis", {}).get("most_common_radii", [])[:6]
            },
            
            "effects": {
                "gradients": code_analysis.get("gradient_analysis", {}),
                "shadows": code_analysis.get("effects_analysis", {}).get("shadows", []),
                "blurs": code_analysis.get("effects_analysis", {}).get("blurs", [])
            }
        }
    
    def _extract_visual_patterns(
        self,
        figma_json: Dict[str, Any],
        code_analysis: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Extract visual patterns from Figma structure
        
        KEY: Each pattern includes:
        - Implementation details (exact CSS/values)
        - Context (where it's used)
        - Visual impact (high/medium/low)
        - Metadata for later retrieval
        """
        
        patterns = []
        
        # Extract gradient patterns with full CSS implementation
        gradient_analysis = code_analysis.get("gradient_analysis", {})
        if gradient_analysis.get("has_gradients"):
            gradients = gradient_analysis.get("gradients", [])
            
            # Group gradients by type for frequency counting
            gradient_by_type = {}
            for grad in gradients:
                grad_type = grad.get("type", "UNKNOWN")
                if grad_type not in gradient_by_type:
                    gradient_by_type[grad_type] = []
                gradient_by_type[grad_type].append(grad)
            
            # Create pattern for each gradient type with actual CSS
            for grad_type, grad_list in gradient_by_type.items():
                # Use the first gradient as representative
                representative = grad_list[0]
                
                patterns.append({
                    "type": "gradient",
                    "subtype": grad_type,
                    "visual_impact": "high",
                    "frequency_in_design": len(grad_list),
                    "implementation": {
                        "type": grad_type,
                        "css": representative.get("css", ""),
                        "colors": representative.get("colors", []),
                        "opacity": representative.get("opacity", 1.0)
                    },
                    "contexts": self._find_gradient_contexts(figma_json, grad_type)
                })
        
        # Extract glassmorphism / blur patterns
        effects_analysis = code_analysis.get("effects_analysis", {})
        if effects_analysis.get("has_glassmorphism"):
            glass_effects = effects_analysis.get("glassmorphism_effects", [])
            if glass_effects:
                # Take representative blur effect
                representative_blur = glass_effects[0]
                patterns.append({
                    "type": "blur",
                    "subtype": "backdrop",
                    "visual_impact": "high",
                    "frequency_in_design": len(glass_effects),
                    "implementation": {
                        "css": representative_blur.get("css", ""),
                        "radius": representative_blur.get("radius", 20)
                    },
                    "contexts": ["cards", "modals", "overlays"]
                })
        
        # Extract blend mode patterns
        blend_modes = effects_analysis.get("blend_modes", [])
        if blend_modes:
            # Count unique blend modes
            from collections import Counter
            mode_counts = Counter(blend_modes)
            
            for mode, count in mode_counts.most_common(3):  # Top 3 blend modes
                if mode and mode != "NORMAL":
                    patterns.append({
                        "type": "blend_mode",
                        "subtype": mode,
                        "visual_impact": "medium",
                        "frequency_in_design": count,
                        "implementation": {
                            "blend_mode": mode,
                            "css": f"mix-blend-mode: {mode.lower().replace('_', '-')}"
                        },
                        "contexts": ["decorative", "overlays"]
                    })
        
        # Extract shadow patterns
        shadow_effects = effects_analysis.get("shadow_effects", [])
        if shadow_effects:
            for shadow in shadow_effects[:3]:  # Top 3 shadows
                patterns.append({
                    "type": "shadow",
                    "visual_impact": "medium",
                    "implementation": shadow,
                    "contexts": ["cards", "buttons", "elevated_surfaces"]
                })
        
        # Extract component patterns from Figma structure
        component_patterns = self._extract_component_patterns(figma_json)
        patterns.extend(component_patterns)
        
        return patterns
    
    def _extract_component_patterns(self, figma_json: Dict[str, Any]) -> List[Dict]:
        """Extract reusable component patterns from Figma"""
        
        patterns = []
        
        # Look for components in Figma structure
        design_structure = figma_json.get("designStructure", {})
        
        # Cards
        if "RECTANGLE" in str(design_structure):  # Simple heuristic
            patterns.append({
                "type": "component",
                "subtype": "card",
                "visual_impact": "high",
                "implementation": {
                    "note": "Card pattern detected - would include layout, padding, effects"
                },
                "contexts": ["dashboard", "content_grid"]
            })
        
        # Buttons
        # (Would do more sophisticated detection in real implementation)
        
        return patterns
    
    def _find_gradient_contexts(self, figma_json: Dict, grad_type: str) -> List[str]:
        """Find where gradients are typically used"""
        # Heuristic: linear → backgrounds, radial → hero, angular → accents
        context_map = {
            "linear": ["backgrounds", "hero_sections", "cards"],
            "radial": ["hero_elements", "focal_points", "spotlights"],
            "angular": ["accents", "decorative", "buttons"]
        }
        return context_map.get(grad_type, ["general"])
    
    def _detect_signatures(
        self,
        visual_patterns: List[Dict],
        quantitative: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Detect signature patterns from single resource
        
        For single resource, signatures are high-impact patterns
        When we build DTM, we'll look for 60-80% frequency across resources
        """
        
        signatures = []
        
        # High-impact visual patterns are potential signatures
        for pattern in visual_patterns:
            if pattern.get("visual_impact") == "high":
                signatures.append({
                    "pattern_type": pattern["type"],
                    "pattern_subtype": pattern.get("subtype"),
                    "visual_impact": "high",
                    "implementation": pattern.get("implementation", {}),
                    "contexts": pattern.get("contexts", []),
                    "source": "single_resource_detection"
                })
        
        # Unique spacing approaches
        spacing_quantum = quantitative["spacing"]["quantum"]
        if spacing_quantum and spacing_quantum not in [4, 8, 16]:  # Non-standard
            signatures.append({
                "pattern_type": "spacing",
                "pattern_subtype": "custom_quantum",
                "value": spacing_quantum,
                "visual_impact": "medium",
                "contexts": ["layout"],
                "source": "quantitative_uniqueness"
            })
        
        return signatures
    
    async def _build_semantic(
        self,
        figma_json: Dict,
        quantitative: Dict,
        visual_patterns: List[Dict],
        image_base64: Optional[str]
    ) -> Dict[str, Any]:
        """
        Build semantic understanding using LLM
        
        This captures high-level principles, aesthetic signature, design philosophy
        """
        
        # Build prompt context
        context_parts = []
        
        # Quantitative summary
        context_parts.append("QUANTITATIVE ANALYSIS:")
        context_parts.append(f"Spacing quantum: {quantitative['spacing']['quantum']}px")
        
        # Include more colors now that we extract gradient colors
        all_colors = quantitative['colors']['primary_palette']
        if len(all_colors) > 10:
            context_parts.append(f"Primary colors: {all_colors[:10]} (+ {len(all_colors) - 10} more)")
        else:
            context_parts.append(f"Primary colors: {all_colors}")
        
        # Add color temperature/saturation info
        temp = quantitative['colors'].get('temperature', {})
        if temp:
            context_parts.append(f"Color temperature: warm={temp.get('warm', 0):.2f}, cool={temp.get('cool', 0):.2f}, neutral={temp.get('neutral', 0):.2f}")
        
        sat = quantitative['colors'].get('saturation', {})
        if sat:
            context_parts.append(f"Color saturation: high={sat.get('high', 0):.2f}, medium={sat.get('medium', 0):.2f}, low={sat.get('low', 0):.2f}")
        
        context_parts.append(f"Type scale ratio: {quantitative['typography']['scale_ratio']}")
        context_parts.append(f"Font weights: {quantitative['typography'].get('weights', [])}")
        context_parts.append(f"Common corner radii: {quantitative['forms'].get('common_radii', [])}")
        context_parts.append("")
        
        # Visual patterns summary with FULL implementation details
        context_parts.append("VISUAL PATTERNS DETECTED:")
        for pattern in visual_patterns[:15]:  # Increased from 10 to 15
            pattern_line = f"- {pattern['type']}"
            
            # Add subtype if available
            if pattern.get('subtype'):
                pattern_line += f": {pattern.get('subtype')}"
            
            # Add implementation details (CSS, colors, etc.)
            implementation = pattern.get('implementation', {})
            if implementation:
                # For gradients - include CSS and colors
                if pattern['type'] == 'gradient' and implementation.get('css'):
                    pattern_line += f"\n  CSS: {implementation['css']}"
                    if implementation.get('colors'):
                        pattern_line += f"\n  Colors: {implementation['colors']}"
                
                # For blur/glassmorphism - include CSS
                elif pattern['type'] == 'blur' and implementation.get('css'):
                    pattern_line += f"\n  {implementation['css']}"
                    pattern_line += f"\n  Radius: {implementation.get('radius')}px"
                
                # For blend modes - include CSS
                elif pattern['type'] == 'blend_mode':
                    pattern_line += f"\n  {implementation.get('css', '')}"
                    pattern_line += f"\n  Mode: {implementation.get('blend_mode')}"
                
                # For shadows - include details
                elif pattern['type'] == 'shadow':
                    if implementation.get('offset_y'):
                        pattern_line += f"\n  Offset: ({implementation.get('offset_x', 0)}px, {implementation.get('offset_y')}px)"
                        pattern_line += f"\n  Blur radius: {implementation.get('radius')}px"
                        if implementation.get('color'):
                            pattern_line += f"\n  Color: {implementation.get('color')}"
            
            # Add visual impact
            pattern_line += f"\n  Impact: {pattern.get('visual_impact')}"
            
            # Add frequency if available
            if pattern.get('frequency_in_design'):
                pattern_line += f", Frequency: {pattern.get('frequency_in_design')}"
            
            context_parts.append(pattern_line)
        context_parts.append("")
        
        # Build message
        message_content = []
        
        # Add text context
        message_content.append({
            "type": "text",
            "text": "\n".join(context_parts)
        })
        
        # Add image if available
        if image_base64:
            message_content.append({
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": "image/png",
                    "data": image_base64
                }
            })
        
        # Call LLM
        try:
            response = await self.llm.call_claude(
                prompt_name="build_dtr_v5_semantic",
                user_message=message_content,
                max_tokens=3000,
                parse_json=True
            )
            
            semantic = response.get("json", {})
            
        except Exception as e:
            print(f"Warning: LLM semantic analysis failed: {e}")
            semantic = {
                "aesthetic_signature": "modern_minimal",
                "design_philosophy": "form_follows_function",
                "note": "LLM analysis unavailable"
            }
        
        return semantic
    
    def _infer_context(
        self,
        figma_json: Dict,
        semantic: Dict,
        quantitative: Dict
    ) -> Dict[str, str]:
        """
        Infer design context from analysis
        Used for filtering/grouping resources
        """
        
        # Infer primary use case
        use_case = "general"
        
        # Simple heuristics (would be more sophisticated in real implementation)
        if semantic.get("data_oriented"):
            use_case = "dashboard"
        elif semantic.get("marketing_focused"):
            use_case = "marketing"
        elif semantic.get("content_heavy"):
            use_case = "content_site"
        
        # Infer platform
        platform = "web_desktop"
        canvas_info = figma_json.get("canvasInfo", {})
        width = canvas_info.get("width", 1440)
        if width <= 375:
            platform = "mobile"
        elif width <= 768:
            platform = "tablet"
        
        # Infer content density
        content_density = "medium"
        spacing_vals = quantitative["spacing"]["all_values"]
        if spacing_vals:
            avg_spacing = sum(spacing_vals) / len(spacing_vals)
            if avg_spacing < 12:
                content_density = "high"
            elif avg_spacing > 24:
                content_density = "low"
        
        return {
            "primary_use_case": use_case,
            "platform": platform,
            "content_density": content_density,
            "screen_width": width
        }
    
    def _calculate_confidence(
        self,
        code_analysis: Dict,
        visual_patterns: List[Dict],
        semantic: Dict
    ) -> Dict[str, float]:
        """Calculate confidence scores"""
        
        # Code confidence
        code_conf = code_analysis.get("overall_confidence", 0.7)
        
        # Visual patterns confidence (based on quantity and clarity)
        visual_conf = min(1.0, len(visual_patterns) / 10) * 0.9
        
        # Semantic confidence (based on LLM success)
        semantic_conf = 0.8 if semantic.get("aesthetic_signature") else 0.3
        
        # Overall
        overall = (code_conf * 0.4) + (visual_conf * 0.3) + (semantic_conf * 0.3)
        
        return {
            "overall": round(overall, 2),
            "quantitative": round(code_conf, 2),
            "visual": round(visual_conf, 2),
            "semantic": round(semantic_conf, 2)
        }


# Export
__all__ = ["DTRBuilderV5"]