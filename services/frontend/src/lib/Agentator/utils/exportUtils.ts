// =============================================================================
// Annotation Export & Formatting Utilities
// =============================================================================

import { Annotation, OutputDetailLevel } from '../types';

/**
 * Generate markdown output from annotations
 */
export function generateMarkdown(
  annotations: Annotation[],
  screenName: string,
  detailLevel: OutputDetailLevel = "standard"
): string {
  if (annotations.length === 0) return "";

  let output = `## Screen Feedback: ${screenName}\n\n`;

  annotations.forEach((a, i) => {
    if (detailLevel === "compact") {
      output += `${i + 1}. **${a.element}**: ${a.comment}`;
      if (a.selectedText) {
        output += ` (re: "${a.selectedText.slice(0, 30)}${a.selectedText.length > 30 ? "..." : ""}")`;
      }
      output += "\n";
    } else if (detailLevel === "forensic") {
      output += `### ${i + 1}. ${a.element}\n`;
      if (a.isMultiSelect) {
        output += `*Multi-select annotation*\n`;
      }
      output += `**Element Path:** ${a.elementPath}\n`;
      if (a.cssClasses) {
        output += `**CSS Classes:** ${a.cssClasses}\n`;
      }
      if (a.boundingBox) {
        output += `**Position:** x:${Math.round(a.boundingBox.x)}, y:${Math.round(a.boundingBox.y)} (${Math.round(a.boundingBox.width)}×${Math.round(a.boundingBox.height)}px)\n`;
      }
      if (a.selectedText) {
        output += `**Selected text:** "${a.selectedText}"\n`;
      }
      if (a.nearbyText && !a.selectedText) {
        output += `**Context:** ${a.nearbyText.slice(0, 100)}\n`;
      }
      output += `**Feedback:** ${a.comment}\n\n`;
    } else {
      // Standard and detailed modes
      output += `### ${i + 1}. ${a.element}\n`;
      output += `**Location:** ${a.elementPath}\n`;

      if (detailLevel === "detailed") {
        if (a.cssClasses) {
          output += `**Classes:** ${a.cssClasses}\n`;
        }
        if (a.boundingBox) {
          output += `**Position:** ${Math.round(a.boundingBox.x)}px, ${Math.round(a.boundingBox.y)}px (${Math.round(a.boundingBox.width)}×${Math.round(a.boundingBox.height)}px)\n`;
        }
      }

      if (a.selectedText) {
        output += `**Selected text:** "${a.selectedText}"\n`;
      }

      if (detailLevel === "detailed" && a.nearbyText && !a.selectedText) {
        output += `**Context:** ${a.nearbyText.slice(0, 100)}\n`;
      }

      output += `**Feedback:** ${a.comment}\n\n`;
    }
  });

  return output;
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error("Failed to copy:", err);
    return false;
  }
}

/**
 * Format annotation for AI prompt
 */
export function formatForAI(annotations: Annotation[], screenName: string): string {
  if (annotations.length === 0) return "";

  let prompt = `Update the "${screenName}" screen based on the following feedback:\n\n`;

  annotations.forEach((a, i) => {
    prompt += `${i + 1}. **${a.element}** (${a.elementPath})\n`;
    prompt += `   Feedback: ${a.comment}\n`;
    if (a.selectedText) {
      prompt += `   Selected text: "${a.selectedText}"\n`;
    }
    prompt += `\n`;
  });

  return prompt;
}
