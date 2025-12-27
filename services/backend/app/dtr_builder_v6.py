"""
DTR Builder v6 - Quirk-Enhanced Designer Taste Representation

Extends v5 with unconventional pattern detection (quirks) that capture
designer personality, obsessions, rule-breaking, and emotional architecture.

Key Changes from v5:
- Adds quirk_patterns section
- Detects unconventional signatures beyond standard metrics
- Captures personality and emotional design patterns
- Four-layer structure: Quantitative + Visual + Semantic + Quirks

Created: December 27, 2025
"""

from typing import Dict, Any, List, Optional
from datetime import datetime
import json

# Import quirk analyzer
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))
from quirk_analyzer import QuirkAnalyzer


class DTRBuilderV6:
    """Build DTR v6 from resource data with quirk detection"""
    
    VERSION = "6.0"
    
    def __init__(self, llm_client, dtr_v5_builder):
        """
        Args:
            llm_client: LLM service for semantic analysis
            dtr_v5_builder: DTR v5 builder instance for base analysis
        """
        self.llm = llm_client
        self.v5_builder = dtr_v5_builder
        self.quirk_analyzer = QuirkAnalyzer(llm_client)
    
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
        Build complete DTR v6 from resource
        
        Args:
            figma_json: Figma design structure
            code_analysis: Quantitative analysis results
            resource_id: Resource identifier
            taste_id: Taste identifier
            has_image: Whether image is available
            image_base64: Base64-encoded image
            context_override: Manual context specification
            
        Returns:
            Complete DTR v6 dictionary
        """
        
        print(f"\n{'='*60}")
        print(f"BUILDING DTR v6 - Quirk-Enhanced Architecture")
        print(f"{'='*60}")
        
        # Step 1-5: Use v5 builder for base analysis
        print("\n[Step 1-5: Base DTR v5 Construction]")
        dtr_v5 = await self.v5_builder.build_dtr(
            figma_json=figma_json,
            code_analysis=code_analysis,
            resource_id=resource_id,
            taste_id=taste_id,
            has_image=has_image,
            image_base64=image_base64,
            context_override=context_override
        )
        
        # Step 6: NEW - Quirk Analysis
        print("\n[6/6] QUIRK ANALYSIS - Detecting unconventional patterns...")
        
        quirk_patterns = await self.quirk_analyzer.analyze_quirks(
            quantitative=dtr_v5.get("quantitative", {}),
            visual_patterns=dtr_v5.get("visual_patterns", []),
            figma_json=figma_json,
            image_base64=image_base64
        )
        
        # Upgrade to v6
        dtr_v6 = {
            **dtr_v5,
            "version": self.VERSION,
            "quirk_patterns": quirk_patterns
        }
        
        # Update meta
        dtr_v6["meta"]["created_at"] = datetime.now().isoformat()
        
        # Log quirk summary
        print(f"\n{'='*60}")
        print(f"QUIRK ANALYSIS SUMMARY")
        print(f"{'='*60}")
        
        # Count detected quirks
        quirk_counts = {}
        for category, data in quirk_patterns.items():
            if isinstance(data, dict):
                quirk_counts[category] = len([k for k, v in data.items() if v and k != "note"])
            else:
                quirk_counts[category] = 0
        
        total_quirks = sum(quirk_counts.values())
        print(f"Total quirks detected: {total_quirks}")
        for category, count in quirk_counts.items():
            if count > 0:
                print(f"  {category}: {count} patterns")
        
        return dtr_v6


# Export
__all__ = ["DTRBuilderV6"]