"""
DTM Builder - Main orchestrator
Builds Designer Taste Model from multiple DTRs using hybrid approach:
- Code-based statistical pattern extraction (fast, deterministic)
- LLM-based semantic rule synthesis (high-level, contextual)
"""
from typing import Dict, Any, List, Optional
from datetime import datetime
import json

from app.dtm_statistical_extractor import DTMStatisticalExtractor
from app.dtm_llm_synthesizer import DTMLLMSynthesizer


class DTMBuilder:
    """Build Designer Taste Model from multiple DTRs"""
    
    def __init__(self, llm_client=None):
        """
        Args:
            llm_client: LLM client for semantic synthesis (optional for code-only mode)
        """
        self.stat_extractor = DTMStatisticalExtractor()
        self.llm_synthesizer = DTMLLMSynthesizer(llm_client) if llm_client else None
    
    async def build_dtm(
        self,
        dtrs: List[Dict[str, Any]],
        taste_id: str,
        owner_id: str,
        use_llm: bool = True
    ) -> Dict[str, Any]:
        """
        Build complete DTM from multiple DTRs
        
        Args:
            dtrs: List of DTR v4 dictionaries (minimum 1, recommended 2+)
            taste_id: Unique taste identifier
            owner_id: Owner/designer identifier
            use_llm: Whether to use LLM for semantic synthesis (default True)
            
        Returns:
            Complete DTM dictionary
        """
        
        if not dtrs:
            raise ValueError("Need at least 1 DTR to build DTM")
        
        # Step 1: Extract statistical patterns (code-based, fast)
        print(f"Extracting statistical patterns from {len(dtrs)} DTRs...")
        statistical_patterns = self.stat_extractor.extract_patterns(dtrs)
        
        # Step 2: Synthesize semantic rules (LLM-based, optional)
        semantic_rules = {}
        if use_llm and self.llm_synthesizer:
            print("Synthesizing semantic rules with LLM...")
            try:
                semantic_rules = await self.llm_synthesizer.synthesize_rules(
                    statistical_patterns=statistical_patterns,
                    sample_dtrs=dtrs[:5]  # Max 5 samples for context
                )
            except Exception as e:
                print(f"Warning: LLM synthesis failed: {e}")
                print("Continuing with code-based patterns only...")
                semantic_rules = self._generate_basic_semantic_rules(statistical_patterns)
        else:
            print("Skipping LLM synthesis (code-based only)")
            semantic_rules = self._generate_basic_semantic_rules(statistical_patterns)
        
        # Step 3: Build complete DTM
        dtm = self._build_dtm_structure(
            taste_id=taste_id,
            owner_id=owner_id,
            dtrs=dtrs,
            statistical_patterns=statistical_patterns,
            semantic_rules=semantic_rules
        )
        
        return dtm
    
    def _build_dtm_structure(
        self,
        taste_id: str,
        owner_id: str,
        dtrs: List[Dict[str, Any]],
        statistical_patterns: Dict[str, Any],
        semantic_rules: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Build complete DTM structure"""
        
        # Extract resource metadata
        resources = []
        for dtr in dtrs:
            meta = dtr.get("meta", {})
            resources.append({
                "resource_id": meta.get("resource_id"),
                "context": meta.get("context", {}),
                "confidence": meta.get("confidence_scores", {}).get("overall", 0)
            })
        
        # Calculate overall confidence
        overall_confidence = sum(r["confidence"] for r in resources) / len(resources) if resources else 0
        
        dtm = {
            "version": "1.0",
            "taste_id": taste_id,
            "owner_id": owner_id,
            
            "meta": {
                "created_at": datetime.utcnow().isoformat() + "Z",
                "updated_at": datetime.utcnow().isoformat() + "Z",
                "total_resources": len(dtrs),
                "total_dtrs_analyzed": len(dtrs),
                "overall_confidence": round(overall_confidence, 2),
                "analysis_method": "hybrid_statistical_semantic",
                "resources": resources
            },
            
            # Code-extracted statistical patterns (deterministic, comprehensive)
            "statistical_patterns": statistical_patterns,
            
            # LLM-synthesized semantic rules (high-level, contextual)
            "semantic_rules": {
                "invariants": semantic_rules.get("invariants", []),
                "contextual_rules": semantic_rules.get("contextual_rules", []),
                "meta_rules": semantic_rules.get("meta_rules", [])
            },
            
            # Resource context mapping (for selective application)
            "resource_contexts": self._build_resource_context_map(dtrs)
        }
        
        return dtm
    
    def _build_resource_context_map(self, dtrs: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Build map of resource contexts for selective rule application
        Enables: "Use patterns from dark-theme designs"
        """
        
        context_map = {}
        
        for dtr in dtrs:
            resource_id = dtr.get("meta", {}).get("resource_id")
            context = dtr.get("meta", {}).get("context", {})
            
            if resource_id:
                context_map[resource_id] = {
                    "use_case": context.get("primary_use_case"),
                    "content_type": context.get("content_type"),
                    "platform": context.get("platform"),
                    "keywords": self._extract_context_keywords(dtr)
                }
        
        return context_map
    
    def _extract_context_keywords(self, dtr: Dict[str, Any]) -> List[str]:
        """Extract searchable keywords from DTR context"""
        
        keywords = []
        
        context = dtr.get("meta", {}).get("context", {})
        keywords.extend([
            context.get("primary_use_case", ""),
            context.get("content_type", ""),
            context.get("platform", "")
        ])
        
        # Extract from philosophy
        phil = dtr.get("philosophy", {})
        if "aesthetic_signature" in phil:
            aesthetic = phil["aesthetic_signature"]
            if isinstance(aesthetic, dict):
                keywords.extend(aesthetic.get("emotional_tone", []))
        
        # Extract from visual language
        visual = dtr.get("visual_language", {})
        if "color_system" in visual:
            colors = visual["color_system"]
            if isinstance(colors, dict) and "psychology" in colors:
                psych = colors["psychology"]
                if isinstance(psych, dict):
                    keywords.append(psych.get("emotional_tone", ""))
        
        # Clean and return
        keywords = [k.lower().strip() for k in keywords if k]
        return list(set(keywords))  # Unique
    
    def _generate_basic_semantic_rules(self, statistical_patterns: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate basic semantic rules from statistics (fallback when LLM unavailable)
        Simple heuristic-based rules
        """
        
        rules = {
            "invariants": [],
            "contextual_rules": [],
            "meta_rules": []
        }
        
        # Spacing quantum invariant
        spacing = statistical_patterns.get("spacing", {})
        if "quantum" in spacing:
            q = spacing["quantum"]
            if q.get("consistency", 0) > 0.95:
                rules["invariants"].append({
                    "rule": "spacing_quantum_consistent",
                    "description": f"Consistent {q.get('mode', 8)}px spacing quantum",
                    "confidence": q.get("consistency", 0),
                    "evidence": f"consistency={q.get('consistency', 0):.2f}",
                    "type": "spatial"
                })
        
        # Color temperature invariant
        colors = statistical_patterns.get("colors", {})
        if "temperature" in colors:
            temp = colors["temperature"]
            if temp.get("cool", 0) > 0.7:
                rules["invariants"].append({
                    "rule": "cool_color_temperature",
                    "description": "Predominantly cool colors (blues, grays)",
                    "confidence": temp.get("cool", 0),
                    "evidence": f"cool={temp.get('cool', 0):.2f}",
                    "type": "color"
                })
        
        # Typography scale invariant
        typo = statistical_patterns.get("typography", {})
        if "scale_ratio" in typo:
            sr = typo["scale_ratio"]
            if sr.get("consistency", 0) > 0.90:
                rules["invariants"].append({
                    "rule": "type_scale_consistent",
                    "description": f"Consistent {sr.get('mean', 1.5):.2f} type scale ratio",
                    "confidence": sr.get("consistency", 0),
                    "evidence": f"consistency={sr.get('consistency', 0):.2f}",
                    "type": "typography"
                })
        
        return rules
    
    def get_dtm_summary(self, dtm: Dict[str, Any]) -> str:
        """Generate human-readable DTM summary"""
        
        lines = []
        lines.append("=== Designer Taste Model Summary ===\n")
        
        meta = dtm.get("meta", {})
        lines.append(f"Taste ID: {dtm.get('taste_id')}")
        lines.append(f"Resources analyzed: {meta.get('total_resources', 0)}")
        lines.append(f"Overall confidence: {meta.get('overall_confidence', 0):.2f}")
        lines.append("")
        
        # Invariants
        semantic = dtm.get("semantic_rules", {})
        invariants = semantic.get("invariants", [])
        if invariants:
            lines.append(f"Invariants ({len(invariants)} found):")
            for inv in invariants[:5]:
                lines.append(f"  - {inv.get('description')} (confidence: {inv.get('confidence', 0):.2f})")
            lines.append("")
        
        # Contextual rules
        contextual = semantic.get("contextual_rules", [])
        if contextual:
            lines.append(f"Contextual rules ({len(contextual)} found):")
            for rule in contextual[:3]:
                ctx = rule.get("context", {})
                lines.append(f"  - {ctx}: {rule.get('rules', {})}")
            lines.append("")
        
        # Meta-rules
        meta_rules = semantic.get("meta_rules", [])
        if meta_rules:
            lines.append(f"Meta-rules ({len(meta_rules)} found):")
            for mr in meta_rules[:3]:
                lines.append(f"  - {mr.get('rule')}: {mr.get('description', '')[:80]}...")
            lines.append("")
        
        # Statistical patterns summary
        stats = dtm.get("statistical_patterns", {})
        if "spacing" in stats and "quantum" in stats["spacing"]:
            q = stats["spacing"]["quantum"]
            lines.append(f"Spacing quantum: {q.get('mode', 0)}px (consistency: {q.get('consistency', 0):.2f})")
        
        if "typography" in stats and "scale_ratio" in stats["typography"]:
            sr = stats["typography"]["scale_ratio"]
            lines.append(f"Type scale ratio: {sr.get('mean', 0):.2f} (consistency: {sr.get('consistency', 0):.2f})")
        
        return "\n".join(lines)


# Test / Example
if __name__ == "__main__":
    print("DTMBuilder - Main orchestrator")
    print("\nExample usage:")
    print("""
    # With LLM
    builder = DTMBuilder(llm_client)
    dtm = await builder.build_dtm(
        dtrs=[dtr1, dtr2, dtr3],
        taste_id="uuid",
        owner_id="user_123"
    )
    
    # Code-only (no LLM)
    builder = DTMBuilder()
    dtm = await builder.build_dtm(
        dtrs=[dtr1, dtr2],
        taste_id="uuid",
        owner_id="user_123",
        use_llm=False
    )
    
    # Summary
    print(builder.get_dtm_summary(dtm))
    """)