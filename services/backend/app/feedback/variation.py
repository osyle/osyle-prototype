"""
Variation Generator
Regenerates a specific element/area of an existing screen with a fresh design variation.
Only the target element's internals are changed; everything else is preserved.
"""
import re
from pathlib import Path
from typing import Dict, Any, AsyncGenerator, Optional

from app.llm.types import Message, MessageRole


class VariationGenerator:
    """Generates a design variation for a specific area of an existing screen."""

    def __init__(self, llm_client):
        self.llm = llm_client
        feedback_prompts_dir = Path(__file__).parent / "prompts"
        generation_prompts_dir = Path(__file__).parent.parent / "generation" / "prompts"

        # Load variation system prompt template
        template_path = feedback_prompts_dir / "variation_prompt.md"
        with open(template_path, "r", encoding="utf-8") as f:
            self._system_template = f.read()

        # Load image mode fragments (reused directly from generation/prompts)
        ai_mode_path = generation_prompts_dir / "images" / "ai_mode.md"
        url_mode_path = generation_prompts_dir / "images" / "image_url_mode.md"
        with open(ai_mode_path, "r", encoding="utf-8") as f:
            self._ai_mode_instructions = f.read()
        with open(url_mode_path, "r", encoding="utf-8") as f:
            self._url_mode_instructions = f.read()

    def _build_system_prompt(self, image_generation_mode: str) -> str:
        instructions = (
            self._ai_mode_instructions
            if image_generation_mode == "ai"
            else self._url_mode_instructions
        )
        return self._system_template.replace("{IMAGE_MODE_INSTRUCTIONS}", instructions)

    def _build_user_message(
        self,
        current_code: str,
        element_path: str,
        element_name: str,
        element_text: str,
        element_type: str,
        screen_name: str,
        taste_context: Optional[str],
    ) -> str:
        parts = []

        if taste_context:
            parts.append("## Design Taste Constraints\n")
            parts.append(taste_context)
            parts.append("")

        parts.append(f"## Target Screen: {screen_name}\n")
        parts.append("## Target Element\n")
        parts.append(f"**Element name**: {element_name}")
        parts.append(f"**Element path**: `{element_path}`")
        if element_text:
            preview = element_text[:200].replace('\n', ' ')
            parts.append(f"**Visible text/content**: \"{preview}\"")

        if element_type == "leaf":
            parts.append(
                "\n**This is a leaf element** (a single image, text, icon, or button). "
                "Your job is to **replace its content** — not redesign its surroundings. "
                "For an image: choose a different image that serves the same purpose but with a fresh perspective. "
                "For a text node: rewrite the copy with a different voice, angle, or emphasis. "
                "For a button: try a different label, icon, or micro-copy. "
                "Do NOT change any layout, container, or sibling elements. "
                "Everything outside the target element must remain byte-for-byte identical.\n"
            )
        else:
            parts.append(
                "\n**This is a container/section** with multiple child elements. "
                "Your job is to **redesign the layout and interaction pattern** of this section's internals. "
                "Replace the current UX pattern with a genuinely different one — "
                "e.g. vertical list → horizontal chips, form rows → visual tiles, counter → slider. "
                "Everything outside the target element's opening/closing tags must remain byte-for-byte identical.\n"
            )

        parts.append("## Current Screen Code\n")
        parts.append("```tsx")
        parts.append(current_code)
        parts.append("```\n")

        if element_type == "leaf":
            parts.append(
                "Write your rationale (name the original content and what you're replacing it with), "
                "then `$GENERATING`, then the full updated screen code."
            )
        else:
            parts.append(
                "Identify the current UX pattern of the target section, choose a genuinely different "
                "alternative pattern, write your rationale, then `$GENERATING`, then the full updated screen code."
            )

        return "\n".join(parts)

    async def generate_variation(
        self,
        current_code: str,
        element_path: str,
        element_name: str,
        screen_name: str,
        element_text: str = "",
        element_type: str = "container",
        image_generation_mode: str = "image_url",
        taste_context: Optional[str] = None,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Stream a variation for the target element.

        Yields chunks compatible with the feedback applier protocol:
          {"type": "conversation", "chunk": str}   — rationale text
          {"type": "delimiter_detected"}            — $GENERATING found
          {"type": "code", "chunk": str}            — code after delimiter
          {"type": "complete", "conversation": str, "code": str}
        """
        system_prompt = self._build_system_prompt(image_generation_mode)
        user_message = self._build_user_message(
            current_code=current_code,
            element_path=element_path,
            element_name=element_name,
            element_text=element_text,
            element_type=element_type,
            screen_name=screen_name,
            taste_context=taste_context,
        )

        messages = [
            Message(role=MessageRole.SYSTEM, content=system_prompt),
            Message(role=MessageRole.USER, content=user_message),
        ]

        conversation_parts = []
        code_parts = []
        delimiter_found = False
        buffer = ""

        stream = self.llm.generate_stream(
            model="claude-sonnet-4.5",
            messages=messages,
            max_tokens=8000,
            temperature=0.7,
        )

        async for chunk in stream:
            if not delimiter_found:
                buffer += chunk

            if not delimiter_found and "$GENERATING" in buffer:
                before, after = buffer.split("$GENERATING", 1)
                if before.strip():
                    conversation_parts.append(before)
                    yield {"type": "conversation", "chunk": before}

                delimiter_found = True
                yield {"type": "delimiter_detected"}

                code_parts.append(after)
                yield {"type": "code", "chunk": after}
                buffer = ""

            elif not delimiter_found:
                # Flush large buffer safely (avoid splitting delimiter)
                partial_markers = ["$", "$G", "$GE", "$GEN", "$GENE", "$GENER",
                                   "$GENERA", "$GENERAT", "$GENERATI", "$GENERATIN"]
                if len(buffer) > 50 and not any(buffer.endswith(p) for p in partial_markers):
                    conversation_parts.append(buffer)
                    yield {"type": "conversation", "chunk": buffer}
                    buffer = ""

            elif delimiter_found:
                code_parts.append(chunk)
                yield {"type": "code", "chunk": chunk}

        # Flush remaining buffer
        if buffer and not delimiter_found:
            conversation_parts.append(buffer)
            yield {"type": "conversation", "chunk": buffer}

        full_conversation = "".join(conversation_parts).strip()
        full_code = "".join(code_parts).strip()

        yield {
            "type": "complete",
            "conversation": full_conversation,
            "code": full_code,
        }