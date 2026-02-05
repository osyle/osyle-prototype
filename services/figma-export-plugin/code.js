// Show the plugin UI
figma.showUI(__html__, { width: 360, height: 400 });

// Handle messages from the UI
figma.ui.onmessage = async (msg) => {
  try {
    if (msg.type === "cancel") {
      figma.closePlugin();
      return;
    }

    if (msg.type === "send-to-osyle") {
      await handleSendToOsyle();
      return;
    }

    if (msg.type === "export") {
      await handleExport(msg.exportJson, msg.exportPng);
      return;
    }
  } catch (error) {
    console.error("Plugin error:", error);
    figma.ui.postMessage({
      type: "error",
      message: error.message || "An error occurred",
    });
  }
};

// NEW: Handle "Send to Osyle" flow
async function handleSendToOsyle() {
  const selection = figma.currentPage.selection;

  if (selection.length === 0) {
    figma.ui.postMessage({
      type: "error",
      message: "Please select a frame or component",
    });
    return;
  }

  if (selection.length > 1) {
    figma.ui.postMessage({
      type: "error",
      message: "Please select only one frame or component",
    });
    return;
  }

  const node = selection[0];

  // Get file key from current file
  const fileKey = figma.fileKey;
  if (!fileKey) {
    figma.ui.postMessage({
      type: "error",
      message:
        "Could not get file key. Please ensure the file is saved to Figma.",
    });
    return;
  }

  // Get node ID
  const nodeId = node.id;
  const fileName = node.name || "Untitled";

  figma.ui.postMessage({
    type: "progress",
    message: "Sending to Osyle...",
  });

  // Send data to UI, which will forward to React app
  figma.ui.postMessage({
    type: "send-to-osyle-data",
    fileKey: fileKey,
    nodeId: nodeId,
    fileName: fileName,
  });
}

// Handle ZIP export flow (backward compatibility)
async function handleExport(exportJson, exportPng) {
  const selection = figma.currentPage.selection;

  if (selection.length === 0) {
    figma.ui.postMessage({
      type: "error",
      message: "Please select a frame or component",
    });
    return;
  }

  if (selection.length > 1) {
    figma.ui.postMessage({
      type: "error",
      message: "Please select only one frame or component",
    });
    return;
  }

  const node = selection[0];
  const nodeName = node.name.replace(/[^a-zA-Z0-9]/g, "_");
  const timestamp = new Date().getTime();
  const files = [];

  // Export JSON
  if (exportJson) {
    figma.ui.postMessage({
      type: "progress",
      message: "Serializing Figma JSON...",
    });

    // Serialize the complete node tree (NO COMPRESSION)
    const jsonData = serializeFigmaNode(node);
    const jsonString = JSON.stringify(jsonData, null, 2);

    // Convert string to UTF-8 byte array (TextEncoder not available in Figma)
    const bytes = [];
    for (let i = 0; i < jsonString.length; i++) {
      const charCode = jsonString.charCodeAt(i);
      if (charCode < 128) {
        bytes.push(charCode);
      } else if (charCode < 2048) {
        bytes.push((charCode >> 6) | 192, (charCode & 63) | 128);
      } else {
        bytes.push(
          (charCode >> 12) | 224,
          ((charCode >> 6) & 63) | 128,
          (charCode & 63) | 128
        );
      }
    }

    files.push({
      name: "figma.json",
      content: bytes,
    });
  }

  // Export PNG
  if (exportPng) {
    figma.ui.postMessage({
      type: "progress",
      message: "Rendering PNG...",
    });

    const imageData = await node.exportAsync({
      format: "PNG",
      constraint: { type: "SCALE", value: 2 },
    });

    files.push({
      name: "image.png",
      content: Array.from(imageData),
    });
  }

  figma.ui.postMessage({
    type: "files-ready",
    nodeName,
    timestamp,
    files,
  });

  figma.ui.postMessage({ type: "export-complete" });
}

/**
 * Serialize a Figma node to JSON (COMPLETE, RAW, NO COMPRESSION)
 * This creates a JSON structure similar to what you'd get from Figma's REST API
 */
function serializeFigmaNode(node) {
  const data = {
    id: node.id,
    name: node.name,
    type: node.type,
    visible: node.visible,
  };

  // Basic geometric properties
  if ("x" in node) data.x = node.x;
  if ("y" in node) data.y = node.y;
  if ("width" in node) data.width = node.width;
  if ("height" in node) data.height = node.height;
  if ("rotation" in node) data.rotation = node.rotation;

  // Layout properties
  if ("layoutMode" in node) data.layoutMode = node.layoutMode;
  if ("primaryAxisSizingMode" in node)
    data.primaryAxisSizingMode = node.primaryAxisSizingMode;
  if ("counterAxisSizingMode" in node)
    data.counterAxisSizingMode = node.counterAxisSizingMode;
  if ("primaryAxisAlignItems" in node)
    data.primaryAxisAlignItems = node.primaryAxisAlignItems;
  if ("counterAxisAlignItems" in node)
    data.counterAxisAlignItems = node.counterAxisAlignItems;
  if ("paddingLeft" in node) data.paddingLeft = node.paddingLeft;
  if ("paddingRight" in node) data.paddingRight = node.paddingRight;
  if ("paddingTop" in node) data.paddingTop = node.paddingTop;
  if ("paddingBottom" in node) data.paddingBottom = node.paddingBottom;
  if ("itemSpacing" in node) data.itemSpacing = node.itemSpacing;
  if ("layoutGrow" in node) data.layoutGrow = node.layoutGrow;
  if ("layoutAlign" in node) data.layoutAlign = node.layoutAlign;
  if ("clipsContent" in node) data.clipsContent = node.clipsContent;

  // Constraints
  if ("constraints" in node) {
    data.constraints = {
      horizontal: node.constraints.horizontal,
      vertical: node.constraints.vertical,
    };
  }

  // Fills
  if ("fills" in node && node.fills !== figma.mixed) {
    data.fills = node.fills.map((fill) => serializePaint(fill));
  }

  // Strokes
  if ("strokes" in node && node.strokes !== figma.mixed) {
    data.strokes = node.strokes.map((stroke) => serializePaint(stroke));
  }
  if ("strokeWeight" in node) data.strokeWeight = node.strokeWeight;
  if ("strokeAlign" in node) data.strokeAlign = node.strokeAlign;
  if ("strokeCap" in node) data.strokeCap = node.strokeCap;
  if ("strokeJoin" in node) data.strokeJoin = node.strokeJoin;
  if ("dashPattern" in node) data.dashPattern = node.dashPattern;

  // Corner radius
  if ("cornerRadius" in node) {
    if (typeof node.cornerRadius === "number") {
      data.cornerRadius = node.cornerRadius;
    } else {
      data.cornerRadius = node.cornerRadius;
    }
  }
  if ("topLeftRadius" in node) data.topLeftRadius = node.topLeftRadius;
  if ("topRightRadius" in node) data.topRightRadius = node.topRightRadius;
  if ("bottomLeftRadius" in node) data.bottomLeftRadius = node.bottomLeftRadius;
  if ("bottomRightRadius" in node)
    data.bottomRightRadius = node.bottomRightRadius;

  // Effects (shadows, blurs)
  if ("effects" in node && node.effects.length > 0) {
    data.effects = node.effects.map((effect) => serializeEffect(effect));
  }

  // Opacity and blend mode
  if ("opacity" in node) data.opacity = node.opacity;
  if ("blendMode" in node) data.blendMode = node.blendMode;
  if ("isMask" in node) data.isMask = node.isMask;

  // Text-specific properties
  if (node.type === "TEXT") {
    data.characters = node.characters;

    // Font properties (may be mixed)
    try {
      if (node.fontName !== figma.mixed) {
        data.fontName = {
          family: node.fontName.family,
          style: node.fontName.style,
        };
      }
    } catch (e) {}

    try {
      if (node.fontSize !== figma.mixed) {
        data.fontSize = node.fontSize;
      }
    } catch (e) {}

    try {
      if (node.fontWeight !== figma.mixed) {
        data.fontWeight = node.fontWeight;
      }
    } catch (e) {}

    try {
      if (node.letterSpacing !== figma.mixed) {
        data.letterSpacing = node.letterSpacing;
      }
    } catch (e) {}

    try {
      if (node.lineHeight !== figma.mixed) {
        data.lineHeight = node.lineHeight;
      }
    } catch (e) {}

    try {
      if (node.textAlignHorizontal !== figma.mixed) {
        data.textAlignHorizontal = node.textAlignHorizontal;
      }
    } catch (e) {}

    try {
      if (node.textAlignVertical !== figma.mixed) {
        data.textAlignVertical = node.textAlignVertical;
      }
    } catch (e) {}

    try {
      if (node.textCase !== figma.mixed) {
        data.textCase = node.textCase;
      }
    } catch (e) {}

    try {
      if (node.textDecoration !== figma.mixed) {
        data.textDecoration = node.textDecoration;
      }
    } catch (e) {}

    try {
      if (node.textAutoResize !== undefined) {
        data.textAutoResize = node.textAutoResize;
      }
    } catch (e) {}
  }

  // Component/Instance properties
  if (node.type === "COMPONENT") {
    data.component = {
      id: node.id,
      name: node.name,
      description: node.description || "",
    };
  }

  if (node.type === "INSTANCE") {
    try {
      const mainComponent = node.mainComponent;
      if (mainComponent) {
        data.mainComponent = {
          id: mainComponent.id,
          name: mainComponent.name,
        };
      }
    } catch (e) {}
  }

  // Boolean operation
  if ("booleanOperation" in node) {
    data.booleanOperation = node.booleanOperation;
  }

  // Export settings
  if ("exportSettings" in node && node.exportSettings.length > 0) {
    data.exportSettings = node.exportSettings.map((setting) => ({
      format: setting.format,
      suffix: setting.suffix,
      constraint: setting.constraint,
    }));
  }

  // Recursively serialize children
  if ("children" in node && node.children.length > 0) {
    data.children = node.children.map((child) => serializeFigmaNode(child));
  }

  return data;
}

/**
 * Serialize a paint/fill object
 */
function serializePaint(paint) {
  const result = {
    type: paint.type,
    visible: paint.visible,
    opacity: paint.opacity,
    blendMode: paint.blendMode,
  };

  if (paint.type === "SOLID") {
    result.color = {
      r: paint.color.r,
      g: paint.color.g,
      b: paint.color.b,
    };
  }

  if (
    paint.type === "GRADIENT_LINEAR" ||
    paint.type === "GRADIENT_RADIAL" ||
    paint.type === "GRADIENT_ANGULAR" ||
    paint.type === "GRADIENT_DIAMOND"
  ) {
    result.gradientStops = paint.gradientStops.map((stop) => ({
      position: stop.position,
      color: {
        r: stop.color.r,
        g: stop.color.g,
        b: stop.color.b,
        a: stop.color.a,
      },
    }));

    if (paint.gradientTransform) {
      result.gradientTransform = paint.gradientTransform;
    }
  }

  if (paint.type === "IMAGE") {
    result.scaleMode = paint.scaleMode;
    if (paint.imageHash) {
      result.imageHash = paint.imageHash;
    }
  }

  return result;
}

/**
 * Serialize an effect (shadow, blur, etc.)
 */
function serializeEffect(effect) {
  const result = {
    type: effect.type,
    visible: effect.visible,
    radius: effect.radius,
  };

  if ("color" in effect) {
    result.color = {
      r: effect.color.r,
      g: effect.color.g,
      b: effect.color.b,
      a: effect.color.a,
    };
  }

  if ("offset" in effect) {
    result.offset = {
      x: effect.offset.x,
      y: effect.offset.y,
    };
  }

  if ("spread" in effect) {
    result.spread = effect.spread;
  }

  if ("blendMode" in effect) {
    result.blendMode = effect.blendMode;
  }

  return result;
}
