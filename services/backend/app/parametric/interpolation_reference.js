/**
 * Parametric Design Interpolation Utilities - Enhanced Version 2.0
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

// Core interpolation function
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

// Color interpolation
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

// Helper: Hex to RGB conversion
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

// Helper: RGB to Hex conversion
function rgbToHex(r, g, b) {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// ENHANCED UTILITIES FOR PARAMETRIC PATTERNS

/**
 * Non-linear curves for emphasis effects
 */
function emphasize(value, power = 2) {
  // Quadratic by default, adjustable power
  return Math.pow(value / 100, power) * 100;
}

function deemphasize(value, power = 2) {
  // Inverse curve - flattens at high values
  return 100 - Math.pow((100 - value) / 100, power) * 100;
}

/**
 * Easing functions for smooth transitions
 */
function easeInOut(value) {
  const t = value / 100;
  return t < 0.5 ? 2 * t * t * 100 : (1 - Math.pow(-2 * t + 2, 2) / 2) * 100;
}

function easeInCubic(value) {
  const t = value / 100;
  return t * t * t * 100;
}

function easeOutCubic(value) {
  const t = value / 100;
  return (1 - Math.pow(1 - t, 3)) * 100;
}

/**
 * Ratio-based scaling (for typography systems)
 */
function scaleByRatio(baseSize, ratio, steps) {
  return baseSize * Math.pow(ratio, steps);
}

/**
 * Threshold-based mode detection
 */
function getMode(value, modes) {
  // modes = { low: 33, mid: 66 }
  if (value < modes.low) return "low";
  if (value < modes.mid) return "mid";
  return "high";
}

/**
 * Clamp value within range
 */
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Map value from one range to another
 */
function mapRange(value, inMin, inMax, outMin, outMax) {
  return ((value - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin;
}

/**
 * Smooth step (smooth transition between thresholds)
 */
function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}
