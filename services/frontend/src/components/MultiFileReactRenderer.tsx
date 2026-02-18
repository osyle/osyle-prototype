import clsx from 'clsx'
import * as LucideReact from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'
import * as ReactRouterDOM from 'react-router-dom'

declare global {
  interface Window {
    Babel: {
      transform: (
        // eslint-disable-next-line no-unused-vars
        code: string,
        // eslint-disable-next-line no-unused-vars
        options: {
          presets: Array<string | [string, Record<string, unknown>]>
          plugins: Array<string | [string]>
          filename: string
        },
      ) => { code: string }
    }
    __modules?: Record<string, ModuleFunction>
    __moduleCache?: Record<string, unknown>
    // eslint-disable-next-line no-unused-vars
    __directRequire?: (path: string) => unknown
  }
}

type ModuleFunction = (
  // eslint-disable-next-line no-unused-vars
  module: { exports: ModuleExports },
  // eslint-disable-next-line no-unused-vars
  exports: ModuleExports,
  // eslint-disable-next-line no-unused-vars
  require: (path: string) => unknown,
) => void

interface ModuleExports {
  default?: unknown
  [key: string]: unknown
}

interface CVAConfig {
  variants?: Record<string, Record<string, string>>
  defaultVariants?: Record<string, string>
}

interface CVAProps {
  className?: string
  [key: string]: unknown
}

interface MultiFileReactRendererProps {
  files: Record<string, string>
  entry?: string
  dependencies?: Record<string, string>
  isConceptMode?: boolean // NEW: Disable interactivity for annotation modes
}

export default function MultiFileReactRenderer({
  files,
  entry = '/App.tsx',
  dependencies = {},
  isConceptMode = false,
}: MultiFileReactRendererProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const directRenderRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [isTailwindReady, setIsTailwindReady] = useState(false)
  const [DirectComponent, setDirectComponent] =
    useState<React.ComponentType | null>(null)

  // Suppress all console warnings only
  useEffect(() => {
    const originalWarn = console.warn

    console.warn = () => {}

    return () => {
      console.warn = originalWarn
    }
  }, [])

  // Check if Tailwind CDN is ready (only for concept mode)
  useEffect(() => {
    if (!isConceptMode) {
      setIsTailwindReady(true)
      return
    }

    // Check if Tailwind CDN script exists and is loaded
    const checkTailwind = () => {
      // @ts-expect-error - Tailwind CDN exposes tailwind global
      if (window.tailwind || document.querySelector('style[data-tailwind]')) {
        setIsTailwindReady(true)
        return true
      }
      return false
    }

    // Check immediately
    if (checkTailwind()) return

    // Poll for Tailwind to be ready (CDN loads asynchronously)
    const interval = setInterval(() => {
      if (checkTailwind()) {
        clearInterval(interval)
      }
    }, 100)

    // Timeout after 5 seconds
    const timeout = setTimeout(() => {
      clearInterval(interval)
      console.warn('Tailwind CDN did not load in time')
      setIsTailwindReady(true) // Proceed anyway
    }, 5000)

    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [isConceptMode])

  useEffect(() => {
    if (typeof window.Babel !== 'undefined') {
      setIsReady(true)
      return
    }

    const script = document.createElement('script')
    script.src = 'https://unpkg.com/@babel/standalone@7.23.5/babel.min.js'
    script.async = true
    script.onload = () => setIsReady(true)
    script.onerror = () => setError('Failed to load Babel')
    document.head.appendChild(script)

    return () => {
      script.remove()
    }
  }, [])

  useEffect(() => {
    if (!isReady || !files) return

    // In concept mode, wait for Tailwind CDN to be ready
    if (isConceptMode && !isTailwindReady) return

    try {
      const Babel = window.Babel
      if (!Babel) {
        throw new Error('Babel not loaded')
      }

      const transformedModules: Record<string, string> = {}

      Object.entries(files).forEach(([path, code]) => {
        try {
          const result = Babel.transform(code, {
            presets: [
              [
                'react',
                {
                  runtime: isConceptMode ? 'automatic' : 'classic',
                },
              ],
              'typescript',
            ],
            plugins: [['transform-modules-commonjs']],
            filename: path,
          })
          transformedModules[path] = result.code
        } catch (err) {
          const error = err as Error
          throw new Error(`Transform error in ${path}: ${error.message}`)
        }
      })

      const resolvedModules: Record<string, string> = {}

      Object.entries(transformedModules).forEach(([path, code]) => {
        let resolved = code

        resolved = resolved.replace(
          /require\(['"]@\/([^'"]+)['"]\)/g,
          (_, importPath) => `require('/${importPath}')`,
        )

        resolved = resolved.replace(
          // eslint-disable-next-line no-useless-escape
          /require\(['"]\.\/([\w/\-\.]+)['"]\)/g,
          (_, importPath) => {
            const dir = path.substring(0, path.lastIndexOf('/'))
            let resolvedPath = `${dir}/${importPath}`

            if (!resolvedPath.match(/\.(js|jsx|ts|tsx)$/)) {
              const possiblePaths = [
                `${resolvedPath}.tsx`,
                `${resolvedPath}.ts`,
                `${resolvedPath}.jsx`,
                `${resolvedPath}.js`,
                `${resolvedPath}/index.tsx`,
              ]

              for (const possible of possiblePaths) {
                if (files[possible]) {
                  resolvedPath = possible
                  break
                }
              }
            }

            return `require('${resolvedPath}')`
          },
        )

        resolvedModules[path] = resolved
      })

      // CONCEPT MODE: Direct rendering in same DOM for annotation support
      if (isConceptMode) {
        // Create module system in window
        window.__modules = {}
        window.__moduleCache = {}

        // Register all modules
        Object.entries(resolvedModules).forEach(([path, code]) => {
          // eslint-disable-next-line no-new-func
          window.__modules![path] = new Function(
            'module',
            'exports',
            'require',
            code,
          ) as ModuleFunction
        })

        // Create require function with external dependencies
        window.__directRequire = function (path: string): unknown {
          // External dependencies - use imports from parent app
          if (path === 'react') return React
          if (path === 'react/jsx-runtime') {
            return {
              jsx: React.createElement,
              jsxs: React.createElement,
              Fragment: React.Fragment,
            }
          }
          if (path === 'react/jsx-dev-runtime') {
            return {
              jsxDEV: React.createElement,
              Fragment: React.Fragment,
            }
          }
          if (path === 'react-dom' || path === 'react-dom/client') {
            return { default: React }
          }
          if (path === 'lucide-react') return LucideReact
          if (path === 'clsx') {
            // clsx can be imported as default or named, support both
            const clsxFn = clsx
            return { default: clsxFn, clsx: clsxFn }
          }
          if (path === 'react-router-dom') return ReactRouterDOM
          if (path === 'class-variance-authority') {
            // Simple cva implementation
            return {
              cva: (base: string, config?: CVAConfig) => (props?: CVAProps) => {
                let classes = base || ''
                if (config?.variants && props) {
                  for (const key in props) {
                    if (config.variants[key]?.[props[key] as string]) {
                      classes +=
                        ' ' + config.variants[key][props[key] as string]
                    }
                  }
                }
                if (props?.className) classes += ' ' + props.className
                return classes.trim()
              },
            }
          }
          if (path === 'tailwind-merge') {
            return {
              twMerge: (...args: string[]) => args.filter(Boolean).join(' '),
            }
          }
          if (path === '@radix-ui/react-slot') {
            return {
              Slot: ({ children }: { children?: React.ReactNode }) => children,
            }
          }

          // Check cache
          if (window.__moduleCache?.[path]) {
            return window.__moduleCache[path]
          }

          // Find module
          const moduleFunc = window.__modules?.[path]
          if (!moduleFunc) {
            // Try with extensions
            const extensions = [
              '.tsx',
              '.ts',
              '.jsx',
              '.js',
              '/index.tsx',
              '/index.ts',
            ]
            for (const ext of extensions) {
              if (window.__modules?.[path + ext]) {
                return window.__directRequire!(path + ext)
              }
            }
            throw new Error('Module not found: ' + path)
          }

          const module: { exports: ModuleExports } = { exports: {} }
          const exports = module.exports
          moduleFunc.call(exports, module, exports, window.__directRequire!)

          const result =
            module.exports.default !== undefined
              ? module.exports.default
              : module.exports
          if (window.__moduleCache) {
            window.__moduleCache[path] = result
          }
          return result
        }

        // Load entry component
        const AppComponent = window.__directRequire!(
          entry,
        ) as React.ComponentType

        // Suppress React warnings in concept mode (non-interactive preview)
        const originalWarn = console.warn
        const originalError = console.error
        console.warn = (...args) => {
          const msg = args[0]?.toString() || ''
          // Suppress React key warnings and other common React warnings
          if (
            msg.includes('Each child in a list should have a unique "key"') ||
            msg.includes('Warning: Failed prop type') ||
            msg.includes('Warning: React does not recognize')
          ) {
            return
          }
          originalWarn.apply(console, args)
        }
        console.error = (...args) => {
          const msg = args[0]?.toString() || ''
          // Suppress React warnings that appear as errors
          if (
            msg.includes('Each child in a list should have a unique "key"') ||
            msg.includes('Warning: Failed prop type') ||
            msg.includes('Warning: React does not recognize')
          ) {
            return
          }
          originalError.apply(console, args)
        }

        setDirectComponent(() => AppComponent)
        setError(null)
        return
      }

      // PROTOTYPE MODE: Iframe rendering for full interactivity
      if (!iframeRef.current) return

      const moduleLoader = `
        window.__modules = {};
        window.__moduleCache = {};
        
        window.__resolvePath = function(path) {
          if (path === 'react') return 'react';
          if (path === 'react-dom' || path === 'react-dom/client') return 'react-dom';
          if (path === 'react-router-dom') return 'react-router-dom';
          if (path === 'lucide-react') return 'lucide-react';
          if (path === 'clsx') return 'clsx';
          if (path === 'class-variance-authority') return 'cva';
          if (path === 'tailwind-merge') return 'tailwind-merge';
          if (path === '@radix-ui/react-slot') return '@radix-ui/react-slot';
          
          if (window.__modules[path]) return path;
          
          const extensions = ['.tsx', '.ts', '.jsx', '.js', '/index.tsx', '/index.ts', '/index.jsx', '/index.js'];
          for (const ext of extensions) {
            const pathWithExt = path + ext;
            if (window.__modules[pathWithExt]) return pathWithExt;
          }
          
          return null;
        };
        
        window.require = function(path) {
          const resolvedPath = window.__resolvePath(path);
          
          if (!resolvedPath) {
            throw new Error('Module not found: ' + path);
          }
          
          if (resolvedPath === 'react') return window.React;
          if (resolvedPath === 'react-dom') return window.ReactDOM;
          if (resolvedPath === 'react-router-dom') return window.ReactRouterDOM;
          if (resolvedPath === 'lucide-react') return window.LucideReact;
          if (resolvedPath === 'clsx') return window.clsx;
          if (resolvedPath === 'cva') return { cva: window.cva };
          if (resolvedPath === 'tailwind-merge') return { twMerge: window.twMerge };
          if (resolvedPath === '@radix-ui/react-slot') {
            return { Slot: function Slot(props) { return props.children; } };
          }
          
          if (window.__moduleCache[resolvedPath]) {
            return window.__moduleCache[resolvedPath];
          }
          
          const moduleFunc = window.__modules[resolvedPath];
          if (!moduleFunc) {
            throw new Error('Module function not found: ' + resolvedPath);
          }
          
          const module = { exports: {} };
          const exports = module.exports;
          
          moduleFunc.call(exports, module, exports, window.require);
          
          const result = module.exports.default !== undefined ? module.exports.default : module.exports;
          window.__moduleCache[resolvedPath] = result;
          return result;
        };
      `

      const wrappedModules = Object.entries(resolvedModules)
        .map(([path, code]) => {
          return `window.__modules['${path}'] = function(module, exports, require) {
  ${code}
};`
        })
        .join('\n')

      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script>
    // Suppress all console warnings only
    console.warn = function() {};
  </script>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { margin: 0; padding: 0; font-family: system-ui, sans-serif; }
    #root { width: 100%; height: 100vh; }
    ${
      isConceptMode
        ? `
    /* Disable all interactivity in concept mode for annotation support */
    * {
      pointer-events: none !important;
      user-select: none !important;
      cursor: default !important;
    }
    /* Disable hover effects */
    *:hover {
      filter: none !important;
      transform: none !important;
      opacity: inherit !important;
      background: inherit !important;
      color: inherit !important;
      border: inherit !important;
      box-shadow: inherit !important;
    }
    /* Disable transitions and animations */
    *, *::before, *::after {
      transition: none !important;
      animation: none !important;
    }
    `
        : ''
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/react-router-dom@6.20.0/dist/umd/react-router-dom.production.min.js"></script>
  <script src="https://unpkg.com/clsx@2.0.0/dist/clsx.min.js"></script>
  <script>
    window.LucideReact = new Proxy({}, {
      get(target, iconName) {
        if (iconName === '__esModule') return true;
        if (iconName === 'default') return window.LucideReact;
        
        return window.React.forwardRef((props, ref) => {
          const { size = 24, color = 'currentColor', strokeWidth = 2, className = '', ...rest } = props;
          
          return window.React.createElement('svg', {
            ref,
            width: size,
            height: size,
            viewBox: '0 0 24 24',
            fill: 'none',
            stroke: color,
            strokeWidth,
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
            className: 'lucide lucide-' + iconName.toLowerCase() + ' ' + className,
            ...rest
          }, window.React.createElement('circle', { cx: 12, cy: 12, r: 10 }));
        });
      }
    });
    
    window.cva = function(base, config) {
      return function(props) {
        if (!props) return base || '';
        let classes = base || '';
        
        if (config && config.variants) {
          for (const key in props) {
            if (config.variants[key] && config.variants[key][props[key]]) {
              classes += ' ' + config.variants[key][props[key]];
            }
          }
        }
        
        if (config && config.defaultVariants) {
          for (const key in config.defaultVariants) {
            if (props[key] === undefined && config.variants && config.variants[key]) {
              const defaultValue = config.defaultVariants[key];
              if (config.variants[key][defaultValue]) {
                classes += ' ' + config.variants[key][defaultValue];
              }
            }
          }
        }
        
        if (props.className) {
          classes += ' ' + props.className;
        }
        
        return classes.trim();
      };
    };
    
    window.twMerge = function(...inputs) {
      return inputs.filter(Boolean).join(' ');
    };
    
    ${moduleLoader}
    
    ${wrappedModules}
    
    try {
      const App = window.require('${entry}');
      if (!App) {
        throw new Error('App component is undefined');
      }
      
      const root = ReactDOM.createRoot(document.getElementById('root'));
      root.render(React.createElement(App));
    } catch (err) {
      document.body.innerHTML = \`
        <div style="display: flex; align-items: center; justify-content: center; height: 100vh; background: #1a1a1a; color: white; padding: 20px;">
          <div style="max-width: 600px;">
            <h2 style="color: #ef4444; margin-bottom: 16px;">Render Error</h2>
            <pre style="background: #000; padding: 16px; border-radius: 8px; overflow: auto; font-size: 12px; line-height: 1.5; white-space: pre-wrap;">\${err.stack || err.message}</pre>
          </div>
        </div>
      \`;
    }
  </script>
</body>
</html>`

      const iframeDoc = iframeRef.current.contentDocument
      if (iframeDoc) {
        iframeDoc.open()
        iframeDoc.write(html)
        iframeDoc.close()
      }

      setError(null)
    } catch (err) {
      const error = err as Error
      setError(error.message || 'Unknown error')
    }
  }, [files, entry, dependencies, isReady, isConceptMode, isTailwindReady])

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900 text-white p-4">
        <div className="max-w-lg">
          <h3 className="text-xl font-bold mb-2 text-red-500">Render Error</h3>
          <pre className="bg-black p-4 rounded text-sm overflow-auto max-h-96">
            {error}
          </pre>
        </div>
      </div>
    )
  }

  if (!isReady) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="text-sm text-gray-600">Loading renderer...</div>
      </div>
    )
  }

  // CONCEPT MODE: Direct render for annotation support
  if (isConceptMode) {
    if (!DirectComponent) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gray-100">
          <div className="text-sm text-gray-600">Loading component...</div>
        </div>
      )
    }

    return (
      <div
        ref={directRenderRef}
        style={{
          width: '100%',
          height: '100%',
        }}
        className="concept-mode-render"
        onClickCapture={e => {
          // Prevent all click interactions in concept mode
          e.preventDefault()
          e.stopPropagation()
        }}
        onMouseDownCapture={e => {
          // Prevent drag/mousedown interactions
          e.preventDefault()
        }}
      >
        <style>{`
          /* Disable hover effects and transitions in concept mode but keep pointer-events enabled */
          .concept-mode-render * {
            cursor: default !important;
            transition: none !important;
            animation: none !important;
          }
          .concept-mode-render *:hover {
            filter: none !important;
            transform: none !important;
          }
        `}</style>
        <DirectComponent />
      </div>
    )
  }

  // PROTOTYPE MODE: Iframe render for full interactivity
  return (
    <iframe
      ref={iframeRef}
      style={{
        width: '100%',
        height: '100%',
        border: 'none',
        background: 'white',
      }}
      sandbox="allow-scripts allow-same-origin"
      title="Preview"
    />
  )
}
