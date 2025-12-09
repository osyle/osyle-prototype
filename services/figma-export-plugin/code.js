// ============================================================================
// COMPRESSION FUNCTION
// ============================================================================

function compressFigmaNode(node) {
  function simplifyColor(paint) {
    if (!paint || paint.type !== "SOLID") return null;

    const c = paint.color || {};
    const r = Math.round((c.r || 0) * 255);
    const g = Math.round((c.g || 0) * 255);
    const b = Math.round((c.b || 0) * 255);
    const opacity = paint.opacity != null ? paint.opacity : 1;

    return opacity < 1
      ? `rgba(${r},${g},${b},${opacity.toFixed(2)})`
      : `rgb(${r},${g},${b})`;
  }

  const layout = {
    direction: node.layoutMode,
    gap: node.itemSpacing,
    align_primary: node.primaryAxisAlignItems,
    align_secondary: node.counterAxisAlignItems,
    padding: [
      node.paddingTop,
      node.paddingRight,
      node.paddingBottom,
      node.paddingLeft,
    ],
  };

  const style = {
    color:
      node.fills && node.fills[0] ? simplifyColor(node.fills[0]) : undefined,
    corner_radius: node.cornerRadius,
    font_size: node.fontSize,
    font_family: node.fontFamily,
    font_weight: node.fontWeight,
  };

  const compressed = {
    type: node.type,
    name: node.name,
    layout,
    style,
  };

  if (node.type === "TEXT") {
    compressed.text = node.characters;
  }

  if (node.children && node.children.length > 0) {
    compressed.children = node.children.map(compressFigmaNode);
  }

  // Remove null/empty values
  const cleaned = {};
  for (const key in compressed) {
    const value = compressed[key];
    if (
      value !== null &&
      value !== undefined &&
      !(Array.isArray(value) && value.length === 0)
    ) {
      cleaned[key] = value;
    }
  }

  return cleaned;
}

// ============================================================================
// HELPER: Encode string to Uint8Array (TextEncoder polyfill)
// ============================================================================

function encodeUTF8(str) {
  return new Uint8Array(Array.from(str).map((c) => c.charCodeAt(0)));
}

// ============================================================================
// PLUGIN LOGIC
// ============================================================================

figma.showUI(__html__, {
  visible: true,
  width: 360,
  height: 480,
  themeColors: true,
});

figma.ui.onmessage = async function (msg) {
  if (msg.type === "export") {
    const selection = figma.currentPage.selection;
    const exportJson = msg.exportJson;
    const exportPng = msg.exportPng;

    if (!selection.length) {
      figma.ui.postMessage({
        type: "error",
        message: "Please select at least one node.",
      });
      return;
    }

    if (!exportJson && !exportPng) {
      figma.ui.postMessage({
        type: "error",
        message: "Select at least one export option.",
      });
      return;
    }

    for (const node of selection) {
      const nodeName = node.name.replace(/[\\/:*?"<>|]/g, "_");
      const files = [];

      try {
        figma.ui.postMessage({
          type: "progress",
          message: `Processing ${nodeName}...`,
        });

        // JSON export
        if (exportJson) {
          const json = compressFigmaNode(node);
          const jsonBytes = encodeUTF8(JSON.stringify(json, null, 2));
          files.push({ name: "figma.json", content: jsonBytes });
        }

        // PNG export
        if (exportPng) {
          const pngBytes = await node.exportAsync({
            format: "PNG",
            constraint: { type: "SCALE", value: 2 },
          });
          files.push({ name: "image.png", content: pngBytes });
        }

        // Send all files for this node once ready
        figma.ui.postMessage({
          type: "files-ready",
          nodeName,
          files,
        });
      } catch (err) {
        figma.ui.postMessage({
          type: "error",
          message: `Failed to export ${nodeName}: ${err.message}`,
        });
      }
    }

    figma.ui.postMessage({
      type: "export-complete",
      message: `Successfully exported ${selection.length} node(s)!`,
    });
  }

  if (msg.type === "cancel") {
    figma.closePlugin();
  }
};
