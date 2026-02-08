"""
Pass 6: Personality and Philosophy Synthesis

Synthesizes outputs from Passes 1-5 + original image into a complete,
self-contained DTR that captures the designer's taste.

This is the final pass for a single resource. After completion, the system
has a complete understanding of the design and can generate UI in the designer's style.
"""
import json
import base64
from typing import Optional, Dict, Any
from datetime import datetime

from app.dtr.schemas import (
    Pass6CompleteDTR,
    ExactTokens,
    CrossCuttingPatterns,
    PersonalitySynthesis,
    DecisionHeuristics,
    SignatureObsession,
    RuleBreaking,
    GenerationGuidance,
    WhenToPrioritize,
    AmbiguityResolution,
    ConfidenceByDomain,
    Pass1StructureDTR,
    Pass2SurfaceDTR,
    Pass3TypographyDTR,
    Pass4ImageUsageDTR,
    Pass5ComponentsDTR,
)
from app.llm import LLMService, Message, MessageRole, TextContent, ImageContent


class Pass6Personality:
    """
    Pass 6: Personality and Philosophy Synthesis
    
    Receives:
    - Original image (visual ground truth)
    - Pass 1-5 outputs (measured precision)
    
    Produces:
    - Complete, self-contained DTR
    - Includes exact tokens + personality synthesis + generation guidance
    """
    
    def __init__(self):
        self.llm_service = LLMService()
    
    async def execute(
        self,
        resource_id: str,
        taste_id: str,
        image_bytes: Optional[bytes] = None,
        image_format: str = "png",
        pass_1_result: Optional[Dict[str, Any]] = None,
        pass_2_result: Optional[Dict[str, Any]] = None,
        pass_3_result: Optional[Dict[str, Any]] = None,
        pass_4_result: Optional[Dict[str, Any]] = None,
        pass_5_result: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Execute Pass 6: Synthesize complete DTR
        
        Args:
            resource_id: Resource identifier
            taste_id: Taste identifier
            image_bytes: Original design image
            image_format: Image format (png, jpeg, webp)
            pass_1_result: Pass 1 output (structure)
            pass_2_result: Pass 2 output (surface)
            pass_3_result: Pass 3 output (typography)
            pass_4_result: Pass 4 output (images)
            pass_5_result: Pass 5 output (components)
        
        Returns:
            Complete DTR as dict
        """
        print(f"🎨 Pass 6: Starting personality synthesis for resource {resource_id}")
        
        # Validate we have required inputs
        if not any([pass_1_result, pass_2_result, pass_3_result, pass_4_result, pass_5_result]):
            raise ValueError("Pass 6 requires at least one previous pass output")
        
        # Step 1: Consolidate exact tokens from Pass 1-5
        exact_tokens = self._consolidate_exact_tokens(
            pass_1_result,
            pass_2_result,
            pass_3_result,
            pass_4_result,
            pass_5_result
        )
        
        # Step 2: Extract cross-cutting patterns from Pass 1-5 narratives
        cross_cutting_patterns = self._extract_cross_cutting_patterns(
            pass_1_result,
            pass_2_result,
            pass_3_result,
            pass_4_result,
            pass_5_result
        )
        
        # Step 3: Use Claude Opus to synthesize personality
        personality = await self._synthesize_personality(
            image_bytes=image_bytes,
            image_format=image_format,
            pass_1_result=pass_1_result,
            pass_2_result=pass_2_result,
            pass_3_result=pass_3_result,
            pass_4_result=pass_4_result,
            pass_5_result=pass_5_result
        )
        
        # Step 4: Generate generation guidance
        generation_guidance = self._generate_guidance(
            exact_tokens=exact_tokens,
            personality=personality,
            pass_1=pass_1_result,
            pass_2=pass_2_result,
            pass_3=pass_3_result
        )
        
        # Step 5: Assemble complete DTR
        complete_dtr = Pass6CompleteDTR(
            resource_id=resource_id,
            taste_id=taste_id,
            authority="synthesis",
            confidence=self._calculate_overall_confidence(
                pass_1_result,
                pass_2_result,
                pass_3_result,
                pass_4_result,
                pass_5_result
            ),
            created_at=datetime.utcnow().isoformat(),
            exact_tokens=exact_tokens,
            cross_cutting_patterns=cross_cutting_patterns,
            personality=personality,
            generation_guidance=generation_guidance
        )
        
        print(f"✅ Pass 6: Synthesis complete!")
        print(f"   Overall confidence: {complete_dtr.confidence:.2f}")
        print(f"   Obsessions detected: {len(personality.signature_obsessions)}")
        print(f"   Rule-breaking patterns: {len(personality.deliberate_rule_breaking)}")
        print(f"   Notable absences: {len(personality.notable_absences)}")
        
        return complete_dtr.model_dump()
    
    def _consolidate_exact_tokens(
        self,
        pass_1: Optional[Dict],
        pass_2: Optional[Dict],
        pass_3: Optional[Dict],
        pass_4: Optional[Dict],
        pass_5: Optional[Dict]
    ) -> ExactTokens:
        """Consolidate exact tokens from all passes"""
        
        tokens = {}
        
        # From Pass 2: Colors and materials
        if pass_2:
            tokens['colors'] = pass_2.get('colors')
            tokens['materials'] = pass_2.get('materials')
        
        # From Pass 3: Typography
        if pass_3:
            tokens['typography'] = {
                'families': pass_3.get('families', []),
                'sizes_used': pass_3.get('sizes_used', []),
                'scale_metrics': pass_3.get('scale_metrics', {}),
                'weights': pass_3.get('weight_frequencies', {}),
                'exact_line_heights': pass_3.get('exact_line_heights', {}),
                'exact_letter_spacing': pass_3.get('exact_letter_spacing', {})
            }
        
        # From Pass 1: Spacing
        if pass_1:
            tokens['spacing'] = pass_1.get('spacing')
        
        # From Pass 5: Components
        if pass_5:
            tokens['components'] = pass_5.get('inventory', [])
        
        # From Pass 4: Image usage
        if pass_4:
            tokens['image_usage'] = {
                'integration_patterns': pass_4.get('integration_patterns', []),
                'treatment_vocabulary': pass_4.get('treatment_vocabulary', [])
            }
        
        return ExactTokens(**tokens)
    
    def _extract_cross_cutting_patterns(
        self,
        pass_1: Optional[Dict],
        pass_2: Optional[Dict],
        pass_3: Optional[Dict],
        pass_4: Optional[Dict],
        pass_5: Optional[Dict]
    ) -> CrossCuttingPatterns:
        """Extract narrative patterns from Pass 1-5"""
        
        patterns = {}
        
        # From Pass 1
        if pass_1:
            patterns['spatial_philosophy'] = pass_1.get(
                'spatial_philosophy',
                "Spatial reasoning patterns from structural analysis."
            )
        else:
            patterns['spatial_philosophy'] = "Spatial philosophy not available."
        
        # From Pass 2
        if pass_2 and pass_2.get('colors'):
            patterns['color_relationships'] = pass_2['colors'].get(
                'relationships',
                "Color relationship analysis from surface treatment."
            )
        else:
            patterns['color_relationships'] = "Color relationships not available."
        
        # From Pass 3
        if pass_3:
            patterns['typography_philosophy'] = pass_3.get(
                'system_narrative',
                "Typography system philosophy from type analysis."
            )
        else:
            patterns['typography_philosophy'] = "Typography philosophy not available."
        
        # From Pass 5
        if pass_5:
            patterns['component_system_philosophy'] = pass_5.get(
                'component_system_philosophy',
                "Component system philosophy from component analysis."
            )
        else:
            patterns['component_system_philosophy'] = "Component philosophy not available."
        
        # From Pass 4
        if pass_4:
            patterns['image_integration_approach'] = pass_4.get(
                'narrative',
                "Image integration approach from image usage analysis."
            )
        else:
            patterns['image_integration_approach'] = "Image integration not available."
        
        return CrossCuttingPatterns(**patterns)
    
    async def _synthesize_personality(
        self,
        image_bytes: Optional[bytes],
        image_format: str,
        pass_1_result: Optional[Dict],
        pass_2_result: Optional[Dict],
        pass_3_result: Optional[Dict],
        pass_4_result: Optional[Dict],
        pass_5_result: Optional[Dict]
    ) -> PersonalitySynthesis:
        """Use Claude Opus to synthesize personality from all inputs"""
        
        # Prepare data summary for LLM
        data_summary = self._prepare_data_summary(
            pass_1_result,
            pass_2_result,
            pass_3_result,
            pass_4_result,
            pass_5_result
        )
        
        # Build comprehensive prompt
        system_prompt = """You are a design critic analyzing a designer's work to understand their unique taste and design philosophy.

You will receive:
1. The original design image (visual ground truth)
2. Detailed extraction data from 5 analysis passes

Your task is to synthesize a deep understanding of this designer's taste by identifying:
- Design lineage (aesthetic traditions and influences)
- Emotional register (intended feeling and mood)
- Decision heuristics (how they make trade-off decisions)
- Signature obsessions (patterns with unusual consistency)
- Deliberate rule-breaking (intentional convention violations)
- Notable absences (what they never do)

CRITICAL: Return ONLY valid JSON matching this exact structure (no markdown, no preamble):

{
  "design_lineage": "Multi-paragraph analysis of design traditions...",
  "emotional_register": "Multi-paragraph description of intended feeling...",
  "decision_heuristics": {
    "complexity_approach": "How designer handles complexity (organize vs simplify)",
    "drama_vs_usability": "Balance between drama and usability",
    "density_preference": "Spacing density preferences",
    "color_philosophy": "Approach to color usage",
    "spacing_philosophy": "Spatial reasoning patterns",
    "typography_approach": "Typographic decision patterns"
  },
  "signature_obsessions": [
    {
      "pattern": "Specific pattern (e.g., 'blur(96px) on every card')",
      "frequency": "How often it appears",
      "functional_or_aesthetic": "Is this functional or aesthetic?",
      "application_rule": "When and how to apply"
    }
  ],
  "deliberate_rule_breaking": [
    {
      "convention_violated": "What convention is broken",
      "what_designer_does": "What they do instead",
      "inferred_intent": "Why they break this rule",
      "application_contexts": "Where to apply this"
    }
  ],
  "notable_absences": [
    "Pattern 1 that never appears",
    "Pattern 2 that never appears"
  ]
}"""
        
        user_prompt = f"""DESIGN EXTRACTION DATA:

{data_summary}

ANALYSIS INSTRUCTIONS:

Phase 1: Visual Impression
Examine the design image holistically:
- What is your immediate visual impression?
- What design traditions or lineages do you detect?
- What emotion does it evoke?

Phase 2: Data Validation
Review the extracted data:
- Does it match what you see in the image?
- What might be missing or incomplete?

Phase 3: Cross-Cutting Synthesis
Identify patterns that emerge when viewing all dimensions together:
- How do structure, surface, and typography work together?
- What makes this design distinctive?
- What obsessive patterns appear across multiple domains?

Phase 4: Personality Analysis
Synthesize your understanding into the JSON structure above.

Be specific and detailed. Use multi-paragraph narratives for lineage and emotional_register.
For obsessions, identify actual CSS/design patterns that appear with unusual consistency.
For rule-breaking, identify specific conventions being violated and infer the designer's intent.
For absences, note what the designer conspicuously avoids (e.g., "No pill-shaped buttons", "No centered body text").

CRITICAL: Respond with ONLY the JSON object. No markdown backticks, no explanation, just pure JSON."""
        
        # Build message content
        content = []
        
        # Add image if available
        if image_bytes:
            content.append(ImageContent(
                data=base64.b64encode(image_bytes).decode('utf-8'),
                media_type=f"image/{image_format}",
                detail="high"
            ))
        
        # Add text prompt
        content.append(TextContent(text=user_prompt))
        
        # Call Claude Opus
        print("🧠 Calling Claude Opus 4.5 for personality synthesis...")
        response = await self.llm_service.generate(
            model="claude-opus-4.5",  # Use Opus for deep reasoning
            messages=[
                Message(role=MessageRole.SYSTEM, content=system_prompt),
                Message(role=MessageRole.USER, content=content)
            ],
            max_tokens=8000,  # Longer for comprehensive synthesis
            temperature=0.3   # Lower temperature for consistent analysis
        )
        
        # Parse JSON response
        response_text = response.text.strip()
        
        # Handle markdown code blocks if present
        if response_text.startswith('```'):
            # Extract JSON from markdown
            lines = response_text.split('\n')
            json_lines = []
            in_code_block = False
            for line in lines:
                if line.strip().startswith('```'):
                    in_code_block = not in_code_block
                    continue
                if in_code_block or (not line.strip().startswith('```')):
                    json_lines.append(line)
            response_text = '\n'.join(json_lines).strip()
        
        # Try to find JSON object in response
        if '{' in response_text:
            start_idx = response_text.index('{')
            end_idx = response_text.rindex('}') + 1
            response_text = response_text[start_idx:end_idx]
        
        try:
            personality_data = json.loads(response_text)
            
            # Validate and construct PersonalitySynthesis
            personality = PersonalitySynthesis(
                design_lineage=personality_data.get('design_lineage', 'Design lineage analysis not available.'),
                emotional_register=personality_data.get('emotional_register', 'Emotional register analysis not available.'),
                decision_heuristics=DecisionHeuristics(**personality_data.get('decision_heuristics', {
                    'complexity_approach': 'Not analyzed',
                    'drama_vs_usability': 'Not analyzed',
                    'density_preference': 'Not analyzed',
                    'color_philosophy': 'Not analyzed',
                    'spacing_philosophy': 'Not analyzed',
                    'typography_approach': 'Not analyzed'
                })),
                signature_obsessions=[
                    SignatureObsession(**obs)
                    for obs in personality_data.get('signature_obsessions', [])
                ],
                deliberate_rule_breaking=[
                    RuleBreaking(**rb)
                    for rb in personality_data.get('deliberate_rule_breaking', [])
                ],
                notable_absences=personality_data.get('notable_absences', [])
            )
            
            print(f"✅ Personality synthesis successful")
            return personality
            
        except json.JSONDecodeError as e:
            print(f"⚠️  Failed to parse personality JSON: {e}")
            print(f"Response text: {response_text[:500]}...")
            
            # Return minimal personality
            return PersonalitySynthesis(
                design_lineage="Design lineage analysis could not be completed.",
                emotional_register="Emotional register analysis could not be completed.",
                decision_heuristics=DecisionHeuristics(
                    complexity_approach="Not analyzed",
                    drama_vs_usability="Not analyzed",
                    density_preference="Not analyzed",
                    color_philosophy="Not analyzed",
                    spacing_philosophy="Not analyzed",
                    typography_approach="Not analyzed"
                ),
                signature_obsessions=[],
                deliberate_rule_breaking=[],
                notable_absences=[]
            )
    
    def _prepare_data_summary(
        self,
        pass_1: Optional[Dict],
        pass_2: Optional[Dict],
        pass_3: Optional[Dict],
        pass_4: Optional[Dict],
        pass_5: Optional[Dict]
    ) -> str:
        """Prepare concise summary of Pass 1-5 data for LLM"""
        
        summary_parts = []
        
        # Pass 1: Structure
        if pass_1:
            summary_parts.append(f"""
PASS 1 - STRUCTURE:
Layout: {pass_1.get('layout', {}).get('type', 'unknown')}
Nesting depth: {pass_1.get('layout', {}).get('nesting_depth', 'unknown')}
Spacing quantum: {pass_1.get('spacing', {}).get('quantum', 'unknown')}
Spacing scale: {pass_1.get('spacing', {}).get('scale', [])}
Density: {pass_1.get('density', {}).get('global', 'unknown')}
Spatial philosophy: {pass_1.get('spatial_philosophy', 'Not available')[:300]}...
""")
        
        # Pass 2: Surface
        if pass_2:
            colors = pass_2.get('colors', {})
            palette = colors.get('exact_palette', [])
            palette_summary = ', '.join([c.get('hex', '') for c in palette[:5]])
            
            summary_parts.append(f"""
PASS 2 - SURFACE TREATMENT:
Color palette: {palette_summary}
Primary language: {pass_2.get('materials', {}).get('primary_language', 'unknown')}
Atmosphere: {pass_2.get('materials', {}).get('atmosphere', 'Not available')[:300]}...
Effects count: {len(pass_2.get('effects_vocabulary', []))}
""")
        
        # Pass 3: Typography
        if pass_3:
            families = pass_3.get('families', [])
            family_names = ', '.join([f.get('name', '') for f in families])
            
            summary_parts.append(f"""
PASS 3 - TYPOGRAPHY:
Font families: {family_names}
Sizes used: {pass_3.get('sizes_used', [])}
Type scale ratio: {pass_3.get('scale_metrics', {}).get('ratio_mean', 'unknown')}
Weight distribution: {pass_3.get('weight_frequencies', {})}
System narrative: {pass_3.get('system_narrative', 'Not available')[:300]}...
""")
        
        # Pass 4: Images
        if pass_4:
            summary_parts.append(f"""
PASS 4 - IMAGE USAGE:
Integration patterns: {len(pass_4.get('integration_patterns', []))}
Treatment vocabulary: {len(pass_4.get('treatment_vocabulary', []))}
""")
        
        # Pass 5: Components
        if pass_5:
            summary_parts.append(f"""
PASS 5 - COMPONENTS:
Total components: {pass_5.get('total_components', 0)}
Total variants: {pass_5.get('total_variants', 0)}
Component types: {', '.join([c.get('type', '') for c in pass_5.get('inventory', [])[:5]])}
""")
        
        return '\n'.join(summary_parts)
    
    def _generate_guidance(
        self,
        exact_tokens: ExactTokens,
        personality: PersonalitySynthesis,
        pass_1: Optional[Dict],
        pass_2: Optional[Dict],
        pass_3: Optional[Dict]
    ) -> GenerationGuidance:
        """Generate guidance for applying this taste in generation"""
        
        # Calculate confidence by domain
        confidence_by_domain = ConfidenceByDomain(
            colors=pass_2.get('confidence', 0.5) if pass_2 else 0.5,
            typography=pass_3.get('confidence', 0.5) if pass_3 else 0.5,
            spacing=pass_1.get('confidence', 0.5) if pass_1 else 0.5,
            components=0.7,  # Components have code examples, higher confidence
            overall=self._calculate_overall_confidence(pass_1, pass_2, pass_3, None, None)
        )
        
        # Generate when-to-prioritize guidance
        when_to_prioritize = WhenToPrioritize(
            structure_over_style=(
                "Prioritize structural clarity when dealing with complex information displays. "
                "The designer's spatial philosophy emphasizes clear hierarchy and organization."
            ),
            consistency_over_novelty=(
                "Maintain consistency with established patterns. "
                f"The designer has {len(personality.signature_obsessions)} signature obsessions "
                "that should be preserved across all generated UI."
            ),
            usability_over_aesthetics=(
                f"Balance drama with usability: {personality.decision_heuristics.drama_vs_usability}"
            )
        )
        
        # Generate ambiguity resolution guidance
        ambiguity_resolution = AmbiguityResolution(
            missing_element_approach=(
                f"When encountering elements not in reference designs, infer from design lineage: "
                f"{personality.design_lineage[:200]}... Apply established patterns and heuristics."
            ),
            conflicting_patterns=(
                "Resolve conflicts by prioritizing: "
                "1) Signature obsessions (never violate), "
                "2) Hard constraints (exact tokens), "
                "3) Strong preferences (established patterns)."
            ),
            edge_cases=(
                f"For unusual situations, reason from decision heuristics: "
                f"Complexity approach: {personality.decision_heuristics.complexity_approach}. "
                f"Apply the designer's documented approach to similar trade-offs."
            )
        )
        
        return GenerationGuidance(
            when_to_prioritize=when_to_prioritize,
            ambiguity_resolution=ambiguity_resolution,
            confidence_by_domain=confidence_by_domain
        )
    
    def _calculate_overall_confidence(
        self,
        pass_1: Optional[Dict],
        pass_2: Optional[Dict],
        pass_3: Optional[Dict],
        pass_4: Optional[Dict],
        pass_5: Optional[Dict]
    ) -> float:
        """Calculate overall confidence from individual pass confidences"""
        
        confidences = []
        
        if pass_1 and 'confidence' in pass_1:
            confidences.append(pass_1['confidence'])
        if pass_2 and 'confidence' in pass_2:
            confidences.append(pass_2['confidence'])
        if pass_3 and 'confidence' in pass_3:
            confidences.append(pass_3['confidence'])
        if pass_4 and 'confidence' in pass_4:
            confidences.append(pass_4['confidence'])
        if pass_5:
            # Components have high confidence due to code examples
            confidences.append(0.85)
        
        if not confidences:
            return 0.5
        
        # Use weighted average (more recent passes weighted slightly higher)
        weights = [1.0, 1.1, 1.1, 1.0, 1.2][:len(confidences)]
        weighted_sum = sum(c * w for c, w in zip(confidences, weights))
        total_weight = sum(weights)
        
        return min(weighted_sum / total_weight, 1.0)


# Public API
async def run_pass_6(
    resource_id: str,
    taste_id: str,
    image_bytes: Optional[bytes] = None,
    image_format: str = "png",
    pass_1_result: Optional[Dict[str, Any]] = None,
    pass_2_result: Optional[Dict[str, Any]] = None,
    pass_3_result: Optional[Dict[str, Any]] = None,
    pass_4_result: Optional[Dict[str, Any]] = None,
    pass_5_result: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Execute Pass 6: Personality and Philosophy Synthesis
    
    Returns complete, self-contained DTR.
    """
    pass_6 = Pass6Personality()
    return await pass_6.execute(
        resource_id=resource_id,
        taste_id=taste_id,
        image_bytes=image_bytes,
        image_format=image_format,
        pass_1_result=pass_1_result,
        pass_2_result=pass_2_result,
        pass_3_result=pass_3_result,
        pass_4_result=pass_4_result,
        pass_5_result=pass_5_result
    )