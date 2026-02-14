import React, { useEffect, useRef, useState } from 'react'

declare global {
  interface Window {
    Babel: any
  }
}

interface MultiFileReactRendererProps {
  files: Record<string, string>
  entry?: string
  dependencies?: Record<string, string>
}

export default function MultiFileReactRenderer({
  files,
  entry = '/App.tsx',
  dependencies = {},
}: MultiFileReactRendererProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)

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
    if (!isReady || !iframeRef.current || !files) return

    try {
      const Babel = window.Babel
      if (!Babel) {
        throw new Error('Babel not loaded')
      }

      // Transform all files with Babel
      const transformedModules: Record<string, string> = {}

      Object.entries(files).forEach(([path, code]) => {
        try {
          const result = Babel.transform(code, {
            presets: [['react', { runtime: 'classic' }], 'typescript'],
            plugins: [['transform-modules-commonjs']],
            filename: path,
          })
          transformedModules[path] = result.code
        } catch (err: any) {
          console.error(`Failed to transform ${path}:`, err)
          throw new Error(`Transform error in ${path}: ${err.message}`)
        }
      })

      // Resolve imports
      const resolvedModules: Record<string, string> = {}

      Object.entries(transformedModules).forEach(([path, code]) => {
        let resolved = code

        // Replace @/ imports
        resolved = resolved.replace(
          /require\(['"]@\/([^'"]+)['"]\)/g,
          (match, importPath) => `require('/${importPath}')`,
        )

        // Replace relative imports
        resolved = resolved.replace(
          /require\(['"]\.\/([\w\/\-\.]+)['"]\)/g,
          (match, importPath) => {
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

      // Module system with smart path resolution
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
          
          // External libraries
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
          
          try {
            moduleFunc.call(exports, module, exports, window.require);
          } catch (err) {
            console.error('[Module Error]', resolvedPath, err);
            throw err;
          }
          
          // Return default export or the whole exports object
          const result = module.exports.default !== undefined ? module.exports.default : module.exports;
          window.__moduleCache[resolvedPath] = result;
          return result;
        };
      `

      // Wrap modules
      const wrappedModules = Object.entries(resolvedModules)
        .map(([path, code]) => {
          return `window.__modules['${path}'] = function(module, exports, require) {
  ${code}
};`
        })
        .join('\n')

      // Create HTML
      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { margin: 0; padding: 0; font-family: system-ui, sans-serif; }
    #root { width: 100%; height: 100vh; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/react-router-dom@6.20.0/dist/umd/react-router-dom.production.min.js"></script>
  <script src="https://unpkg.com/clsx@2.0.0/dist/clsx.min.js"></script>
  <script>
    // Polyfill Lucide React - create icon components on demand
    window.LucideReact = new Proxy({}, {
      get(target, iconName) {
        if (iconName === '__esModule') return true;
        if (iconName === 'default') return window.LucideReact;
        
        // Return a React component that renders an SVG placeholder
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
    
    // CVA polyfill
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
    
    // Module system
    ${moduleLoader}
    
    // Modules
    ${wrappedModules}
    
    // Render
    try {
      const App = window.require('${entry}');
      if (!App) {
        throw new Error('App component is undefined');
      }
      
      const root = ReactDOM.createRoot(document.getElementById('root'));
      root.render(React.createElement(App));
    } catch (err) {
      console.error('[Render Error]', err);
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
    } catch (err: any) {
      console.error('Renderer error:', err)
      setError(err.message || 'Unknown error')
    }
  }, [files, entry, dependencies, isReady])

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
