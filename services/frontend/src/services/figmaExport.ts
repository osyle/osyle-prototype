/**
 * figmaExport.ts
 *
 * Orchestrates the Osyle → Figma export pipeline.
 *
 * TRANSPORT: HTTP relay (figma-relay.mjs on port 8765) instead of localStorage.
 * localStorage doesn't work because Figma Desktop's Electron webview uses a
 * separate storage partition from Chrome — the two processes cannot share it.
 *
 * New flow:
 *  1. Render each screen → DOM tree
 *  2. POST payload to http://localhost:8765/figma-payload
 *  3. Poll http://localhost:8765/figma-ack/:token (500ms interval, 15s timeout)
 *  4. Figma plugin polls http://localhost:8765/figma-payload-latest every 800ms
 *  5. Plugin finds payload → builds Figma nodes → POSTs ACK → Osyle resolves
 */

import { config } from '../config/env'
import { type FlowGraph } from '../types/home.types'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const FIGMA_PLUGIN_ID = '1580266048308150079'
export const FIGMA_COMMUNITY_URL = `https://www.figma.com/community/plugin/${FIGMA_PLUGIN_ID}`

// Relay URL — env-aware: uses production relay in prod, local relay in dev
export const RELAY_BASE = config.relay.url

// Keep these exports so FigmaBridge.tsx compiles without changes
export const PAYLOAD_STORAGE_KEY_PREFIX = 'osyle_figma_payload_'
export const PAYLOAD_TTL_MS = 10 * 60 * 1000

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FigmaExportScreen {
  screenId: string
  screenName: string
  width: number
  height: number
  tree: SerializedNode
}

export interface FigmaExportPayload {
  type: 'OSYLE_FIGMA_EXPORT'
  version: 1
  projectName: string
  screens: FigmaExportScreen[]
  token: string
  createdAt: number
}

export interface RGBAColor {
  r: number
  g: number
  b: number
  a: number
}

export interface GradientStop {
  color: RGBAColor
  position: number
}

export interface Gradient {
  type: 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL'
  stops: GradientStop[]
  angle: number
}

export interface FlexLayout {
  layoutMode: 'HORIZONTAL' | 'VERTICAL'
  primaryAxisAlignItems: 'MIN' | 'MAX' | 'CENTER' | 'SPACE_BETWEEN'
  counterAxisAlignItems: 'MIN' | 'MAX' | 'CENTER' | 'STRETCH'
  itemSpacing: number
  wrap: boolean
}

export interface ShadowEffect {
  type: 'DROP_SHADOW'
  offsetX: number
  offsetY: number
  radius: number
  spread: number
  color: RGBAColor
  visible: boolean
  blendMode: string
}

export interface NodeStyles {
  backgroundColor?: RGBAColor
  gradient?: Gradient | null
  backgroundImageUrl?: string
  backgroundSize?: string
  backgroundPosition?: string
  stroke?: { color: RGBAColor; width: number }
  outline?: { color: RGBAColor; width: number }
  strokeAlign?: string
  cornerRadius?: number
  topLeftRadius?: number
  topRightRadius?: number
  bottomLeftRadius?: number
  bottomRightRadius?: number
  shadows?: ShadowEffect[]
  opacity?: number
  flex?: FlexLayout
  paddingTop?: number
  paddingRight?: number
  paddingBottom?: number
  paddingLeft?: number
  fontFamily?: string
  fontSize?: number
  fontWeight?: number
  fontStyle?: string
  lineHeight?: number | null
  letterSpacing?: number
  textDecoration?: string
  textTransform?: string
  textAlign?: string
  color?: RGBAColor | null
  whiteSpace?: string
  iconColor?: RGBAColor
  objectFit?: string
}

export interface SerializedNode {
  tag: string
  type?: 'TEXT' | 'IMAGE' | 'SVG' | 'INPUT' | 'TEXT_RUN'
  x: number
  y: number
  width: number
  height: number
  styles: NodeStyles
  children: SerializedNode[]
  text?: string
  src?: string
  alt?: string
  svgString?: string
  placeholder?: string
  value?: string
  inputType?: string
}

// ---------------------------------------------------------------------------
// DOM Serializer — injected into each iframe via eval
// ---------------------------------------------------------------------------

const DOM_SERIALIZER_SCRIPT = `
(function serializeDOM() {
  const SKIP_TAGS = new Set(['SCRIPT','STYLE','NOSCRIPT','HEAD','META','LINK','TITLE'])
  const MAX_DEPTH = 60

  function getRGBA(color) {
    if (!color || color === 'transparent' || color === 'rgba(0, 0, 0, 0)') return null
    const m = color.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)(?:,\\s*([\\d.]+))?\\)/)
    if (!m) return null
    return { r: +m[1]/255, g: +m[2]/255, b: +m[3]/255, a: m[4] !== undefined ? +m[4] : 1 }
  }

  function parsePx(val) { return val ? parseFloat(val) || 0 : 0 }

  function parseBoxShadow(shadow) {
    if (!shadow || shadow === 'none') return []
    const results = []
    const parts = shadow.split(/,(?![^(]*\\))/)
    for (const part of parts) {
      const m = part.trim().match(/(-?[\\d.]+px)\\s+(-?[\\d.]+px)\\s+(-?[\\d.]+px)(?:\\s+(-?[\\d.]+px))?\\s+(rgba?\\([^)]+\\))/)
      if (m) {
        const color = getRGBA(m[5])
        if (color) results.push({ type:'DROP_SHADOW', offsetX:parseFloat(m[1]), offsetY:parseFloat(m[2]), radius:parseFloat(m[3]), spread:m[4]?parseFloat(m[4]):0, color, visible:true, blendMode:'NORMAL' })
      }
    }
    return results
  }

  function parseGradient(bg) {
    if (!bg || !bg.includes('gradient')) return null
    const isLinear = bg.includes('linear-gradient')
    if (!isLinear && !bg.includes('radial-gradient')) return null
    const stops = []
    const stopRe = /(rgba?\\([^)]+\\))\\s*([\\d.]+%)?/g
    let fm, idx = 0
    while ((fm = stopRe.exec(bg)) !== null) {
      const color = getRGBA(fm[1])
      const pos = fm[2] ? parseFloat(fm[2])/100 : idx/(stops.length||1)
      if (color) { stops.push({ color, position: pos }); idx++ }
    }
    if (stops.length < 2) return null
    let angle = 180
    const am = bg.match(/linear-gradient\\((\\d+)deg/)
    if (am) angle = parseFloat(am[1])
    return { type: isLinear ? 'GRADIENT_LINEAR' : 'GRADIENT_RADIAL', stops, angle }
  }

  function getFlexLayout(cs) {
    if (cs.display !== 'flex' && cs.display !== 'inline-flex') return null
    const isRow = cs.flexDirection === 'row' || cs.flexDirection === 'row-reverse'
    function mapJ(v) { if(v==='flex-end'||v==='end')return'MAX'; if(v==='center')return'CENTER'; if(v==='space-between')return'SPACE_BETWEEN'; return'MIN' }
    function mapA(v) { if(v==='flex-end'||v==='end')return'MAX'; if(v==='center')return'CENTER'; if(v==='stretch'||!v)return'STRETCH'; return'MIN' }
    return {
      layoutMode: isRow ? 'HORIZONTAL' : 'VERTICAL',
      primaryAxisAlignItems: mapJ(cs.justifyContent),
      counterAxisAlignItems: mapA(cs.alignItems),
      itemSpacing: parsePx(cs.gap || cs.columnGap || cs.rowGap),
      wrap: cs.flexWrap === 'wrap',
    }
  }

  function serializeNode(el, depth) {
    if (depth > MAX_DEPTH || !el) return null
    if (el.nodeType === 8) return null
    if (el.nodeType === 3) {
      const text = el.textContent.trim()
      return text ? { type:'TEXT_RUN', text, x:0, y:0, width:0, height:0, styles:{}, children:[] } : null
    }
    if (el.nodeType !== 1) return null
    const tag = el.tagName.toUpperCase()
    if (SKIP_TAGS.has(tag)) return null

    const cs = window.getComputedStyle(el)
    if (cs.display === 'none') return null
    if (cs.visibility === 'hidden') return null
    if (parseFloat(cs.opacity) === 0) return null

    const rect = el.getBoundingClientRect()
    if (rect.width === 0 && rect.height === 0 && !['SPAN','P','A','LI','TD','TH'].includes(tag)) return null

    const node = { tag, x: rect.left+window.scrollX, y: rect.top+window.scrollY, width: rect.width, height: rect.height, styles:{}, children:[] }

    const bgColor = getRGBA(cs.backgroundColor)
    if (bgColor && bgColor.a > 0) node.styles.backgroundColor = bgColor
    const bgImage = cs.backgroundImage
    if (bgImage && bgImage !== 'none') {
      if (bgImage.includes('gradient')) node.styles.gradient = parseGradient(bgImage)
      else if (bgImage.includes('url(')) { const u = bgImage.match(/url\\(["\\']?(.*?)["\\']?\\)/); if (u) node.styles.backgroundImageUrl = u[1] }
      node.styles.backgroundSize = cs.backgroundSize
      node.styles.backgroundPosition = cs.backgroundPosition
    }
    const bColor = getRGBA(cs.borderColor || cs.borderTopColor)
    const bWidth = parsePx(cs.borderTopWidth)
    if (bColor && bColor.a > 0 && bWidth > 0) { node.styles.stroke = { color: bColor, width: bWidth }; node.styles.strokeAlign = 'INSIDE' }
    const tl=parsePx(cs.borderTopLeftRadius), tr=parsePx(cs.borderTopRightRadius), bl=parsePx(cs.borderBottomLeftRadius), br=parsePx(cs.borderBottomRightRadius)
    if (tl||tr||bl||br) { if(tl===tr&&tr===bl&&bl===br){node.styles.cornerRadius=tl}else{node.styles.topLeftRadius=tl;node.styles.topRightRadius=tr;node.styles.bottomLeftRadius=bl;node.styles.bottomRightRadius=br} }
    const shadows = parseBoxShadow(cs.boxShadow)
    if (shadows.length) node.styles.shadows = shadows
    const opacity = parseFloat(cs.opacity)
    if (!isNaN(opacity) && opacity < 1) node.styles.opacity = opacity
    const flex = getFlexLayout(cs)
    if (flex) { node.styles.flex = flex; node.styles.paddingTop=parsePx(cs.paddingTop); node.styles.paddingRight=parsePx(cs.paddingRight); node.styles.paddingBottom=parsePx(cs.paddingBottom); node.styles.paddingLeft=parsePx(cs.paddingLeft) }

    if (tag === 'IMG') {
      node.type = 'IMAGE'; node.src = el.src; node.alt = el.alt
      node.styles.objectFit = cs.objectFit || 'cover'
      return node
    }

    if (tag === 'SVG' || (el.closest && el.closest('svg') && tag !== 'SVG')) {
      node.type = 'SVG'
      const svgEl = tag === 'SVG' ? el : el.closest('svg')
      if (svgEl) {
        const clone = svgEl.cloneNode(true)
        if (!clone.getAttribute('width')) clone.setAttribute('width', rect.width)
        if (!clone.getAttribute('height')) clone.setAttribute('height', rect.height)
        node.svgString = clone.outerHTML
        const ic = getRGBA(cs.color); if (ic) node.styles.iconColor = ic
        return node
      }
    }

    const TEXT_TAGS = new Set(['SPAN','P','H1','H2','H3','H4','H5','H6','LABEL','A','BUTTON','LI','TD','TH','STRONG','EM','B','I','SMALL'])
    const visibleChildCount = Array.from(el.children).filter(c => { const ccs = window.getComputedStyle(c); return ccs.display !== 'none' && ccs.visibility !== 'hidden' }).length
    const directText = Array.from(el.childNodes).filter(n => n.nodeType === 3 && n.textContent.trim()).map(n => n.textContent.trim()).join(' ')
    const isTextLeaf = directText && visibleChildCount === 0

    if (isTextLeaf || (TEXT_TAGS.has(tag) && visibleChildCount === 0)) {
      const fullText = (el.innerText || el.textContent || '').trim().replace(/\\s+/g, ' ')
      if (fullText) {
        node.type = 'TEXT'; node.text = fullText
        node.styles.fontFamily = cs.fontFamily.split(',')[0].trim().replace(/['"]/g,'')
        node.styles.fontSize = parsePx(cs.fontSize)
        node.styles.fontWeight = cs.fontWeight === 'bold' ? 700 : parseInt(cs.fontWeight)||400
        node.styles.fontStyle = cs.fontStyle
        node.styles.lineHeight = cs.lineHeight === 'normal' ? null : parsePx(cs.lineHeight)
        node.styles.letterSpacing = cs.letterSpacing === 'normal' ? 0 : parsePx(cs.letterSpacing)
        node.styles.textDecoration = cs.textDecoration
        node.styles.textTransform = cs.textTransform
        node.styles.textAlign = cs.textAlign
        node.styles.color = getRGBA(cs.color)
        node.styles.whiteSpace = cs.whiteSpace
        return node
      }
    }

    for (const child of el.children) {
      const c = serializeNode(child, depth+1)
      if (c) node.children.push(c)
    }
    return node
  }

  const root = document.getElementById('root') || document.body
  const tree = serializeNode(root, 0)
  return { width: window.innerWidth, height: window.innerHeight, devicePixelRatio: window.devicePixelRatio||1, tree }
})()
`

// ---------------------------------------------------------------------------
// Screen HTML builder — mirrors MultiFileReactRenderer + ScreenNode exactly
// ---------------------------------------------------------------------------

/**
 * Build the files dict for one screen, exactly as ScreenNode.tsx does:
 *  - Synthetic /App.tsx wrapping the screen component
 *  - The screen component file
 *  - All /components/** and /lib/** shared files
 */
function buildScreenFiles(
  projectFiles: Record<string, string>,
  componentPath: string,
): Record<string, string> {
  const componentName =
    componentPath.split('/').pop()?.replace('.tsx', '') || 'Screen'

  const appTsx = `import ${componentName} from '${componentPath.replace('.tsx', '')}'

export default function App() {
  const handleTransition = (transitionId: string) => {
    console.log('Preview transition:', transitionId)
  }
  return <${componentName} onTransition={handleTransition} />
}`

  return {
    '/App.tsx': appTsx,
    [componentPath]: projectFiles[componentPath] || '',
    ...Object.fromEntries(
      Object.entries(projectFiles).filter(
        ([path]) =>
          path.startsWith('/components/') ||
          path.startsWith('/lib/') ||
          path === '/tsconfig.json' ||
          path === '/package.json',
      ),
    ),
  }
}

/**
 * Build the iframe HTML for export rendering.
 *
 * Uses Babel inside the iframe (so window.Babel is guaranteed available)
 * but mirrors MultiFileReactRenderer's file-dict structure exactly:
 *  - Synthetic /App.tsx wrapping the screen (same as ScreenNode)
 *  - All /components and /lib files included
 *  - Correct module caching (returns default export, not raw exports object)
 *  - Relative + @/ import resolution done inside the module loader
 */
function buildScreenHTML(
  projectFiles: Record<string, string>,
  componentPath: string,
  width: number,
  height: number,
): string {
  const files = buildScreenFiles(projectFiles, componentPath)

  // Serialize files as a JSON map — Babel will transform them inside the iframe
  // where window.Babel is always available after the script loads.
  const filesJson = JSON.stringify(
    Object.fromEntries(
      Object.entries(files).map(([path, code]) => {
        // Strip markdown fences stored alongside code
        let c = code.trim()
        c = c
          .replace(/^```[a-zA-Z]*\n?/, '')
          .replace(/\n?```$/, '')
          .trim()
        // Fix deprecated unsplash URLs
        c = c.replace(
          /https:\/\/source\.unsplash\.com\/(\d+)x(\d+)\/\?([^"'\s]+)/g,
          (_m: string, w: string, h: string, kw: string) =>
            `https://picsum.photos/seed/${kw
              .replace(/[,+&]/g, '-')
              .replace(/[^a-zA-Z0-9-]/g, '')
              .slice(0, 40)}/${w}/${h}`,
        )
        return [path, c]
      }),
    ),
  )

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script>console.warn=function(){};var __oe=console.error.bind(console);console.error=function(){var m=String(arguments[0]||'');if(m.indexOf('non-boolean')!==-1||m.indexOf('React does not recognize')!==-1||m.indexOf('Each child in a list')!==-1)return;__oe.apply(console,arguments);};</script>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>body{margin:0;padding:0;font-family:system-ui,sans-serif;}#root{width:${width}px;height:${height}px;overflow:hidden;}</style>
</head>
<body>
  <div id="root"></div>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/react-router-dom@6.20.0/dist/umd/react-router-dom.production.min.js"></script>
  <script src="https://unpkg.com/clsx@2.0.0/dist/clsx.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone@7.23.5/babel.min.js"></script>
  <script>
    window.cva=function(base,cfg){return function(p){if(!p)return base||'';var c=base||'';if(cfg&&cfg.variants){for(var k in p){if(cfg.variants[k]&&cfg.variants[k][p[k]])c+=' '+cfg.variants[k][p[k]];}}if(p.className)c+=' '+p.className;return c.trim();}};
    window.twMerge=function(){return Array.prototype.slice.call(arguments).filter(Boolean).join(' ')};

    // All source files (raw TSX/TS, will be Babel-transformed on first require)
    var __rawFiles = ${filesJson};

    var __modules = {};
    var __moduleCache = {};

    function __resolvePath(from, imp) {
      // External packages — returned as-is
      var externals = ['react','react-dom','react-dom/client','react-router-dom','lucide-react','clsx','class-variance-authority','tailwind-merge','@radix-ui/react-slot'];
      for (var i=0;i<externals.length;i++) { if (imp===externals[i]) return imp; }

      // @/ alias → absolute
      if (imp.indexOf('@/')===0) { imp = '/'+imp.slice(2); }

      // Relative → absolute
      if (imp.indexOf('.')===0) {
        var dir = from.substring(0, from.lastIndexOf('/'));
        var parts = (dir+'/'+imp).split('/');
        var out = [];
        for (var j=0;j<parts.length;j++) {
          if (parts[j]==='..') out.pop();
          else if (parts[j]!=='.') out.push(parts[j]);
        }
        imp = out.join('/');
      }

      // Try with extensions
      if (__rawFiles[imp]) return imp;
      var exts = ['.tsx','.ts','.jsx','.js','/index.tsx','/index.ts','/index.jsx','/index.js'];
      for (var k=0;k<exts.length;k++) { if (__rawFiles[imp+exts[k]]) return imp+exts[k]; }
      return imp;
    }

    function __require(path, fromPath) {
      fromPath = fromPath || '/';

      // Externals
      if (path==='react'||path==='react/jsx-runtime'||path==='react/jsx-dev-runtime') return window.React;
      if (path==='react-dom'||path==='react-dom/client') return window.ReactDOM;
      if (path==='react-router-dom') return window.ReactRouterDOM||{};
      if (path==='lucide-react') return window.LucideReact||{};
      if (path==='clsx') return window.clsx;
      if (path==='class-variance-authority') return {cva:window.cva};
      if (path==='tailwind-merge') return {twMerge:window.twMerge};
      if (path==='@radix-ui/react-slot') return {Slot:function(p){return p.children;}};

      var resolved = __resolvePath(fromPath, path);

      if (__moduleCache[resolved]) return __moduleCache[resolved];

      var raw = __rawFiles[resolved];
      if (!raw) { console.warn('Module not found:', path, '(resolved:', resolved+')'); return {}; }

      // Transform with Babel
      var transformed;
      try {
        transformed = Babel.transform(raw, {
          presets: [['react',{runtime:'classic'}],'typescript'],
          plugins: [['transform-modules-commonjs']],
          filename: resolved,
        }).code;
      } catch(e) {
        console.error('Babel error in '+resolved+':', e.message);
        __moduleCache[resolved] = {};
        return {};
      }

      // Fix require paths using the resolved module's own path as base
      var finalPath = resolved;
      transformed = transformed.replace(/require\x28["']([^"']+)["']\x29/g, function(match, imp) {
        var res = __resolvePath(finalPath, imp);
        return "require('" + res + "')";
      });

      var module = {exports:{}};
      var exports = module.exports;
      try {
        (new Function('module','exports','require', transformed))(
          module, exports, function(p){ return __require(p, resolved); }
        );
      } catch(e) {
        console.error('Runtime error in '+resolved+':', e.message);
        __moduleCache[resolved] = {};
        return {};
      }

      var result = module.exports.default !== undefined ? module.exports.default : module.exports;
      __moduleCache[resolved] = result;
      return result;
    }

    window.__initApp = function() {
      try {
        var App = __require('/App.tsx', '/');
        if (!App) throw new Error('App component is undefined');
        ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App, null));
        window.__osyleRenderReady = true;
      } catch(err) {
        document.getElementById('root').innerHTML =
          '<div style="color:red;padding:20px;font-size:12px;background:#1a1a1a;font-family:monospace;">Render error: '+err.message+'</div>';
        window.__osyleRenderReady = true;
      }
    };
  </script>
  <script type="module">
    import * as LucideReact from 'https://esm.sh/lucide-react@0.263.1?deps=react@18';
    window.LucideReact = LucideReact;
    window.__initApp();
  </script>
</body>
</html>`
}

async function waitForRender(
  iframe: HTMLIFrameElement,
  timeoutMs = 8000,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs
    const check = () => {
      try {
        const win = iframe.contentWindow as Window & {
          __osyleRenderReady?: boolean
        }
        if (win?.__osyleRenderReady) {
          setTimeout(resolve, 600)
          return
        }
      } catch {
        /* cross-origin */
      }
      if (Date.now() > deadline) {
        reject(new Error('Render timeout'))
        return
      }
      requestAnimationFrame(check)
    }
    check()
  })
}

async function extractDOMTree(
  iframe: HTMLIFrameElement,
): Promise<{ width: number; height: number; tree: SerializedNode }> {
  const win = iframe.contentWindow as Window & { __osyleRenderReady?: boolean }
  if (!win) throw new Error('No iframe window')
  return new Promise((resolve, reject) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = (win as any).eval(DOM_SERIALIZER_SCRIPT)
      if (res && res.tree) resolve(res)
      else reject(new Error('Serializer returned empty result'))
    } catch (e) {
      reject(e)
    }
  })
}

// ---------------------------------------------------------------------------
// Token generation
// ---------------------------------------------------------------------------

function generateToken(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

// ---------------------------------------------------------------------------
// Relay helpers
// ---------------------------------------------------------------------------

const RELAY_TIMEOUT_MS = 20_000

/** Check if the relay server is running. Returns false if not reachable. */
async function isRelayRunning(): Promise<boolean> {
  try {
    const res = await fetch(`${RELAY_BASE}/figma-ping`, {
      signal: AbortSignal.timeout(1500),
    })
    return res.ok
  } catch {
    return false
  }
}

/** POST the payload to the relay server. */
async function postPayloadToRelay(payload: FigmaExportPayload): Promise<void> {
  const res = await fetch(`${RELAY_BASE}/figma-payload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`Relay POST failed: ${res.status}`)
}

// ---------------------------------------------------------------------------
// Launch + ACK detection
// ---------------------------------------------------------------------------

export type LaunchResult = 'launched' | 'not_installed' | 'relay_not_running'

/**
 * POST payload to local relay → poll for ACK from Figma plugin.
 *
 * Prerequisites:
 *  1. `node figma-relay.mjs` is running (port 8765)
 *  2. Figma plugin is open (it polls the relay every 800ms)
 *
 * Returns:
 *  'launched'          — plugin received payload and ACKed
 *  'relay_not_running' — couldn't reach localhost:8765 (show setup instructions)
 *  'not_installed'     — relay running but no ACK within timeout (plugin not open)
 */
export async function launchFigmaPlugin(
  payload: FigmaExportPayload,
): Promise<LaunchResult> {
  // 1. Verify relay is up
  const relayUp = await isRelayRunning()
  if (!relayUp) {
    console.warn('[figmaExport] Relay not running on port 8765')
    return 'relay_not_running'
  }

  // 2. POST payload
  await postPayloadToRelay(payload)
  console.log('[figmaExport] Payload posted to relay, token:', payload.token)

  // 3. Poll for ACK
  const { token } = payload
  return new Promise(resolve => {
    let done = false
    const finish = (result: LaunchResult) => {
      if (done) return
      done = true
      clearInterval(poller)
      clearTimeout(timeout)
      resolve(result)
    }

    const poller = setInterval(async () => {
      try {
        const res = await fetch(`${RELAY_BASE}/figma-ack/${token}`)
        if (res.ok) {
          console.log('[figmaExport] ACK received from relay')
          finish('launched')
        }
        // 404 = no ACK yet, keep polling
      } catch {
        // relay went down mid-flight, keep trying until timeout
      }
    }, 500)

    const timeout = setTimeout(() => finish('not_installed'), RELAY_TIMEOUT_MS)
  })
}

// ---------------------------------------------------------------------------
// Main export function
// ---------------------------------------------------------------------------

export interface ExportOptions {
  // eslint-disable-next-line no-unused-vars
  onProgress?: (message: string, current: number, total: number) => void
}

export async function exportScreensToFigma(
  flowGraph: FlowGraph,
  screenIds: string[],
  options: ExportOptions = {},
): Promise<FigmaExportPayload> {
  const { onProgress } = options
  const screens = flowGraph.screens.filter(s => screenIds.includes(s.screen_id))
  const exportedScreens: FigmaExportScreen[] = []

  const container = document.createElement('div')
  container.style.cssText =
    'position:fixed;left:-99999px;top:0;pointer-events:none;visibility:hidden;'
  document.body.appendChild(container)

  try {
    for (let i = 0; i < screens.length; i++) {
      const screen = screens[i]
      onProgress?.(`Rendering "${screen.name}"…`, i, screens.length)

      const componentPath =
        screen.component_path || `/screens/${screen.screen_id}.tsx`
      // Get dimensions from this screen, fall back to device_info, then 390x844
      const width =
        screen.dimensions?.width ||
        (
          flowGraph as unknown as {
            device_info?: { screen?: { width: number } }
          }
        ).device_info?.screen?.width ||
        390
      const height =
        screen.dimensions?.height ||
        (
          flowGraph as unknown as {
            device_info?: { screen?: { height: number } }
          }
        ).device_info?.screen?.height ||
        844

      const iframe = document.createElement('iframe')
      iframe.style.cssText = `width:${width}px;height:${height}px;border:none;`
      iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin')
      container.appendChild(iframe)

      const html = buildScreenHTML(
        flowGraph.project.files,
        componentPath,
        width,
        height,
      )
      const iframeDoc = iframe.contentDocument!
      iframeDoc.open()
      iframeDoc.write(html)
      iframeDoc.close()

      try {
        await waitForRender(iframe)
        onProgress?.(`Extracting "${screen.name}"…`, i, screens.length)
        const { tree } = await extractDOMTree(iframe)
        exportedScreens.push({
          screenId: screen.screen_id,
          screenName: screen.name,
          width,
          height,
          tree,
        })
      } catch (e) {
        console.error(`Export failed for screen ${screen.name}:`, e)
        onProgress?.(`⚠ Failed to export "${screen.name}"`, i, screens.length)
      } finally {
        container.removeChild(iframe)
      }
    }
  } finally {
    document.body.removeChild(container)
  }

  const token = generateToken()
  const payload: FigmaExportPayload = {
    type: 'OSYLE_FIGMA_EXPORT',
    version: 1,
    projectName: flowGraph.flow_name || 'Osyle Project',
    screens: exportedScreens,
    token,
    createdAt: Date.now(),
  }

  return payload
}
