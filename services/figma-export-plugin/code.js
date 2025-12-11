// ============================================================================
// OSYLE FIGMA PLUGIN v3 - DESIGN INTELLIGENCE EXTRACTION
// ============================================================================
// Ultra-defensive version for maximum Figma API compatibility
// ============================================================================

// ============================================================================
// SAFE VALUE HELPERS
// ============================================================================

function safeNumber(value, defaultValue) {
  if (value === null || value === undefined) return defaultValue;
  if (typeof value === "symbol") return defaultValue;
  var num = Number(value);
  if (isNaN(num)) return defaultValue;
  return num;
}

function safeString(value, defaultValue) {
  if (value === null || value === undefined) return defaultValue;
  if (typeof value === "symbol") return defaultValue;
  return String(value);
}

function safeObject(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "symbol") return null;
  if (typeof value !== "object") return null;
  return value;
}

function safeArray(value) {
  if (!value) return [];
  if (typeof value === "symbol") return [];
  if (!Array.isArray(value)) return [];
  return value;
}

// ============================================================================
// DESIGN INTELLIGENCE EXTRACTION
// ============================================================================

function extractDesignIntelligence(node) {
  // Safety check
  if (!node || typeof node !== "object") {
    return { type: "UNKNOWN", name: "error" };
  }

  // Parse fills to color string
  function extractColor(fills) {
    try {
      if (!fills || !fills.length) return null;
      var fill = fills[0];
      if (!fill || fill.type !== "SOLID") return null;

      var paint = safeObject(fill);
      if (!paint) return null;

      var c = safeObject(paint.color) || {};
      var r = Math.round(safeNumber(c.r, 0) * 255);
      var g = Math.round(safeNumber(c.g, 0) * 255);
      var b = Math.round(safeNumber(c.b, 0) * 255);
      var opacity = safeNumber(paint.opacity, 1);

      if (opacity < 1) {
        return "rgba(" + r + "," + g + "," + b + "," + opacity.toFixed(2) + ")";
      }
      return "rgb(" + r + "," + g + "," + b + ")";
    } catch (e) {
      return null;
    }
  }

  // Extract gradient information
  function extractGradient(fills) {
    try {
      if (!fills || !fills.length) return null;

      var gradientFill = null;
      for (var i = 0; i < fills.length; i++) {
        var f = fills[i];
        if (!f) continue;
        var type = safeString(f.type, "");
        if (
          type === "GRADIENT_LINEAR" ||
          type === "GRADIENT_RADIAL" ||
          type === "GRADIENT_ANGULAR"
        ) {
          gradientFill = f;
          break;
        }
      }

      if (!gradientFill) return null;

      var stops = [];
      var gradStops = safeArray(gradientFill.gradientStops);

      for (var j = 0; j < gradStops.length; j++) {
        var stop = safeObject(gradStops[j]);
        if (!stop) continue;

        var c = safeObject(stop.color) || {};
        var r = Math.round(safeNumber(c.r, 0) * 255);
        var g = Math.round(safeNumber(c.g, 0) * 255);
        var b = Math.round(safeNumber(c.b, 0) * 255);

        stops.push({
          position: safeNumber(stop.position, 0),
          color: "rgb(" + r + "," + g + "," + b + ")",
          alpha: safeNumber(c.a, 1),
        });
      }

      return {
        type: safeString(gradientFill.type, "unknown"),
        stops: stops,
        angle: null,
      };
    } catch (e) {
      return null;
    }
  }

  // Build layout intelligence
  var layout = {};

  try {
    var layoutMode = safeString(node.layoutMode, "NONE");
    if (layoutMode && layoutMode !== "NONE") {
      layout.mode = layoutMode;
      layout.spacing = safeNumber(node.itemSpacing, 0);

      var primaryAlign = safeString(node.primaryAxisAlignItems, "");
      if (primaryAlign) {
        layout.primary_align = primaryAlign;
      }

      var counterAlign = safeString(node.counterAxisAlignItems, "");
      if (counterAlign) {
        layout.counter_align = counterAlign;
      }

      var primarySizing = safeString(node.primaryAxisSizingMode, "");
      if (primarySizing) {
        layout.primary_sizing = primarySizing;
      }

      var counterSizing = safeString(node.counterAxisSizingMode, "");
      if (counterSizing) {
        layout.counter_sizing = counterSizing;
      }

      var padTop = safeNumber(node.paddingTop, 0);
      var padRight = safeNumber(node.paddingRight, 0);
      var padBottom = safeNumber(node.paddingBottom, 0);
      var padLeft = safeNumber(node.paddingLeft, 0);

      if (padTop || padRight || padBottom || padLeft) {
        layout.padding = [padTop, padRight, padBottom, padLeft];
      }
    }
  } catch (e) {
    // Skip layout if error
  }

  // Build style intelligence
  var style = {};

  try {
    var width = safeNumber(node.width, null);
    if (width !== null) {
      style.width = Math.round(width);
    }

    var height = safeNumber(node.height, null);
    if (height !== null) {
      style.height = Math.round(height);
    }

    var x = safeNumber(node.x, null);
    var y = safeNumber(node.y, null);
    if (x !== null && y !== null) {
      style.position = {
        x: Math.round(x),
        y: Math.round(y),
      };
    }

    var fillColor = extractColor(safeArray(node.fills));
    if (fillColor) {
      style.fill = fillColor;
    }

    var gradient = extractGradient(safeArray(node.fills));
    if (gradient) {
      style.gradient = gradient;
    }

    var strokeColor = extractColor(safeArray(node.strokes));
    var strokeWeight = safeNumber(node.strokeWeight, 0);
    if (strokeColor && strokeWeight) {
      style.stroke = {
        color: strokeColor,
        weight: strokeWeight,
      };
    }

    var cornerRadius = safeNumber(node.cornerRadius, 0);
    if (cornerRadius > 0) {
      style.corner_radius = cornerRadius;
    }

    var tlr = safeNumber(node.topLeftRadius, 0);
    var trr = safeNumber(node.topRightRadius, 0);
    var brr = safeNumber(node.bottomRightRadius, 0);
    var blr = safeNumber(node.bottomLeftRadius, 0);

    if (tlr || trr || brr || blr) {
      style.corner_radii = [tlr, trr, brr, blr];
    }
  } catch (e) {
    // Skip style if error
  }

  // Typography
  var nodeType = safeString(node.type, "");
  if (nodeType === "TEXT") {
    try {
      var fontSize = safeNumber(node.fontSize, null);
      if (fontSize !== null) {
        style.font_size = fontSize;
      }

      var fontName = safeObject(node.fontName);
      if (fontName) {
        var family = safeString(fontName.family, "");
        var weight = safeString(fontName.style, "");
        if (family) style.font_family = family;
        if (weight) style.font_weight = weight;
      }

      // Handle lineHeight which can be an object or number
      var lineHeight = node.lineHeight;
      if (
        lineHeight !== null &&
        lineHeight !== undefined &&
        typeof lineHeight !== "symbol"
      ) {
        if (typeof lineHeight === "object" && lineHeight.value !== undefined) {
          style.line_height = safeNumber(lineHeight.value, null);
        } else {
          style.line_height = safeNumber(lineHeight, null);
        }
      }

      // Handle letterSpacing which can be an object or number
      var letterSpacing = node.letterSpacing;
      if (
        letterSpacing !== null &&
        letterSpacing !== undefined &&
        typeof letterSpacing !== "symbol"
      ) {
        if (
          typeof letterSpacing === "object" &&
          letterSpacing.value !== undefined
        ) {
          style.letter_spacing = safeNumber(letterSpacing.value, null);
        } else {
          style.letter_spacing = safeNumber(letterSpacing, null);
        }
      }

      var textAlign = safeString(node.textAlignHorizontal, "");
      if (textAlign) {
        style.text_align = textAlign;
      }

      var textColor = extractColor(safeArray(node.fills));
      if (textColor) {
        style.color = textColor;
      }
    } catch (e) {
      // Skip typography if error
    }
  }

  // Effects
  try {
    var effects = safeArray(node.effects);
    if (effects.length > 0) {
      var effectsList = [];

      for (var k = 0; k < effects.length; k++) {
        var effect = safeObject(effects[k]);
        if (!effect) continue;

        var visible = effect.visible;
        if (visible === false) continue;

        var effectType = safeString(effect.type, "");
        if (!effectType) continue;

        var e = { type: effectType };

        if (effectType.indexOf("SHADOW") >= 0) {
          var offset = safeObject(effect.offset);
          if (offset) {
            e.offset = {
              x: safeNumber(offset.x, 0),
              y: safeNumber(offset.y, 0),
            };
          } else {
            e.offset = { x: 0, y: 0 };
          }

          e.radius = safeNumber(effect.radius, 0);
          e.spread = safeNumber(effect.spread, 0);

          var effectColor = safeObject(effect.color);
          if (effectColor) {
            var r = Math.round(safeNumber(effectColor.r, 0) * 255);
            var g = Math.round(safeNumber(effectColor.g, 0) * 255);
            var b = Math.round(safeNumber(effectColor.b, 0) * 255);
            var a = safeNumber(effectColor.a, 1);
            e.color = "rgba(" + r + "," + g + "," + b + "," + a + ")";
          }
        } else if (effectType.indexOf("BLUR") >= 0) {
          e.radius = safeNumber(effect.radius, 0);
        }

        effectsList.push(e);
      }

      if (effectsList.length > 0) {
        style.effects = effectsList;
      }
    }
  } catch (e) {
    // Skip effects if error
  }

  try {
    var opacity = safeNumber(node.opacity, 1);
    if (opacity < 1) {
      style.opacity = Math.round(opacity * 100) / 100;
    }

    var blendMode = safeString(node.blendMode, "NORMAL");
    if (blendMode && blendMode !== "NORMAL") {
      style.blend_mode = blendMode;
    }
  } catch (e) {
    // Skip if error
  }

  // Build compressed node
  var compressed = {
    type: safeString(node.type, "UNKNOWN"),
    name: safeString(node.name, "unnamed"),
  };

  if (Object.keys(layout).length > 0) {
    compressed.layout = layout;
  }

  if (Object.keys(style).length > 0) {
    compressed.style = style;
  }

  // Text content
  if (nodeType === "TEXT") {
    try {
      var chars = safeString(node.characters, "");
      if (chars) {
        compressed.text =
          chars.length > 200 ? chars.substring(0, 200) + "..." : chars;
      }
    } catch (e) {
      // Skip text if error
    }
  }

  // Constraints
  try {
    var constraints = safeObject(node.constraints);
    if (constraints) {
      var horizontal = safeString(constraints.horizontal, "MIN");
      var vertical = safeString(constraints.vertical, "MIN");

      if (horizontal !== "MIN" || vertical !== "MIN") {
        compressed.constraints = {
          horizontal: horizontal,
          vertical: vertical,
        };
      }
    }
  } catch (e) {
    // Skip constraints if error
  }

  // Children (recursive)
  try {
    var children = safeArray(node.children);
    if (children.length > 0) {
      compressed.children = [];
      for (var m = 0; m < children.length; m++) {
        var child = children[m];
        if (child) {
          compressed.children.push(extractDesignIntelligence(child));
        }
      }
    }
  } catch (e) {
    // Skip children if error
  }

  return compressed;
}

// ============================================================================
// METADATA EXTRACTION
// ============================================================================

function extractDesignMetadata(node) {
  var metadata = {
    name: safeString(node.name, "unnamed"),
    dimensions: {
      width: Math.round(safeNumber(node.width, 0)),
      height: Math.round(safeNumber(node.height, 0)),
    },
    total_nodes: 0,
    depth: 0,
    has_auto_layout: false,
    has_gradients: false,
    has_effects: false,
    has_text: false,
  };

  function analyzeNode(n, depth) {
    if (!n) return;
    if (depth === undefined) depth = 0;

    try {
      metadata.total_nodes++;
      metadata.depth = Math.max(metadata.depth, depth);

      var layoutMode = safeString(n.layoutMode, "NONE");
      if (layoutMode && layoutMode !== "NONE") {
        metadata.has_auto_layout = true;
      }

      var fills = safeArray(n.fills);
      for (var i = 0; i < fills.length; i++) {
        var f = fills[i];
        if (!f) continue;
        var type = safeString(f.type, "");
        if (
          type === "GRADIENT_LINEAR" ||
          type === "GRADIENT_RADIAL" ||
          type === "GRADIENT_ANGULAR"
        ) {
          metadata.has_gradients = true;
          break;
        }
      }

      var effects = safeArray(n.effects);
      if (effects.length > 0) {
        metadata.has_effects = true;
      }

      var nodeType = safeString(n.type, "");
      if (nodeType === "TEXT") {
        metadata.has_text = true;
      }

      var children = safeArray(n.children);
      for (var j = 0; j < children.length; j++) {
        if (children[j]) {
          analyzeNode(children[j], depth + 1);
        }
      }
    } catch (e) {
      // Continue even if error
    }
  }

  analyzeNode(node);

  return metadata;
}

// ============================================================================
// HELPER: Encode string to Uint8Array
// ============================================================================

function encodeUTF8(str) {
  try {
    if (typeof TextEncoder !== "undefined") {
      var encoder = new TextEncoder();
      return encoder.encode(str);
    }
  } catch (e) {
    // Fall through to manual encoding
  }

  // Manual encoding fallback
  var arr = [];
  for (var i = 0; i < str.length; i++) {
    var code = str.charCodeAt(i);
    if (code < 128) {
      arr.push(code);
    } else if (code < 2048) {
      arr.push(192 | (code >> 6));
      arr.push(128 | (code & 63));
    } else if (code < 65536) {
      arr.push(224 | (code >> 12));
      arr.push(128 | ((code >> 6) & 63));
      arr.push(128 | (code & 63));
    } else {
      arr.push(240 | (code >> 18));
      arr.push(128 | ((code >> 12) & 63));
      arr.push(128 | ((code >> 6) & 63));
      arr.push(128 | (code & 63));
    }
  }
  return new Uint8Array(arr);
}

// ============================================================================
// PLUGIN UI LOGIC
// ============================================================================

figma.showUI(__html__, {
  visible: true,
  width: 360,
  height: 520,
  themeColors: true,
});

figma.ui.onmessage = async function (msg) {
  if (msg.type === "export") {
    var selection = figma.currentPage.selection;
    var exportJson = msg.exportJson;
    var exportPng = msg.exportPng;

    if (!selection.length) {
      figma.ui.postMessage({
        type: "error",
        message: "Please select at least one frame or component.",
      });
      return;
    }

    if (!exportJson && !exportPng) {
      figma.ui.postMessage({
        type: "error",
        message: "Select at least one export option (JSON and/or PNG).",
      });
      return;
    }

    for (var i = 0; i < selection.length; i++) {
      var node = selection[i];
      var nodeName = safeString(node.name, "unnamed").replace(
        /[\\/:*?"<>|]/g,
        "_"
      );
      var files = [];

      try {
        figma.ui.postMessage({
          type: "progress",
          message: "Processing " + nodeName + "...",
        });

        // JSON export with design intelligence
        if (exportJson) {
          var metadata = extractDesignMetadata(node);
          var designData = extractDesignIntelligence(node);

          var output = {
            version: "3.0",
            metadata: metadata,
            design: designData,
          };

          var jsonString = JSON.stringify(output, null, 2);
          var jsonBytes = encodeUTF8(jsonString);
          files.push({ name: "figma.json", content: jsonBytes });

          figma.ui.postMessage({
            type: "info",
            message:
              "JSON: " +
              Math.round(jsonBytes.length / 1024) +
              "KB, " +
              metadata.total_nodes +
              " nodes",
          });
        }

        // PNG export
        if (exportPng) {
          var pngBytes = await node.exportAsync({
            format: "PNG",
            constraint: { type: "SCALE", value: 2 },
          });
          files.push({ name: "image.png", content: pngBytes });

          figma.ui.postMessage({
            type: "info",
            message: "PNG: " + Math.round(pngBytes.length / 1024) + "KB",
          });
        }

        // Send all files for this node
        figma.ui.postMessage({
          type: "files-ready",
          nodeName: nodeName,
          files: files,
        });
      } catch (err) {
        figma.ui.postMessage({
          type: "error",
          message:
            "Failed to export " +
            nodeName +
            ": " +
            (err.message || "Unknown error"),
        });
        console.error("Export error:", err);
      }
    }

    figma.ui.postMessage({
      type: "export-complete",
      message: "Successfully exported " + selection.length + " design(s)!",
    });
  }

  if (msg.type === "cancel") {
    figma.closePlugin();
  }
};
