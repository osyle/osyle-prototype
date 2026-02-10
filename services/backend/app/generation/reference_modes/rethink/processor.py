"""
Rethink Mode Processor v2 - With DTM Integration

Orchestrates the 4-step rethinking pipeline with designer taste:
1. Analyze Intent (pure strategic analysis)
2. Derive First Principles (informed by designer's UX philosophy from quirks)
3. Generate Strategic Explorations (informed by designer personality)
4. Synthesize Optimal Design (strategic + quirk alignment)
5. [Later] Flow Architecture (strategic framing)
6. [Later] UI Generation (full DTM application)

Key Innovation: Separates strategic thinking (quirk-informed) from visual execution (full DTM)
"""

from typing import Dict, Any, List, Optional
import json


class RethinkProcessor:
    """Orchestrates rethink pipeline with DTM integration"""
    
    def __init__(self, llm_client, progress_callback=None):
        """
        Args:
            llm_client: LLM service for all analysis steps
            progress_callback: Optional async function(stage, message) to report progress
        """
        self.llm = llm_client
        self.progress_callback = progress_callback
    
    async def process_rethink_complete(
        self,
        reference_files: Dict[str, Any],
        task_description: str,
        device_info: Dict[str, Any],
        domain: Optional[str] = None,
        dtm: Optional[Dict[str, Any]] = None  # ← DTM integration
    ) -> Dict[str, Any]:
        """
        Execute complete rethink pipeline
        
        Args:
            reference_files: Figma JSON and/or images
            task_description: What the user wants to build
            device_info: Platform and dimensions
            domain: Optional domain hint (e.g., "e-commerce", "healthcare")
            dtm: Optional Designer Taste Model (DTM v3)
            
        Returns:
            Dict containing all pipeline outputs + DTM
        """
        
        print(f"\n{'='*70}")
        print(f"RETHINK MODE PIPELINE - Strategic Re-architecture")
        print(f"{'='*70}")
        
        if dtm:
            total_resources = dtm.get('meta', {}).get('total_resources', 0)
            has_quirks = bool(dtm.get('quirk_signatures'))
            print(f"✓ Designer taste loaded: {total_resources} resources")
            print(f"  Quirk signatures: {'Yes' if has_quirks else 'No (pre-quirk DTM)'}")
        else:
            print(f"  No designer taste - generic strategic rethinking")
        
        # Step 1: Analyze Intent (PURE - no DTM influence)
        print(f"\n[1/4] ANALYZE INTENT - Understanding the real problem")
        print(f"{'='*70}")
        
        if self.progress_callback:
            await self.progress_callback("rethinking", "Analyzing design intent...")
        
        intent_analysis = await self._analyze_intent(
            reference_files=reference_files,
            task_description=task_description
        )
        
        # Infer domain if not provided
        if not domain:
            domain = intent_analysis.get('inferred_domain', 'general')
            print(f"  Inferred domain: {domain}")
        
        # Step 2: Derive First Principles (QUIRK-INFORMED)
        print(f"\n[2/4] DERIVE FIRST PRINCIPLES - From fundamentals")
        print(f"{'='*70}")
        
        if self.progress_callback:
            await self.progress_callback("rethinking", "Deriving core principles...")
        
        # Extract designer's UX philosophy from quirks (if available)
        designer_philosophy = self._extract_designer_philosophy(dtm) if dtm else None
        
        if designer_philosophy:
            print(f"  Applying designer's UX philosophy:")
            print(f"    Personality: {designer_philosophy.get('personality_summary', 'N/A')}")
            print(f"    Emotional approach: {designer_philosophy.get('emotional_approach', 'N/A')}")
        
        first_principles = await self._derive_first_principles(
            intent_analysis=intent_analysis,
            domain=domain,
            designer_philosophy=designer_philosophy  # ← Quirk influence
        )
        
        # Step 3: Generate Strategic Explorations (QUIRK-INFORMED)
        print(f"\n[3/4] GENERATE EXPLORATIONS - Multiple strategic directions")
        print(f"{'='*70}")
        
        if self.progress_callback:
            await self.progress_callback("rethinking", "Generating strategic explorations...")
        
        explorations = await self._generate_strategic_explorations(
            first_principles=first_principles,
            intent_analysis=intent_analysis,
            domain=domain,
            designer_philosophy=designer_philosophy  # ← Quirk influence
        )
        
        # Step 4: Synthesize Optimal Design (STRATEGIC + QUIRK ALIGNMENT)
        print(f"\n[4/4] SYNTHESIZE OPTIMAL DESIGN - Best strategic approach")
        print(f"{'='*70}")
        
        if self.progress_callback:
            await self.progress_callback("rethinking", "Synthesizing optimal design...")
        
        optimal_design = await self._synthesize_optimal_design(
            explorations=explorations,
            first_principles=first_principles,
            intent_analysis=intent_analysis,
            designer_philosophy=designer_philosophy  # ← Quirk alignment check
        )
        
        print(f"\n{'='*70}")
        print(f"✓ Rethink pipeline complete")
        print(f"{'='*70}")
        print(f"  Optimal approach: {optimal_design.get('optimal_design', {}).get('name', 'N/A')}")
        print(f"  Strategic innovations: {len(optimal_design.get('optimal_design', {}).get('strategic_innovations', []))}")
        
        return {
            'intent_analysis': intent_analysis,
            'first_principles': first_principles,
            'explorations': explorations,
            'optimal_design': optimal_design,
            'dtm': dtm,  # ← Pass DTM through for UI generation
            'designer_philosophy': designer_philosophy,  # ← For reference
            'has_rethinking': True
        }
    
    def _extract_designer_philosophy(self, dtm: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Extract designer's UX philosophy from quirk signatures
        
        This is STRATEGIC information about how designer thinks, not visual style.
        Used to inform (not override) strategic decisions.
        
        Args:
            dtm: Complete DTM v3
            
        Returns:
            Dict of designer's UX philosophy or None
        """
        
        quirks = dtm.get('quirk_signatures', {})
        
        if not quirks:
            return None
        
        # Extract personality traits
        personality = quirks.get('personality', {})
        
        # Determine dominant personality traits
        personality_scores = {
            k: v for k, v in personality.items()
            if isinstance(v, (int, float)) and k not in ['note', 'dominant_traits', 'consistency']
        }
        
        dominant_traits = [
            trait for trait, score in personality_scores.items()
            if score > 0.6
        ]
        
        # Extract emotional architecture preferences
        emotional = quirks.get('emotional_architecture', {})
        
        # Determine emotional approach
        emotional_strategies = []
        
        if emotional.get('trust_building', {}).get('strength', 0) > 0.6:
            emotional_strategies.append('trust-building')
        
        if emotional.get('delight_moments', {}).get('strength', 0) > 0.7:
            emotional_strategies.append('delight-focused')
        
        if emotional.get('urgency_creation', {}).get('uses', False):
            emotional_strategies.append('urgency-driven')
        
        # Extract obsessions (patterns designer always uses)
        obsessions_data = quirks.get('obsessions', {})
        always_uses = obsessions_data.get('signature_obsessions', [])
        
        obsession_patterns = [
            item.get('pattern') for item in always_uses
            if isinstance(item, dict) and item.get('frequency', 0) > 0.6
        ]
        
        return {
            'personality_scores': personality_scores,
            'dominant_traits': dominant_traits,
            'personality_summary': ', '.join(dominant_traits) if dominant_traits else 'balanced',
            'emotional_strategies': emotional_strategies,
            'emotional_approach': ', '.join(emotional_strategies) if emotional_strategies else 'neutral',
            'obsession_patterns': obsession_patterns,
            'note': 'UX philosophy from designer quirk signatures'
        }
    
    async def _analyze_intent(
        self,
        reference_files: Dict[str, Any],
        task_description: str
    ) -> Dict[str, Any]:
        """
        Step 1: Analyze the true intent behind the reference design
        
        This step is PURE - no designer taste influence.
        We want to understand the actual problem objectively.
        """
        
        # Build context from reference files
        context_parts = []
        
        context_parts.append("# REFERENCE DESIGN ANALYSIS")
        context_parts.append("")
        context_parts.append(f"## Task Description")
        context_parts.append(task_description)
        context_parts.append("")
        
        # Add Figma structure if available
        if reference_files.get('figma_data'):
            figma_summary = self._summarize_figma_structure(reference_files['figma_data'])
            context_parts.append("## Figma Structure")
            context_parts.append(figma_summary)
            context_parts.append("")
        
        # Build message content (include images if available)
        message_content = []
        
        message_content.append({
            "type": "text",
            "text": "\n".join(context_parts)
        })
        
        # Add images
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
        
        # Call LLM with analyze_intent prompt
        try:
            response = await self.llm.call_claude(
                prompt_name="analyze_intent",
                user_message=message_content,
                max_tokens=3000,
                parse_json=True
            )
            
            result = response.get('json', {})
            
            print(f"  ✓ Intent analyzed")
            print(f"    User goals: {len(result.get('user_goals', []))}")
            print(f"    Pain points: {len(result.get('pain_points', []))}")
            print(f"    Opportunities: {len(result.get('strategic_opportunities', []))}")
            
            return result
            
        except Exception as e:
            print(f"  ✗ Intent analysis failed: {e}")
            return {
                "user_goals": [],
                "pain_points": [],
                "strategic_opportunities": [],
                "error": str(e)
            }
    
    async def _derive_first_principles(
        self,
        intent_analysis: Dict[str, Any],
        domain: str,
        designer_philosophy: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Step 2: Derive first principles for this domain/problem
        
        QUIRK-INFORMED: Designer's UX philosophy influences principles,
        but domain fundamentals always take precedence.
        """
        
        # Build context
        context_parts = []
        
        context_parts.append("# DERIVING FIRST PRINCIPLES")
        context_parts.append("")
        context_parts.append(f"## Domain: {domain}")
        context_parts.append("")
        
        context_parts.append("## Intent Analysis")
        context_parts.append(json.dumps(intent_analysis, indent=2)[:2000])
        context_parts.append("")
        
        # Add designer philosophy if available
        if designer_philosophy:
            context_parts.append("## Designer's UX Philosophy (from portfolio analysis)")
            context_parts.append("")
            context_parts.append(f"**Personality traits**: {designer_philosophy['personality_summary']}")
            context_parts.append(f"**Emotional approach**: {designer_philosophy['emotional_approach']}")
            
            if designer_philosophy.get('obsession_patterns'):
                context_parts.append(f"**Pattern preferences**: {', '.join(designer_philosophy['obsession_patterns'])}")
            
            context_parts.append("")
            context_parts.append("**Important**: Use this philosophy to INFORM principles, not override domain fundamentals.")
            context_parts.append("Example: If designer values playfulness, consider principle like 'Celebrate small wins',")
            context_parts.append("but don't add gamification to serious financial dashboards.")
            context_parts.append("")
        
        message = "\n".join(context_parts)
        
        # Call LLM with derive_first_principles prompt
        try:
            response = await self.llm.call_claude(
                prompt_name="derive_first_principles",
                user_message=message,
                max_tokens=3500,
                parse_json=True
            )
            
            result = response.get('json', {})
            
            print(f"  ✓ First principles derived")
            print(f"    Core principles: {len(result.get('core_principles', []))}")
            
            # Show if designer philosophy influenced
            if designer_philosophy and result.get('designer_influence'):
                print(f"    Designer influence: {result['designer_influence']}")
            
            return result
            
        except Exception as e:
            print(f"  ✗ First principles derivation failed: {e}")
            return {
                "core_principles": [],
                "anti_patterns": [],
                "success_metrics": [],
                "error": str(e)
            }
    
    async def _generate_strategic_explorations(
        self,
        first_principles: Dict[str, Any],
        intent_analysis: Dict[str, Any],
        domain: str,
        designer_philosophy: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Step 3: Generate 5+ fundamentally different strategic directions
        
        QUIRK-INFORMED: Explorations can lean into different personality aspects,
        but must maintain strategic diversity.
        """
        
        # Build context
        context_parts = []
        
        context_parts.append("# GENERATING STRATEGIC EXPLORATIONS")
        context_parts.append("")
        
        context_parts.append("## First Principles")
        context_parts.append(json.dumps(first_principles, indent=2)[:2000])
        context_parts.append("")
        
        context_parts.append("## Intent Analysis Summary")
        context_parts.append(json.dumps({
            "user_goals": intent_analysis.get('user_goals', [])[:3],
            "top_pain_points": intent_analysis.get('pain_points', [])[:3]
        }, indent=2))
        context_parts.append("")
        
        context_parts.append(f"## Domain: {domain}")
        context_parts.append("")
        
        # Add designer philosophy
        if designer_philosophy:
            context_parts.append("## Designer's UX Philosophy")
            context_parts.append("")
            context_parts.append(f"**Personality**: {designer_philosophy['personality_summary']}")
            context_parts.append(f"**Emotional approach**: {designer_philosophy['emotional_approach']}")
            context_parts.append("")
            context_parts.append("**Guidance**: Explorations can lean into different personality aspects:")
            
            if 'playful' in designer_philosophy.get('dominant_traits', []):
                context_parts.append("  - One exploration could emphasize delightful micro-interactions")
            
            if 'sophisticated' in designer_philosophy.get('dominant_traits', []):
                context_parts.append("  - One exploration could emphasize minimal, data-driven clarity")
            
            if 'energetic' in designer_philosophy.get('personality_scores', {}).keys():
                if designer_philosophy['personality_scores'].get('energy_level', 0) > 0.7:
                    context_parts.append("  - One exploration could emphasize dynamic, real-time updates")
            
            context_parts.append("")
            context_parts.append("**Important**: Maintain strategic diversity - don't make all explorations similar.")
            context_parts.append("")
        
        message = "\n".join(context_parts)
        
        # Call LLM with generate_strategic_explorations prompt
        try:
            response = await self.llm.call_claude(
                prompt_name="generate_strategic_explorations",
                user_message=message,
                max_tokens=4000,
                parse_json=True
            )
            
            result = response.get('json', {})
            
            explorations = result.get('explorations', [])
            print(f"  ✓ Strategic explorations generated: {len(explorations)}")
            
            for i, exp in enumerate(explorations[:3], 1):
                print(f"    {i}. {exp.get('name', 'Unnamed')}")
            
            return result
            
        except Exception as e:
            print(f"  ✗ Exploration generation failed: {e}")
            return {
                "explorations": [],
                "error": str(e)
            }
    
    async def _synthesize_optimal_design(
        self,
        explorations: Dict[str, Any],
        first_principles: Dict[str, Any],
        intent_analysis: Dict[str, Any],
        designer_philosophy: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Step 4: Synthesize the optimal design from explorations
        
        STRATEGIC + QUIRK ALIGNMENT: Choose exploration that best aligns with
        both first principles AND designer's UX philosophy (if available).
        """
        
        # Build context
        context_parts = []
        
        context_parts.append("# SYNTHESIZING OPTIMAL DESIGN")
        context_parts.append("")
        
        context_parts.append("## All Explorations")
        context_parts.append(json.dumps(explorations, indent=2)[:3000])
        context_parts.append("")
        
        context_parts.append("## First Principles")
        context_parts.append(json.dumps(first_principles, indent=2)[:2000])
        context_parts.append("")
        
        # Add designer philosophy for alignment check
        if designer_philosophy:
            context_parts.append("## Designer's UX Philosophy (for alignment)")
            context_parts.append("")
            context_parts.append(f"**Personality**: {designer_philosophy['personality_summary']}")
            context_parts.append(f"**Emotional approach**: {designer_philosophy['emotional_approach']}")
            context_parts.append("")
            context_parts.append("**Synthesis guidance**: Choose or combine explorations that:")
            context_parts.append("  1. Best satisfy first principles (PRIMARY)")
            context_parts.append("  2. Align with designer's UX philosophy (SECONDARY)")
            context_parts.append("  3. Feel authentic to designer's portfolio aesthetic")
            context_parts.append("")
            context_parts.append("If there's conflict, principles win. Philosophy informs, doesn't override.")
            context_parts.append("")
        
        message = "\n".join(context_parts)
        
        # Call LLM with synthesize_optimal_design prompt
        try:
            response = await self.llm.call_claude(
                prompt_name="synthesize_optimal_design",
                user_message=message,
                max_tokens=4000,
                parse_json=True
            )
            
            result = response.get('json', {})
            
            optimal = result.get('optimal_design', {})
            print(f"  ✓ Optimal design synthesized")
            print(f"    Name: {optimal.get('name', 'N/A')}")
            print(f"    Strategic position: {optimal.get('strategic_position', 'N/A')[:60]}...")
            
            if designer_philosophy and result.get('designer_alignment'):
                print(f"    Designer alignment: {result['designer_alignment']}")
            
            return result
            
        except Exception as e:
            print(f"  ✗ Synthesis failed: {e}")
            return {
                "optimal_design": {},
                "error": str(e)
            }
    
    def _summarize_figma_structure(self, figma_data: Dict[str, Any]) -> str:
        """Quick summary of Figma structure for context"""
        
        # Count nodes by type
        def count_nodes(node, counts):
            node_type = node.get('type', 'UNKNOWN')
            counts[node_type] = counts.get(node_type, 0) + 1
            
            for child in node.get('children', []):
                count_nodes(child, counts)
        
        counts = {}
        doc = figma_data.get('document', {})
        count_nodes(doc, counts)
        
        summary_parts = []
        summary_parts.append(f"Total nodes: {sum(counts.values())}")
        summary_parts.append(f"Node types: {', '.join(f'{k}: {v}' for k, v in sorted(counts.items(), key=lambda x: -x[1])[:5])}")
        
        return "\n".join(summary_parts)
    
    def prepare_rethink_for_ui_generation(
        self,
        rethink_data: Dict[str, Any],
        task_description: str,
        device_info: Dict[str, Any]
    ) -> str:
        """
        Prepare rethink data for final UI generation
        
        This formats the strategic thinking + DTM for the UI generation prompt.
        """
        
        optimal_design = rethink_data.get('optimal_design', {}).get('optimal_design', {})
        first_principles = rethink_data.get('first_principles', {})
        intent_analysis = rethink_data.get('intent_analysis', {})
        dtm = rethink_data.get('dtm')
        designer_philosophy = rethink_data.get('designer_philosophy')
        
        context = f"""
=== STRATEGIC CONTEXT (from Rethink Pipeline) ===

## Core Principles
{json.dumps(first_principles.get('core_principles', []), indent=2)[:1500]}

## Optimal Design Specification
{json.dumps(optimal_design, indent=2)[:3000]}

## Task Description
{task_description}

## Device Context
{json.dumps(device_info, indent=2)}
"""
        
        # Add DTM context if available
        if dtm:
            context += f"""

=== DESIGNER TASTE MODEL (DTM v3) ===

## Tier 2: Designer Systems (spacing, colors, typography, forms)
{json.dumps(dtm.get('designer_systems', {}), indent=2)[:2000]}

## Tier 3: Signature Patterns (glassmorphism, gradients, shadows, etc.)
{json.dumps(dtm.get('signature_patterns', []), indent=2)[:2000]}

## Designer's UX Philosophy (from quirk signatures)
"""
            
            if designer_philosophy:
                context += f"""
**Personality**: {designer_philosophy.get('personality_summary', 'balanced')}
**Emotional approach**: {designer_philosophy.get('emotional_approach', 'neutral')}
**Pattern preferences**: {', '.join(designer_philosophy.get('obsession_patterns', []))}
"""
            else:
                context += "No quirk data available (pre-quirk DTM or insufficient data)\n"
            
            context += f"""

## Visual Reference Examples
Available resources: {len(dtm.get('visual_library', {}).get('all_resources', []))}
Contexts: {list(dtm.get('visual_library', {}).get('by_context', {}).keys())}

=== IMPLEMENTATION INSTRUCTIONS ===

**STRATEGIC LAYER** (from Optimal Design):
- Use the information architecture, interaction model, and content strategy
- Implement the strategic innovations and features specified
- Use the strategic content (not generic placeholders)

**VISUAL LAYER** (from DTM):
- Apply Tier 2 systems for ALL spacing, colors, typography, radii
- Apply Tier 3 signature patterns for visual effects
- Make it look like it came from this designer's portfolio

**COMBINATION**:
The strategic structure (what) comes from rethinking.
The visual execution (how) comes from the designer's taste.
"""
        
        else:
            context += """

=== IMPLEMENTATION INSTRUCTIONS ===

No Designer Taste Model available - use generic modern styling.

**STRATEGIC LAYER**: Implement the optimal design specification.
**VISUAL LAYER**: Use clean, modern, accessible styling.
"""
        
        return context
    
    def prepare_rethink_for_flow_architecture(
        self,
        rethink_data: Dict[str, Any],
        task_description: str,
        device_info: Dict[str, Any]
    ) -> str:
        """
        Prepare rethink data for flow architecture generation
        
        This provides strategic context to the flow architecture prompt.
        """
        
        optimal_design = rethink_data.get('optimal_design', {}).get('optimal_design', {})
        first_principles = rethink_data.get('first_principles', {})
        
        context = f"""
=== RETHINK MODE STRATEGIC CONTEXT ===

The UX has been strategically rethought from first principles.
Use this context to inform the flow architecture.

## Core Principles (guiding all design decisions)
{json.dumps(first_principles.get('core_principles', []), indent=2)[:1500]}

## Optimal Design Approach
Name: {optimal_design.get('name', 'N/A')}
Strategic Position: {optimal_design.get('strategic_position', 'N/A')[:200]}

Key Screens/Features:
{json.dumps(optimal_design.get('key_screens', []), indent=2)[:1500]}

## Flow Architecture Guidance

When designing the flow:
- Respect the strategic structure defined in the optimal design
- Apply the core principles throughout the flow
- Use the optimal design's screens as starting points
- Maintain strategic coherence across all screens
"""
        
        return context


# Export
__all__ = ["RethinkProcessor"]