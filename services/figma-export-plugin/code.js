// -------- Compression function --------
function compressFigmaNode(node) {
  function simplifyColor(paint) {
    if (!paint || paint.type !== "SOLID") return null;
    const c = paint.color || {};
    const r = Math.round((c.r || 0) * 255);
    const g = Math.round((c.g || 0) * 255);
    const b = Math.round((c.b || 0) * 255);
    const opacity =
      paint.opacity !== undefined && paint.opacity !== null ? paint.opacity : 1;

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
    color: node.fills?.[0] ? simplifyColor(node.fills[0]) : undefined,
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
  if (node.type === "TEXT") compressed.text = node.characters;
  if (node.children?.length)
    compressed.children = node.children.map(compressFigmaNode);

  // Remove empty values
  return Object.fromEntries(
    Object.entries(compressed).filter(
      ([k, v]) => v != null && !(Array.isArray(v) && v.length === 0)
    )
  );
}

// -------- Plugin code --------
const selection = figma.currentPage.selection;

if (!selection.length) {
  figma.notify("Please select at least one node.");
} else {
  selection.forEach(async (node) => {
    // ---- JSON export ----
    const json = compressFigmaNode(node);
    const jsonBlob = new Blob([JSON.stringify(json, null, 2)], {
      type: "application/json",
    });
    const jsonUrl = URL.createObjectURL(jsonBlob);

    figma.ui.postMessage({
      type: "download",
      fileUrl: jsonUrl,
      fileName: `${node.name}.json`,
    });

    // ---- PNG export ----
    const pngBytes = await node.exportAsync({
      format: "PNG",
      constraint: { type: "SCALE", value: 2 },
    });
    const pngBlob = new Blob([pngBytes], { type: "image/png" });
    const pngUrl = URL.createObjectURL(pngBlob);

    figma.ui.postMessage({
      type: "download",
      fileUrl: pngUrl,
      fileName: `${node.name}.png`,
    });
  });
}

// Show UI (required for download handling)
figma.showUI(__html__, { visible: true, width: 200, height: 100 });
