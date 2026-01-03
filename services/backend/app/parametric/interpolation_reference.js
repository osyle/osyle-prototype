/**
 * Parametric Design Interpolation Utilities
 *
 * These functions enable real-time parameter-based style computation.
 * They are APPENDED to generated components after LLM generation.
 *
 * Usage Strategy:
 * 1. Prompt tells LLM: "interpolate() function is available to call"
 * 2. LLM generates component that USES interpolate()
 * 3. Python appends these functions to the end
 * 4. Component is complete and self-contained
 */

function interpolate(value, points) {
  const keys = Object.keys(points)
    .map(Number)
    .sort((a, b) => a - b);

  if (value <= keys[0]) return points[keys[0]];
  if (value >= keys[keys.length - 1]) return points[keys[keys.length - 1]];

  for (let i = 0; i < keys.length - 1; i++) {
    if (value >= keys[i] && value <= keys[i + 1]) {
      const t = (value - keys[i]) / (keys[i + 1] - keys[i]);
      const start = points[keys[i]];
      const end = points[keys[i + 1]];

      if (typeof start === "string") {
        const startNum = parseFloat(start);
        const endNum = parseFloat(end);
        const unit = start.replace(/[0-9.-]/g, "");
        return startNum + (endNum - startNum) * t + unit;
      }

      return start + (end - start) * t;
    }
  }

  return points[keys[0]];
}

function interpolateColor(value, points) {
  const keys = Object.keys(points)
    .map(Number)
    .sort((a, b) => a - b);

  if (value <= keys[0]) return points[keys[0]];
  if (value >= keys[keys.length - 1]) return points[keys[keys.length - 1]];

  for (let i = 0; i < keys.length - 1; i++) {
    if (value >= keys[i] && value <= keys[i + 1]) {
      const t = (value - keys[i]) / (keys[i + 1] - keys[i]);
      const start = hexToRgb(points[keys[i]]);
      const end = hexToRgb(points[keys[i + 1]]);

      const r = Math.round(start.r + (end.r - start.r) * t);
      const g = Math.round(start.g + (end.g - start.g) * t);
      const b = Math.round(start.b + (end.b - start.b) * t);

      return rgbToHex(r, g, b);
    }
  }

  return points[keys[0]];
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

function rgbToHex(r, g, b) {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
