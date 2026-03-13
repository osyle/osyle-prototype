figma.showUI(__html__, { width: 360, height: 520, title: "Osyle" });

figma.ui.onmessage = async function (msg) {
  try {
    if (msg.type === "cancel") {
      figma.closePlugin();
      return;
    }
    if (msg.type === "OSYLE_FIGMA_EXPORT") {
      await handleOsyleDOMExport(msg);
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
  } catch (err) {
    figma.ui.postMessage({
      type: "error",
      message: (err && err.message) || "An error occurred",
    });
  }
};

async function handleOsyleDOMExport(payload) {
  var screens = payload.screens;
  if (!screens || screens.length === 0) {
    figma.ui.postMessage({
      type: "error",
      message: "No screens in export payload",
    });
    return;
  }
  figma.ui.postMessage({ type: "progress", message: "Loading fonts..." });
  await loadRequiredFonts(screens);
  var flowFrame = figma.createFrame();
  flowFrame.name = payload.projectName || "Osyle Export";
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
    var s = screens[i];
    figma.ui.postMessage({
      type: "progress",
      message:
        'Building "' +
        s.screenName +
        '" (' +
        (builtCount + 1) +
        "/" +
        screens.length +
        ")...",
    });
    try {
      var sf = await buildScreenFrame(s);
      flowFrame.appendChild(sf);
      builtCount++;
    } catch (e) {
      var ph = figma.createFrame();
      ph.name = "ERROR: " + s.screenName;
      ph.resize(s.width || 390, s.height || 844);
      ph.fills = [{ type: "SOLID", color: { r: 1, g: 0.9, b: 0.9 } }];
      flowFrame.appendChild(ph);
    }
  }
  figma.currentPage.selection = [flowFrame];
  figma.viewport.scrollAndZoomIntoView([flowFrame]);
  figma.ui.postMessage({
    type: "export-complete",
    message: builtCount + " screen(s) added to Figma canvas!",
  });
}

async function buildScreenFrame(sd) {
  var frame = figma.createFrame();
  frame.name = sd.screenName || "Screen";
  frame.resize(sd.width || 390, sd.height || 844);
  frame.clipsContent = true;
  frame.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
  if (sd.tree) await buildNode(sd.tree, frame, { x: 0, y: 0 });
  return frame;
}

async function buildNode(n, parent, po) {
  if (!n) return null;
  var ax = (n.x || 0) - po.x,
    ay = (n.y || 0) - po.y;
  var w = Math.max(n.width || 1, 1),
    h = Math.max(n.height || 1, 1);

  if (n.type === "TEXT" && n.text) {
    var t = figma.createText();
    t.name = n.text.slice(0, 40);
    var fam = sanitizeFontFamily(n.styles.fontFamily || "Inter");
    var sty = resolveFontStyle(
      n.styles.fontWeight || 400,
      n.styles.fontStyle === "italic"
    );
    try {
      await figma.loadFontAsync({ family: fam, style: sty });
      t.fontName = { family: fam, style: sty };
    } catch (e) {
      try {
        await figma.loadFontAsync({ family: fam, style: "Regular" });
        t.fontName = { family: fam, style: "Regular" };
      } catch (e2) {
        await figma.loadFontAsync({ family: "Inter", style: "Regular" });
        t.fontName = { family: "Inter", style: "Regular" };
      }
    }
    t.characters = n.text;
    t.fontSize = Math.max(n.styles.fontSize || 14, 1);
    if (n.styles.lineHeight && n.styles.lineHeight > 0)
      t.lineHeight = { value: n.styles.lineHeight, unit: "PIXELS" };
    else t.lineHeight = { unit: "AUTO" };
    if (n.styles.letterSpacing && n.styles.letterSpacing !== 0)
      t.letterSpacing = { value: n.styles.letterSpacing, unit: "PIXELS" };
    var align = n.styles.textAlign;
    if (align === "center") t.textAlignHorizontal = "CENTER";
    else if (align === "right") t.textAlignHorizontal = "RIGHT";
    else if (align === "justify") t.textAlignHorizontal = "JUSTIFIED";
    else t.textAlignHorizontal = "LEFT";
    var dec = n.styles.textDecoration;
    if (dec && dec.indexOf("underline") !== -1) t.textDecoration = "UNDERLINE";
    else if (dec && dec.indexOf("line-through") !== -1)
      t.textDecoration = "STRIKETHROUGH";
    var tt = n.styles.textTransform;
    if (tt === "uppercase") t.textCase = "UPPER";
    else if (tt === "lowercase") t.textCase = "LOWER";
    else if (tt === "capitalize") t.textCase = "TITLE";
    var c = n.styles.color;
    if (c && c.a > 0)
      t.fills = [
        { type: "SOLID", color: { r: c.r, g: c.g, b: c.b }, opacity: c.a },
      ];
    else t.fills = [{ type: "SOLID", color: { r: 0, g: 0, b: 0 } }];
    t.textAutoResize = "HEIGHT";
    t.x = Math.round(ax);
    t.y = Math.round(ay);
    try {
      t.resize(Math.max(w, 1), Math.max(h, 1));
    } catch (e) {}
    if (n.styles.opacity !== undefined) t.opacity = n.styles.opacity;
    parent.appendChild(t);
    return t;
  }

  if (n.type === "SVG" && n.svgString) {
    try {
      var sv = figma.createNodeFromSvg(n.svgString);
      sv.name = "icon";
      sv.x = Math.round(ax);
      sv.y = Math.round(ay);
      sv.resize(Math.max(w, 1), Math.max(h, 1));
      parent.appendChild(sv);
      return sv;
    } catch (e) {
      var sr = figma.createRectangle();
      sr.name = "icon";
      sr.x = Math.round(ax);
      sr.y = Math.round(ay);
      sr.resize(Math.max(w, 1), Math.max(h, 1));
      var ic = n.styles.iconColor;
      sr.fills = ic
        ? [
            {
              type: "SOLID",
              color: { r: ic.r, g: ic.g, b: ic.b },
              opacity: ic.a,
            },
          ]
        : [{ type: "SOLID", color: { r: 0.7, g: 0.7, b: 0.7 } }];
      parent.appendChild(sr);
      return sr;
    }
  }

  if (n.type === "IMAGE") {
    var ir = figma.createRectangle();
    ir.name = n.alt ? "Image: " + n.alt : "Image";
    ir.x = Math.round(ax);
    ir.y = Math.round(ay);
    ir.resize(Math.max(w, 1), Math.max(h, 1));
    if (n.src && n.src.indexOf("data:") === 0) {
      try {
        var bytes = base64ToUint8Array(n.src.split(",")[1]);
        var hash = figma.createImage(bytes).hash;
        ir.fills = [
          {
            type: "IMAGE",
            imageHash: hash,
            scaleMode: n.styles.objectFit === "contain" ? "FIT" : "FILL",
          },
        ];
      } catch (e) {
        ir.fills = [{ type: "SOLID", color: { r: 0.9, g: 0.9, b: 0.9 } }];
      }
    } else {
      ir.fills = [{ type: "SOLID", color: { r: 0.88, g: 0.88, b: 0.9 } }];
    }
    applyCornerRadius(ir, n.styles);
    applyEffects(ir, n.styles);
    if (n.styles.opacity !== undefined) ir.opacity = n.styles.opacity;
    parent.appendChild(ir);
    return ir;
  }

  var f = figma.createFrame();
  f.name = (n.tag || "div").toLowerCase();
  f.x = Math.round(ax);
  f.y = Math.round(ay);
  f.resize(Math.max(w, 1), Math.max(h, 1));
  f.clipsContent = true;
  applyFills(f, n.styles);
  applyStroke(f, n.styles);
  applyCornerRadius(f, n.styles);
  applyEffects(f, n.styles);
  if (n.styles.opacity !== undefined) f.opacity = n.styles.opacity;
  var flex = n.styles.flex;
  if (flex && n.children && n.children.length > 0) {
    f.layoutMode = flex.layoutMode;
    f.primaryAxisAlignItems = flex.primaryAxisAlignItems;
    f.counterAxisAlignItems =
      flex.counterAxisAlignItems === "STRETCH"
        ? "MIN"
        : flex.counterAxisAlignItems;
    f.itemSpacing = Math.max(flex.itemSpacing || 0, 0);
    f.paddingTop = Math.max(n.styles.paddingTop || 0, 0);
    f.paddingRight = Math.max(n.styles.paddingRight || 0, 0);
    f.paddingBottom = Math.max(n.styles.paddingBottom || 0, 0);
    f.paddingLeft = Math.max(n.styles.paddingLeft || 0, 0);
    f.primaryAxisSizingMode = "FIXED";
    f.counterAxisSizingMode = "FIXED";
  }
  if (n.children && n.children.length > 0) {
    var co = { x: n.x || 0, y: n.y || 0 };
    for (var ci = 0; ci < n.children.length; ci++)
      await buildNode(n.children[ci], f, co);
  }
  parent.appendChild(f);
  return f;
}

async function handleSendToOsyle() {
  var sel = figma.currentPage.selection;
  if (sel.length === 0) {
    figma.ui.postMessage({
      type: "error",
      message: "Please select a frame or component",
    });
    return;
  }
  if (sel.length > 1) {
    figma.ui.postMessage({
      type: "error",
      message: "Please select only one frame or component",
    });
    return;
  }
  var node = sel[0];
  figma.ui.postMessage({
    type: "send-to-osyle-progress",
    message: "Serializing node tree...",
  });
  var imageNodes = findImageNodes(node);
  var imageExports = {};
  if (imageNodes.length > 0) {
    figma.ui.postMessage({
      type: "send-to-osyle-progress",
      message: "Exporting " + imageNodes.length + " embedded image(s)...",
    });
    for (var i = 0; i < imageNodes.length; i++) {
      try {
        var d = await imageNodes[i].exportAsync({
          format: "PNG",
          constraint: { type: "SCALE", value: 0.25 },
        });
        if (d && d.length > 0)
          imageExports[imageNodes[i].id] = arrayBufferToBase64(d);
      } catch (e) {}
    }
  }
  var figmaJson = serializeFigmaNode(node);
  figmaJson._imageExports = imageExports;
  // Sanitize via JSON round-trip — strips any Symbol values (e.g. figma.mixed) that
  // survive deep in the tree and would cause "Cannot unwrap symbol" in postMessage.
  var safeJson = JSON.parse(JSON.stringify(figmaJson));
  figma.ui.postMessage({
    type: "send-to-osyle-progress",
    message: "Rendering preview image...",
  });
  var png = await node.exportAsync({
    format: "PNG",
    constraint: { type: "SCALE", value: 2 },
  });
  var token = "fi-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
  figma.ui.postMessage({
    type: "send-to-osyle-data",
    token: token,
    frameName: node.name || "Untitled",
    figmaJson: safeJson,
    imagePng: arrayBufferToBase64(png),
  });
}

async function handleExport(exportJson, exportPng) {
  var sel = figma.currentPage.selection;
  if (sel.length === 0) {
    figma.ui.postMessage({
      type: "error",
      message: "Please select a frame or component",
    });
    return;
  }
  if (sel.length > 1) {
    figma.ui.postMessage({
      type: "error",
      message: "Please select only one frame or component",
    });
    return;
  }
  var node = sel[0];
  var nodeName = node.name.replace(/[^a-zA-Z0-9]/g, "_");
  var timestamp = new Date().getTime();
  var files = [];
  if (exportJson) {
    figma.ui.postMessage({
      type: "progress",
      message: "Serializing Figma JSON...",
    });
    var imgNodes = findImageNodes(node);
    var imgExports = {};
    for (var i = 0; i < imgNodes.length; i++) {
      try {
        var d = await imgNodes[i].exportAsync({
          format: "PNG",
          constraint: { type: "SCALE", value: 0.25 },
        });
        if (d && d.length > 0)
          imgExports[imgNodes[i].id] = arrayBufferToBase64(d);
      } catch (e) {}
    }
    var jsonData = serializeFigmaNode(node);
    jsonData._imageExports = imgExports;
    var str = JSON.stringify(jsonData, null, 2);
    var bytes = [];
    for (var j = 0; j < str.length; j++) {
      var ch = str.charCodeAt(j);
      if (ch < 128) bytes.push(ch);
      else if (ch < 2048) bytes.push((ch >> 6) | 192, (ch & 63) | 128);
      else
        bytes.push((ch >> 12) | 224, ((ch >> 6) & 63) | 128, (ch & 63) | 128);
    }
    files.push({ name: "figma.json", content: bytes });
  }
  if (exportPng) {
    figma.ui.postMessage({ type: "progress", message: "Rendering PNG..." });
    var imgData = await node.exportAsync({
      format: "PNG",
      constraint: { type: "SCALE", value: 2 },
    });
    files.push({ name: "image.png", content: Array.from(imgData) });
  }
  figma.ui.postMessage({
    type: "files-ready",
    nodeName: nodeName,
    timestamp: timestamp,
    files: files,
  });
  figma.ui.postMessage({ type: "zip-done" });
}

function applyFills(node, s) {
  var fills = [];
  if (s.gradient && s.gradient.stops && s.gradient.stops.length >= 2) {
    var g = s.gradient;
    var gs = g.stops.map(function (st) {
      return {
        position: st.position,
        color: { r: st.color.r, g: st.color.g, b: st.color.b, a: st.color.a },
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
          [-dy, dx, 0.5 + dy * 0.5],
        ],
        gradientStops: gs,
      });
    } else {
      fills.push({
        type: "GRADIENT_RADIAL",
        gradientTransform: [
          [0.5, 0, 0.5],
          [0, 0.5, 0.5],
        ],
        gradientStops: gs,
      });
    }
  }
  var bg = s.backgroundColor;
  if (bg && bg.a > 0)
    fills.push({
      type: "SOLID",
      color: { r: bg.r, g: bg.g, b: bg.b },
      opacity: bg.a,
    });
  node.fills = fills.length > 0 ? fills : [];
}

function applyStroke(node, s) {
  if (s.stroke && s.stroke.color && s.stroke.color.a > 0) {
    var sc = s.stroke.color;
    node.strokes = [
      { type: "SOLID", color: { r: sc.r, g: sc.g, b: sc.b }, opacity: sc.a },
    ];
    node.strokeWeight = s.stroke.width || 1;
    node.strokeAlign = s.strokeAlign === "INSIDE" ? "INSIDE" : "CENTER";
  } else {
    node.strokes = [];
  }
}

function applyCornerRadius(node, s) {
  if (s.cornerRadius !== undefined && s.cornerRadius > 0) {
    node.cornerRadius = s.cornerRadius;
  } else if (
    s.topLeftRadius !== undefined ||
    s.topRightRadius !== undefined ||
    s.bottomLeftRadius !== undefined ||
    s.bottomRightRadius !== undefined
  ) {
    node.topLeftRadius = s.topLeftRadius || 0;
    node.topRightRadius = s.topRightRadius || 0;
    node.bottomLeftRadius = s.bottomLeftRadius || 0;
    node.bottomRightRadius = s.bottomRightRadius || 0;
  }
}

function applyEffects(node, s) {
  var effects = [];
  if (s.shadows && s.shadows.length > 0) {
    for (var i = 0; i < s.shadows.length; i++) {
      var sh = s.shadows[i];
      if (sh.color && sh.color.a > 0) {
        effects.push({
          type: "DROP_SHADOW",
          color: { r: sh.color.r, g: sh.color.g, b: sh.color.b, a: sh.color.a },
          offset: { x: sh.offsetX || 0, y: sh.offsetY || 0 },
          radius: sh.radius || 0,
          spread: sh.spread || 0,
          visible: true,
          blendMode: "NORMAL",
        });
      }
    }
  }
  if (effects.length > 0) node.effects = effects;
}

var FW = {
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
var FWI = {
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
  return (italic ? FWI : FW)[w] || (italic ? "Italic" : "Regular");
}

var FF = {
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
  return FF[clean] || clean;
}

async function loadRequiredFonts(screens) {
  var needed = {};
  function collect(n) {
    if (!n) return;
    if (n.type === "TEXT" && n.styles) {
      var fam = sanitizeFontFamily(n.styles.fontFamily || "Inter");
      var sty = resolveFontStyle(
        n.styles.fontWeight || 400,
        n.styles.fontStyle === "italic"
      );
      needed[fam + "|" + sty] = { family: fam, style: sty };
    }
    if (n.children)
      for (var i = 0; i < n.children.length; i++) collect(n.children[i]);
  }
  for (var i = 0; i < screens.length; i++) collect(screens[i].tree);
  needed["Inter|Regular"] = { family: "Inter", style: "Regular" };
  var keys = Object.keys(needed);
  var promises = [];
  for (var i = 0; i < keys.length; i++) {
    var font = needed[keys[i]];
    promises.push(
      figma.loadFontAsync({ family: font.family, style: font.style }).catch(
        (function (f) {
          return function () {
            return figma
              .loadFontAsync({ family: f.family, style: "Regular" })
              .catch(function () {
                return figma
                  .loadFontAsync({ family: "Inter", style: "Regular" })
                  .catch(function () {});
              });
          };
        })(font)
      )
    );
  }
  await Promise.all(promises);
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
    if ("children" in n)
      for (var i = 0; i < n.children.length; i++) t(n.children[i]);
  }
  t(node);
  return arr;
}

function serializeFigmaNode(node) {
  var d = {
    id: node.id,
    name: node.name,
    type: node.type,
    visible: node.visible,
  };
  var props = [
    "x",
    "y",
    "width",
    "height",
    "rotation",
    "layoutMode",
    "primaryAxisSizingMode",
    "counterAxisSizingMode",
    "primaryAxisAlignItems",
    "counterAxisAlignItems",
    "paddingLeft",
    "paddingRight",
    "paddingTop",
    "paddingBottom",
    "itemSpacing",
    "layoutGrow",
    "layoutAlign",
    "clipsContent",
    "strokeWeight",
    "strokeAlign",
    "cornerRadius",
    "topLeftRadius",
    "topRightRadius",
    "bottomLeftRadius",
    "bottomRightRadius",
    "opacity",
    "blendMode",
  ];
  for (var i = 0; i < props.length; i++) {
    if (props[i] in node) d[props[i]] = node[props[i]];
  }
  if ("constraints" in node)
    d.constraints = {
      horizontal: node.constraints.horizontal,
      vertical: node.constraints.vertical,
    };
  if ("fills" in node && node.fills !== figma.mixed)
    d.fills = node.fills.map(serializePaint);
  if ("strokes" in node && node.strokes !== figma.mixed)
    d.strokes = node.strokes.map(serializePaint);
  if ("effects" in node && node.effects.length > 0)
    d.effects = node.effects.map(serializeEffect);
  if (node.type === "TEXT") {
    d.characters = node.characters;
    var textProps = [
      "fontName",
      "fontSize",
      "fontWeight",
      "letterSpacing",
      "lineHeight",
      "textAlignHorizontal",
      "textAlignVertical",
      "textCase",
      "textDecoration",
      "textAutoResize",
    ];
    for (var j = 0; j < textProps.length; j++) {
      try {
        if (node[textProps[j]] !== figma.mixed)
          d[textProps[j]] = node[textProps[j]];
      } catch (e) {}
    }
  }
  if ("children" in node && node.children.length > 0)
    d.children = node.children.map(serializeFigmaNode);
  return d;
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
  if (
    p.type === "GRADIENT_LINEAR" ||
    p.type === "GRADIENT_RADIAL" ||
    p.type === "GRADIENT_ANGULAR" ||
    p.type === "GRADIENT_DIAMOND"
  ) {
    r.gradientStops = p.gradientStops.map(function (s) {
      return {
        position: s.position,
        color: { r: s.color.r, g: s.color.g, b: s.color.b, a: s.color.a },
      };
    });
    if (p.gradientTransform) r.gradientTransform = p.gradientTransform;
  }
  if (p.type === "IMAGE") {
    r.scaleMode = p.scaleMode;
    if (p.imageHash) {
      r.imageHash = p.imageHash;
      r.imageRef = p.imageHash;
    }
  }
  return r;
}

function serializeEffect(e) {
  var r = { type: e.type, visible: e.visible, radius: e.radius };
  if ("color" in e)
    r.color = { r: e.color.r, g: e.color.g, b: e.color.b, a: e.color.a };
  if ("offset" in e) r.offset = { x: e.offset.x, y: e.offset.y };
  if ("spread" in e) r.spread = e.spread;
  if ("blendMode" in e) r.blendMode = e.blendMode;
  return r;
}

function arrayBufferToBase64(buffer) {
  var bytes = new Uint8Array(buffer),
    len = bytes.byteLength,
    b = "";
  var b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  for (var i = 0; i < len; i += 3) {
    var b1 = bytes[i],
      b2 = i + 1 < len ? bytes[i + 1] : 0,
      b3 = i + 2 < len ? bytes[i + 2] : 0;
    b += b64[b1 >> 2] + b64[((b1 & 3) << 4) | (b2 >> 4)];
    b += i + 1 < len ? b64[((b2 & 15) << 2) | (b3 >> 6)] : "=";
    b += i + 2 < len ? b64[b3 & 63] : "=";
  }
  return b;
}

function base64ToUint8Array(base64) {
  var chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  var lookup = new Uint8Array(256);
  for (var i = 0; i < chars.length; i++) lookup[chars.charCodeAt(i)] = i;
  var len = base64.length,
    bufLen = Math.floor(len * 0.75);
  if (base64[len - 1] === "=") bufLen--;
  if (base64[len - 2] === "=") bufLen--;
  var arr = new Uint8Array(bufLen),
    p = 0;
  for (var i = 0; i < len; i += 4) {
    var a = lookup[base64.charCodeAt(i)],
      b2 = lookup[base64.charCodeAt(i + 1)];
    var c = lookup[base64.charCodeAt(i + 2)],
      d = lookup[base64.charCodeAt(i + 3)];
    arr[p++] = (a << 2) | (b2 >> 4);
    if (i + 2 < len && base64[i + 2] !== "=")
      arr[p++] = ((b2 & 15) << 4) | (c >> 2);
    if (i + 3 < len && base64[i + 3] !== "=") arr[p++] = ((c & 3) << 6) | d;
  }
  return arr;
}
