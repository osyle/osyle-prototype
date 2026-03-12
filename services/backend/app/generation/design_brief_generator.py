"""
Design Brief Generator

Runs ONE creative planning call before parallel screen generation.
Produces a flow-level visual design brief that all screens inherit,
ensuring cross-screen coherence and unlocking Claude's full design judgment
before code constraints kick in.

This is the "separate the WHY from the HOW" step.
"""
from typing import Dict, Any, Optional, List
import os

from app.llm.types import Message, MessageRole


DESIGN_BRIEF_PROMPT_PATH = os.path.join(
    os.path.dirname(__file__),
    "prompts", "flow", "design_brief.md"
)


def _load_brief_prompt() -> str:
    try:
        with open(DESIGN_BRIEF_PROMPT_PATH, "r") as f:
            return f.read()
    except FileNotFoundError:
        return ""  # Graceful fallback if prompt file missing


def _format_dtm_personality(dtm: Dict[str, Any]) -> str:
    """Extract personality essence from DTM for brief generation context.
    Keeps it compact — brief generator needs intent, not pixel values."""
    if not dtm:
        return "No taste data available — use your best design judgment."
    
    parts = []
    
    # Personality (most important for brief generation)
    personality = dtm.get("personality", {})
    if personality:
        lineage = personality.get("design_lineage", "")
        emotional = personality.get("emotional_register", "")
        heuristics = personality.get("decision_heuristics", {})
        obsessions = personality.get("cross_resource_obsessions", [])
        absences = personality.get("universal_absences", [])
        
        if lineage:
            parts.append(f"**Design Lineage**: {lineage}")
        if emotional:
            parts.append(f"**Emotional Register**: {emotional}")
        if heuristics:
            drama = heuristics.get("drama_vs_usability", "")
            density = heuristics.get("density_preference", "")
            color_phil = heuristics.get("color_philosophy", "")
            if drama:
                parts.append(f"**Drama vs Usability**: {drama}")
            if density:
                parts.append(f"**Density Preference**: {density}")
            if color_phil:
                parts.append(f"**Color Philosophy**: {color_phil}")
        if obsessions:
            obs_strs = [o.get("pattern", "") for o in obsessions[:3] if o.get("pattern")]
            if obs_strs:
                parts.append(f"**Signature Patterns**: {', '.join(obs_strs)}")
        if absences:
            parts.append(f"**Never Does**: {', '.join(list(absences)[:4])}")
    
    # Color palette — just the key colors, not full constraint data
    exact_tokens = dtm.get("exact_tokens", {})
    colors = exact_tokens.get("colors", {}).get("exact_palette", [])
    if colors:
        palette = [c.get("hex", "") for c in colors[:6] if c.get("hex")]
        if palette:
            parts.append(f"**Color Palette**: {', '.join(palette)}")
    
    # Typography — font names only
    typography = exact_tokens.get("typography", {})
    families = typography.get("families", [])
    if families:
        font_names = [f.get("name", f.get("family_name", "")) for f in families[:3]]
        font_names = [n for n in font_names if n]
        if font_names:
            parts.append(f"**Fonts**: {', '.join(font_names)}")
    
    # Spatial philosophy
    consensus = dtm.get("consensus", {})
    spatial = consensus.get("spatial_philosophy", "")
    if spatial:
        # Keep it brief — first 150 chars
        parts.append(f"**Spatial Philosophy**: {spatial[:150]}...")
    
    return "\n".join(parts) if parts else "No taste data available."


def _format_flow_summary(screens: List[Dict[str, Any]], app_description: str) -> str:
    """Format the flow as a readable summary for the brief generator."""
    parts = [f"**App**: {app_description}\n"]
    parts.append(f"**Screens ({len(screens)} total)**:")
    for i, screen in enumerate(screens):
        name = screen.get("name", f"Screen {i+1}")
        task = screen.get("task_description", screen.get("description", ""))
        # Keep task description short
        task_short = task[:120] + "..." if len(task) > 120 else task
        parts.append(f"  {i+1}. **{name}** — {task_short}")
    return "\n".join(parts)


async def generate_design_brief(
    llm,
    screens: List[Dict[str, Any]],
    dtm: Dict[str, Any],
    app_description: str,
    model: str = "claude-sonnet-4.5",
) -> Optional[str]:
    """
    Generate a flow-level visual design brief.
    
    Runs once before parallel screen generation. Returns a brief string
    that gets injected into every screen's prompt via design_brief param.
    
    Args:
        llm: LLM service instance
        screens: List of screen specs from flow architecture
        dtm: Designer taste model
        app_description: Original user prompt / app description
        model: Model to use (Sonnet is fine here — brief is fast)
    
    Returns:
        Brief string, or None if generation fails (screens fall back gracefully)
    """
    print("\n  🎨 Generating flow design brief...")
    
    try:
        system_prompt = _load_brief_prompt()
        if not system_prompt:
            print("  ⚠️  design_brief.md not found — skipping brief generation")
            return None
        
        # Build context for brief generation
        flow_summary = _format_flow_summary(screens, app_description)
        taste_context = _format_dtm_personality(dtm)
        
        user_message = f"""## Flow to Design

{flow_summary}

## Designer's Aesthetic Personality

{taste_context}

---

Generate a concise, opinionated design brief for this flow. Be specific — name exact choices (treatments, font pairings, color assignments, layout approach). The brief must give every screen a coherent creative direction."""
        
        messages = [
            Message(role=MessageRole.SYSTEM, content=system_prompt),
            Message(role=MessageRole.USER, content=user_message),
        ]
        
        response = await llm.generate(
            model=model,
            messages=messages,
            max_tokens=800,      # Brief should be concise — ~600 tokens max
            temperature=1.0,     # High creativity for the planning phase
        )
        
        brief_text = response.text.strip()
        
        if brief_text:
            print(f"  ✓ Design brief generated ({len(brief_text)} chars)")
            print(f"\n  📋 Brief preview:\n  {brief_text[:300]}...\n")
            return brief_text
        else:
            print("  ⚠️  Empty brief returned — skipping")
            return None
    
    except Exception as e:
        # Brief generation is best-effort — never block screen generation
        print(f"  ⚠️  Design brief generation failed: {e} — continuing without brief")
        return None