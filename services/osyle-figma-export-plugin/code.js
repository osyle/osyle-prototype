// ============================================================================
// Osyle → Figma Plugin  |  code.js
// ============================================================================
// ── Bridge URL ─────────────────────────────────────────────────────────────
// The plugin UI is the Osyle web app's /figma-bridge page, loaded in an
// iframe. It polls http://localhost:8765/figma-payload-latest (the figma-relay
// server) for export payloads, then forwards them to code.js via postMessage.
const bridgeUrl = "https://app.osyle.com/figma-bridge";

figma.showUI(
  `<!DOCTYPE html><html><head><meta charset="utf-8">
   <style>*{margin:0;padding:0;border:none}html,body,iframe{width:100%;height:100%;display:block}</style>
   </head><body>
   <iframe id="bridge" src="${bridgeUrl}" allow="clipboard-read; clipboard-write"></iframe>
   <script>
     // Forward pluginMessage events from the bridge iframe up to Figma's code.js
     window.addEventListener('message', function(e) {
       if (e.data && e.data.pluginMessage) {
         window.parent.postMessage(e.data, '*')
       }
     })
   </script>
   </body></html>`,
  { width: 400, height: 380, title: "Osyle" }
);
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
    if (msg.type === "OSYLE_FIGMA_EXPORT") {
      await handleOsyleDOMExport(msg);
      return;
    }
  } catch (err) {
    console.error("Plugin error:", err);
    figma.ui.postMessage({
      type: "error",
      message: (err && err.message) || "An error occurred",
    });
  }
};

// ============================================================================
// CORE: DOM → Figma reconstruction
// ============================================================================

async function handleOsyleDOMExport(payload) {
  const screens = payload.screens;
  const projectName = payload.projectName;

  if (!screens || screens.length === 0) {
    figma.ui.postMessage({
      type: "error",
      message: "No screens in export payload",
    });
    return;
  }

  figma.ui.postMessage({ type: "progress", message: "Loading fonts…" });
  await loadRequiredFonts(screens);

  const flowFrame = figma.createFrame();
  flowFrame.name = projectName || "Osyle Export";
  flowFrame.layoutMode = "HORIZONTAL";
  flowFrame.itemSpacing = 48;
  flowFrame.counterAxisAlignItems = "MIN";
  flowFrame.primaryAxisSizingMode = "AUTO";
  flowFrame.counterAxisSizingMode = "AUTO";
  flowFrame.fills = [{ type: "SOLID", color: { r: 0.96, g: 0.96, b: 0.97 } }];
  flowFrame.paddingLeft = 48;
  flowFrame.paddingRight = 48;
  flowFrame.paddingTop = 48;
  flowFrame.paddingBottom = 48;
  flowFrame.clipsContent = false;

  var builtCount = 0;
  for (var i = 0; i < screens.length; i++) {
    var screenData = screens[i];
    figma.ui.postMessage({
      type: "progress",
      message:
        'Building "' +
        screenData.screenName +
        '" (' +
        (builtCount + 1) +
        "/" +
        screens.length +
        ")…",
    });
    try {
      var screenFrame = await buildScreenFrame(screenData);
      flowFrame.appendChild(screenFrame);
      builtCount++;
    } catch (e) {
      console.error(
        'Failed to build screen "' + screenData.screenName + '":',
        e
      );
      var placeholder = figma.createFrame();
      placeholder.name = "⚠ " + screenData.screenName + " (error)";
      placeholder.resize(screenData.width || 390, screenData.height || 844);
      placeholder.fills = [{ type: "SOLID", color: { r: 1, g: 0.9, b: 0.9 } }];
      flowFrame.appendChild(placeholder);
    }
  }

  figma.currentPage.selection = [flowFrame];
  figma.viewport.scrollAndZoomIntoView([flowFrame]);
  figma.ui.postMessage({
    type: "export-complete",
    message: builtCount + " screen(s) added to Figma canvas!",
  });
}

async function buildScreenFrame(screenData) {
  var frame = figma.createFrame();
  frame.name = screenData.screenName || "Screen";
  frame.resize(screenData.width || 390, screenData.height || 844);
  frame.clipsContent = true;
  frame.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
  if (screenData.tree) {
    await buildNode(screenData.tree, frame, { x: 0, y: 0 });
  }
  return frame;
}

async function buildNode(domNode, parent, parentOffset) {
  if (!domNode) return null;

  var absX = (domNode.x || 0) - parentOffset.x;
  var absY = (domNode.y || 0) - parentOffset.y;
  var w = Math.max(domNode.width || 1, 1);
  var h = Math.max(domNode.height || 1, 1);

  // ── TEXT ──────────────────────────────────────────────────────────────────
  if (domNode.type === "TEXT" && domNode.text) {
    var textNode = figma.createText();
    textNode.name = domNode.text.slice(0, 40);

    var family = sanitizeFontFamily(domNode.styles.fontFamily || "Inter");
    var weight = domNode.styles.fontWeight || 400;
    var italic = domNode.styles.fontStyle === "italic";
    var fontStyle = resolveFontStyle(weight, italic);

    try {
      await figma.loadFontAsync({ family: family, style: fontStyle });
      textNode.fontName = { family: family, style: fontStyle };
    } catch (e) {
      try {
        await figma.loadFontAsync({ family: family, style: "Regular" });
        textNode.fontName = { family: family, style: "Regular" };
      } catch (e2) {
        await figma.loadFontAsync({ family: "Inter", style: "Regular" });
        textNode.fontName = { family: "Inter", style: "Regular" };
      }
    }

    textNode.characters = domNode.text;
    textNode.fontSize = Math.max(domNode.styles.fontSize || 14, 1);

    if (domNode.styles.lineHeight && domNode.styles.lineHeight > 0) {
      textNode.lineHeight = {
        value: domNode.styles.lineHeight,
        unit: "PIXELS",
      };
    } else {
      textNode.lineHeight = { unit: "AUTO" };
    }

    if (domNode.styles.letterSpacing && domNode.styles.letterSpacing !== 0) {
      textNode.letterSpacing = {
        value: domNode.styles.letterSpacing,
        unit: "PIXELS",
      };
    }

    var align = domNode.styles.textAlign;
    if (align === "center") textNode.textAlignHorizontal = "CENTER";
    else if (align === "right") textNode.textAlignHorizontal = "RIGHT";
    else if (align === "justify") textNode.textAlignHorizontal = "JUSTIFIED";
    else textNode.textAlignHorizontal = "LEFT";

    var decoration = domNode.styles.textDecoration;
    if (decoration && decoration.indexOf("underline") !== -1)
      textNode.textDecoration = "UNDERLINE";
    else if (decoration && decoration.indexOf("line-through") !== -1)
      textNode.textDecoration = "STRIKETHROUGH";

    var textTransform = domNode.styles.textTransform;
    if (textTransform === "uppercase") textNode.textCase = "UPPER";
    else if (textTransform === "lowercase") textNode.textCase = "LOWER";
    else if (textTransform === "capitalize") textNode.textCase = "TITLE";

    var color = domNode.styles.color;
    if (color && color.a > 0) {
      textNode.fills = [
        {
          type: "SOLID",
          color: { r: color.r, g: color.g, b: color.b },
          opacity: color.a,
        },
      ];
    } else {
      textNode.fills = [{ type: "SOLID", color: { r: 0, g: 0, b: 0 } }];
    }

    textNode.textAutoResize = "HEIGHT";
    textNode.x = Math.round(absX);
    textNode.y = Math.round(absY);
    try {
      textNode.resize(Math.max(w, 1), Math.max(h, 1));
    } catch (e) {}

    if (domNode.styles.opacity !== undefined)
      textNode.opacity = domNode.styles.opacity;

    parent.appendChild(textNode);
    return textNode;
  }

  // ── SVG ───────────────────────────────────────────────────────────────────
  if (domNode.type === "SVG" && domNode.svgString) {
    try {
      var svgNode = figma.createNodeFromSvg(domNode.svgString);
      svgNode.name = "icon";
      svgNode.x = Math.round(absX);
      svgNode.y = Math.round(absY);
      svgNode.resize(Math.max(w, 1), Math.max(h, 1));
      parent.appendChild(svgNode);
      return svgNode;
    } catch (e) {
      var svgRect = figma.createRectangle();
      svgRect.name = "icon";
      svgRect.x = Math.round(absX);
      svgRect.y = Math.round(absY);
      svgRect.resize(Math.max(w, 1), Math.max(h, 1));
      var ic = domNode.styles.iconColor;
      if (ic) {
        svgRect.fills = [
          {
            type: "SOLID",
            color: { r: ic.r, g: ic.g, b: ic.b },
            opacity: ic.a,
          },
        ];
      } else {
        svgRect.fills = [{ type: "SOLID", color: { r: 0.7, g: 0.7, b: 0.7 } }];
      }
      parent.appendChild(svgRect);
      return svgRect;
    }
  }

  // ── IMAGE ─────────────────────────────────────────────────────────────────
  if (domNode.type === "IMAGE") {
    var imgRect = figma.createRectangle();
    imgRect.name = domNode.alt ? "Image: " + domNode.alt : "Image";
    imgRect.x = Math.round(absX);
    imgRect.y = Math.round(absY);
    imgRect.resize(Math.max(w, 1), Math.max(h, 1));

    if (domNode.src && domNode.src.indexOf("data:") === 0) {
      try {
        var b64 = domNode.src.split(",")[1];
        var bytes = base64ToUint8Array(b64);
        var imageHash = figma.createImage(bytes).hash;
        var scaleMode = domNode.styles.objectFit === "contain" ? "FIT" : "FILL";
        imgRect.fills = [
          { type: "IMAGE", imageHash: imageHash, scaleMode: scaleMode },
        ];
      } catch (e) {
        imgRect.fills = [{ type: "SOLID", color: { r: 0.9, g: 0.9, b: 0.9 } }];
      }
    } else {
      imgRect.fills = [{ type: "SOLID", color: { r: 0.88, g: 0.88, b: 0.9 } }];
    }

    applyCornerRadius(imgRect, domNode.styles);
    applyEffects(imgRect, domNode.styles);
    if (domNode.styles.opacity !== undefined)
      imgRect.opacity = domNode.styles.opacity;
    parent.appendChild(imgRect);
    return imgRect;
  }

  // ── FRAME / CONTAINER ─────────────────────────────────────────────────────
  var frame = figma.createFrame();
  frame.name = (domNode.tag || "div").toLowerCase();
  frame.x = Math.round(absX);
  frame.y = Math.round(absY);
  frame.resize(Math.max(w, 1), Math.max(h, 1));
  frame.clipsContent = true;

  applyFills(frame, domNode.styles);
  applyStroke(frame, domNode.styles);
  applyCornerRadius(frame, domNode.styles);
  applyEffects(frame, domNode.styles);

  if (domNode.styles.opacity !== undefined)
    frame.opacity = domNode.styles.opacity;

  var flex = domNode.styles.flex;
  if (flex && domNode.children && domNode.children.length > 0) {
    frame.layoutMode = flex.layoutMode;
    frame.primaryAxisAlignItems = flex.primaryAxisAlignItems;
    frame.counterAxisAlignItems =
      flex.counterAxisAlignItems === "STRETCH"
        ? "MIN"
        : flex.counterAxisAlignItems;
    frame.itemSpacing = Math.max(flex.itemSpacing || 0, 0);
    frame.paddingTop = Math.max(domNode.styles.paddingTop || 0, 0);
    frame.paddingRight = Math.max(domNode.styles.paddingRight || 0, 0);
    frame.paddingBottom = Math.max(domNode.styles.paddingBottom || 0, 0);
    frame.paddingLeft = Math.max(domNode.styles.paddingLeft || 0, 0);
    frame.primaryAxisSizingMode = "FIXED";
    frame.counterAxisSizingMode = "FIXED";
  }

  if (domNode.children && domNode.children.length > 0) {
    var childOffset = { x: domNode.x || 0, y: domNode.y || 0 };
    for (var ci = 0; ci < domNode.children.length; ci++) {
      await buildNode(domNode.children[ci], frame, childOffset);
    }
  }

  parent.appendChild(frame);
  return frame;
}

// ============================================================================
// Style helpers
// ============================================================================

function applyFills(node, styles) {
  var fills = [];
  if (styles.gradient) {
    var g = styles.gradient;
    if (g.stops && g.stops.length >= 2) {
      var gradStops = g.stops.map(function (s) {
        return {
          position: s.position,
          color: { r: s.color.r, g: s.color.g, b: s.color.b, a: s.color.a },
        };
      });
      if (g.type === "GRADIENT_LINEAR") {
        var rad = ((g.angle || 180) - 90) * (Math.PI / 180);
        var dx = Math.cos(rad),
          dy = Math.sin(rad);
        fills.push({
          type: "GRADIENT_LINEAR",
          gradientTransform: [
            [dx, dy, 0.5 - dx * 0.5],
            [-dy, dx, 0.5 - -dy * 0.5],
          ],
          gradientStops: gradStops,
        });
      } else {
        fills.push({
          type: "GRADIENT_RADIAL",
          gradientTransform: [
            [0.5, 0, 0.5],
            [0, 0.5, 0.5],
          ],
          gradientStops: gradStops,
        });
      }
    }
  }
  var bg = styles.backgroundColor;
  if (bg && bg.a > 0)
    fills.push({
      type: "SOLID",
      color: { r: bg.r, g: bg.g, b: bg.b },
      opacity: bg.a,
    });
  node.fills = fills.length > 0 ? fills : [];
}

function applyStroke(node, styles) {
  if (styles.stroke && styles.stroke.color && styles.stroke.color.a > 0) {
    var sc = styles.stroke.color;
    node.strokes = [
      { type: "SOLID", color: { r: sc.r, g: sc.g, b: sc.b }, opacity: sc.a },
    ];
    node.strokeWeight = styles.stroke.width || 1;
    node.strokeAlign = styles.strokeAlign === "INSIDE" ? "INSIDE" : "CENTER";
  } else {
    node.strokes = [];
  }
}

function applyCornerRadius(node, styles) {
  if (styles.cornerRadius !== undefined && styles.cornerRadius > 0) {
    node.cornerRadius = styles.cornerRadius;
  } else if (
    styles.topLeftRadius !== undefined ||
    styles.topRightRadius !== undefined ||
    styles.bottomLeftRadius !== undefined ||
    styles.bottomRightRadius !== undefined
  ) {
    node.topLeftRadius = styles.topLeftRadius || 0;
    node.topRightRadius = styles.topRightRadius || 0;
    node.bottomLeftRadius = styles.bottomLeftRadius || 0;
    node.bottomRightRadius = styles.bottomRightRadius || 0;
  }
}

function applyEffects(node, styles) {
  var effects = [];
  if (styles.shadows && styles.shadows.length > 0) {
    for (var i = 0; i < styles.shadows.length; i++) {
      var shadow = styles.shadows[i];
      if (shadow.color && shadow.color.a > 0) {
        effects.push({
          type: "DROP_SHADOW",
          color: {
            r: shadow.color.r,
            g: shadow.color.g,
            b: shadow.color.b,
            a: shadow.color.a,
          },
          offset: { x: shadow.offsetX || 0, y: shadow.offsetY || 0 },
          radius: shadow.radius || 0,
          spread: shadow.spread || 0,
          visible: true,
          blendMode: "NORMAL",
        });
      }
    }
  }
  if (effects.length > 0) node.effects = effects;
}

// ============================================================================
// Font helpers
// ============================================================================

var FONT_WEIGHT_MAP = {
  100: "Thin",
  200: "ExtraLight",
  300: "Light",
  400: "Regular",
  500: "Medium",
  600: "SemiBold",
  700: "Bold",
  800: "ExtraBold",
  900: "Black",
};
var FONT_WEIGHT_ITALIC_MAP = {
  100: "Thin Italic",
  200: "ExtraLight Italic",
  300: "Light Italic",
  400: "Italic",
  500: "Medium Italic",
  600: "SemiBold Italic",
  700: "Bold Italic",
  800: "ExtraBold Italic",
  900: "Black Italic",
};

function resolveFontStyle(weight, italic) {
  var w = Math.round((weight || 400) / 100) * 100;
  var map = italic ? FONT_WEIGHT_ITALIC_MAP : FONT_WEIGHT_MAP;
  return map[w] || (italic ? "Italic" : "Regular");
}

var FONT_FALLBACKS = {
  "-apple-system": "Inter",
  BlinkMacSystemFont: "Inter",
  "system-ui": "Inter",
  "ui-sans-serif": "Inter",
  "sans-serif": "Inter",
  serif: "Georgia",
  monospace: "Roboto Mono",
  "ui-monospace": "Roboto Mono",
  "SFMono-Regular": "Roboto Mono",
  Menlo: "Roboto Mono",
  Monaco: "Roboto Mono",
  Consolas: "Roboto Mono",
};

function sanitizeFontFamily(family) {
  var clean = (family || "Inter").replace(/['"]/g, "").trim();
  return FONT_FALLBACKS[clean] || clean;
}

async function loadRequiredFonts(screens) {
  var needed = {};
  function collectFonts(node) {
    if (!node) return;
    if (node.type === "TEXT" && node.styles) {
      var family = sanitizeFontFamily(node.styles.fontFamily || "Inter");
      var weight = node.styles.fontWeight || 400;
      var italic = node.styles.fontStyle === "italic";
      var style = resolveFontStyle(weight, italic);
      needed[family + "|" + style] = { family: family, style: style };
    }
    if (node.children) {
      for (var i = 0; i < node.children.length; i++)
        collectFonts(node.children[i]);
    }
  }
  for (var i = 0; i < screens.length; i++) collectFonts(screens[i].tree);
  needed["Inter|Regular"] = { family: "Inter", style: "Regular" };

  var keys = Object.keys(needed);
  var loadPromises = keys.map(function (k) {
    var font = needed[k];
    return figma
      .loadFontAsync({ family: font.family, style: font.style })
      .catch(function () {
        return figma
          .loadFontAsync({ family: font.family, style: "Regular" })
          .catch(function () {
            return figma
              .loadFontAsync({ family: "Inter", style: "Regular" })
              .catch(function () {});
          });
      });
  });
  await Promise.all(loadPromises);
}

// ============================================================================
// base64 → Uint8Array
// ============================================================================

function base64ToUint8Array(base64) {
  var chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  var lookup = new Uint8Array(256);
  for (var i = 0; i < chars.length; i++) lookup[chars.charCodeAt(i)] = i;
  var len = base64.length;
  var bufLen = Math.floor(len * 0.75);
  if (base64[len - 1] === "=") bufLen--;
  if (base64[len - 2] === "=") bufLen--;
  var arr = new Uint8Array(bufLen);
  var p = 0;
  for (var i = 0; i < len; i += 4) {
    var a = lookup[base64.charCodeAt(i)],
      b = lookup[base64.charCodeAt(i + 1)];
    var c = lookup[base64.charCodeAt(i + 2)],
      d = lookup[base64.charCodeAt(i + 3)];
    arr[p++] = (a << 2) | (b >> 4);
    if (i + 2 < len && base64[i + 2] !== "=")
      arr[p++] = ((b & 15) << 4) | (c >> 2);
    if (i + 3 < len && base64[i + 3] !== "=") arr[p++] = ((c & 3) << 6) | d;
  }
  return arr;
}

// ============================================================================
// Legacy: Send to Osyle
// ============================================================================

async function handleSendToOsyle() {
  var selection = figma.currentPage.selection;
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
  var node = selection[0];
  var fileKey = figma.fileKey;
  if (!fileKey) {
    figma.ui.postMessage({ type: "error", message: "Could not get file key." });
    return;
  }
  figma.ui.postMessage({ type: "progress", message: "Sending to Osyle..." });
  figma.ui.postMessage({
    type: "send-to-osyle-data",
    fileKey: fileKey,
    nodeId: node.id,
    fileName: node.name || "Untitled",
  });
}

// ============================================================================
// Legacy: ZIP export
// ============================================================================

async function handleExport(exportJson, exportPng) {
  var selection = figma.currentPage.selection;
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
  var node = selection[0];
  var nodeName = node.name.replace(/[^a-zA-Z0-9]/g, "_");
  var timestamp = new Date().getTime();
  var files = [];

  if (exportJson) {
    figma.ui.postMessage({
      type: "progress",
      message: "Serializing Figma JSON...",
    });
    var imageNodes = findImageNodes(node);
    var imageExports = {};
    for (var i = 0; i < imageNodes.length; i++) {
      var imgNode = imageNodes[i];
      try {
        var imgData = await imgNode.exportAsync({
          format: "PNG",
          constraint: { type: "SCALE", value: 0.25 },
        });
        if (imgData && imgData.length > 0)
          imageExports[imgNode.id] = arrayBufferToBase64(imgData);
      } catch (e) {}
    }
    var jsonData = serializeFigmaNode(node);
    jsonData._imageExports = imageExports;
    var jsonString = JSON.stringify(jsonData, null, 2);
    var bytes = [];
    for (var j = 0; j < jsonString.length; j++) {
      var ch = jsonString.charCodeAt(j);
      if (ch < 128) bytes.push(ch);
      else if (ch < 2048) bytes.push((ch >> 6) | 192, (ch & 63) | 128);
      else
        bytes.push((ch >> 12) | 224, ((ch >> 6) & 63) | 128, (ch & 63) | 128);
    }
    files.push({ name: "figma.json", content: bytes });
  }

  if (exportPng) {
    figma.ui.postMessage({ type: "progress", message: "Rendering PNG..." });
    var imageData = await node.exportAsync({
      format: "PNG",
      constraint: { type: "SCALE", value: 2 },
    });
    files.push({ name: "image.png", content: Array.from(imageData) });
  }

  figma.ui.postMessage({
    type: "files-ready",
    nodeName: nodeName,
    timestamp: timestamp,
    files: files,
  });
  figma.ui.postMessage({ type: "export-complete" });
}

function arrayBufferToBase64(buffer) {
  var bytes = new Uint8Array(buffer),
    len = bytes.byteLength,
    binary = "";
  var b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  for (var i = 0; i < len; i += 3) {
    var b1 = bytes[i],
      b2 = i + 1 < len ? bytes[i + 1] : 0,
      b3 = i + 2 < len ? bytes[i + 2] : 0;
    binary += b64[b1 >> 2] + b64[((b1 & 3) << 4) | (b2 >> 4)];
    binary += i + 1 < len ? b64[((b2 & 15) << 2) | (b3 >> 6)] : "=";
    binary += i + 2 < len ? b64[b3 & 63] : "=";
  }
  return binary;
}

function findImageNodes(node) {
  var arr = [];
  function t(n) {
    if ("fills" in n && n.fills !== figma.mixed && Array.isArray(n.fills)) {
      for (var i = 0; i < n.fills.length; i++) {
        if (n.fills[i].type === "IMAGE" && n.fills[i].visible !== false) {
          arr.push(n);
          break;
        }
      }
    }
    if ("children" in n) {
      for (var i = 0; i < n.children.length; i++) t(n.children[i]);
    }
  }
  t(node);
  return arr;
}

function serializeFigmaNode(node) {
  var data = {
    id: node.id,
    name: node.name,
    type: node.type,
    visible: node.visible,
  };
  if ("x" in node) data.x = node.x;
  if ("y" in node) data.y = node.y;
  if ("width" in node) data.width = node.width;
  if ("height" in node) data.height = node.height;
  if ("layoutMode" in node) data.layoutMode = node.layoutMode;
  if ("fills" in node && node.fills !== figma.mixed)
    data.fills = node.fills.map(serializePaint);
  if ("strokes" in node && node.strokes !== figma.mixed)
    data.strokes = node.strokes.map(serializePaint);
  if ("strokeWeight" in node) data.strokeWeight = node.strokeWeight;
  if ("cornerRadius" in node) data.cornerRadius = node.cornerRadius;
  if ("effects" in node && node.effects.length > 0)
    data.effects = node.effects.map(serializeEffect);
  if ("opacity" in node) data.opacity = node.opacity;
  if (node.type === "TEXT") {
    data.characters = node.characters;
    try {
      if (node.fontName !== figma.mixed) data.fontName = node.fontName;
    } catch (e) {}
    try {
      if (node.fontSize !== figma.mixed) data.fontSize = node.fontSize;
    } catch (e) {}
  }
  if ("children" in node && node.children.length > 0)
    data.children = node.children.map(serializeFigmaNode);
  return data;
}

function serializePaint(p) {
  var r = {
    type: p.type,
    visible: p.visible,
    opacity: p.opacity,
    blendMode: p.blendMode,
  };
  if (p.type === "SOLID")
    r.color = { r: p.color.r, g: p.color.g, b: p.color.b };
  if (p.type === "IMAGE") {
    r.scaleMode = p.scaleMode;
    if (p.imageHash) r.imageHash = p.imageHash;
  }
  return r;
}

function serializeEffect(e) {
  var r = { type: e.type, visible: e.visible, radius: e.radius };
  if ("color" in e)
    r.color = { r: e.color.r, g: e.color.g, b: e.color.b, a: e.color.a };
  if ("offset" in e) r.offset = { x: e.offset.x, y: e.offset.y };
  if ("spread" in e) r.spread = e.spread;
  return r;
}
