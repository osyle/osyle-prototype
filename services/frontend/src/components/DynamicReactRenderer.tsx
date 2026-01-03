import * as Babel from '@babel/standalone'
import React, {
  useEffect,
  useState,
  useRef,
  Component,
  type ErrorInfo,
  type ReactNode,
} from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
  static getDerivedStateFromError(_error: Error): ErrorBoundaryState {
    return { hasError: true }
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Component render error:', error, errorInfo)
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0A0A0F',
            backgroundImage: `
              radial-gradient(circle at 20% 30%, rgba(88, 86, 214, 0.15) 0%, transparent 50%),
              radial-gradient(circle at 80% 70%, rgba(249, 115, 22, 0.12) 0%, transparent 50%),
              repeating-linear-gradient(
                0deg,
                transparent,
                transparent 2px,
                rgba(255, 255, 255, 0.03) 2px,
                rgba(255, 255, 255, 0.03) 4px
              )
            `,
            position: 'relative',
            overflow: 'hidden',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          {/* Animated gradient orbs */}
          <div
            style={{
              position: 'absolute',
              top: '10%',
              left: '15%',
              width: '200px',
              height: '200px',
              borderRadius: '50%',
              background:
                'radial-gradient(circle, rgba(139, 92, 246, 0.4) 0%, transparent 70%)',
              filter: 'blur(40px)',
              animation: 'float 8s ease-in-out infinite',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '15%',
              right: '20%',
              width: '250px',
              height: '250px',
              borderRadius: '50%',
              background:
                'radial-gradient(circle, rgba(249, 115, 22, 0.3) 0%, transparent 70%)',
              filter: 'blur(50px)',
              animation: 'float 10s ease-in-out infinite reverse',
            }}
          />

          {/* Main content */}
          <div
            style={{
              position: 'relative',
              zIndex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              maxWidth: '500px',
              padding: '40px',
              textAlign: 'center',
            }}
          >
            {/* Icon container with glow */}
            <div
              style={{
                position: 'relative',
                marginBottom: '32px',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  background:
                    'radial-gradient(circle, rgba(239, 68, 68, 0.3) 0%, transparent 70%)',
                  filter: 'blur(20px)',
                  animation: 'pulse 2s ease-in-out infinite',
                }}
              />
              <div
                style={{
                  position: 'relative',
                  fontSize: '72px',
                  filter: 'drop-shadow(0 0 20px rgba(239, 68, 68, 0.5))',
                }}
              >
                ⚠️
              </div>
            </div>

            {/* Title */}
            <div
              style={{
                fontSize: '28px',
                fontWeight: '700',
                color: '#FFFFFF',
                marginBottom: '12px',
                letterSpacing: '-0.02em',
              }}
            >
              Preview Unavailable
            </div>

            {/* Description */}
            <div
              style={{
                fontSize: '15px',
                color: 'rgba(255, 255, 255, 0.6)',
                lineHeight: '1.6',
                marginBottom: '24px',
              }}
            >
              The component encountered an error during rendering. This usually
              happens due to syntax errors or runtime issues in the generated
              code.
            </div>

            {/* Decorative element */}
            <div
              style={{
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
                padding: '12px 24px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#EF4444',
                  animation: 'blink 1.5s ease-in-out infinite',
                }}
              />
              <span
                style={{
                  fontSize: '13px',
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontWeight: '500',
                  fontFamily: 'ui-monospace, monospace',
                }}
              >
                Check console for details
              </span>
            </div>
          </div>

          {/* Keyframes animation styles */}
          <style>{`
            @keyframes float {
              0%, 100% { transform: translate(0, 0); }
              50% { transform: translate(20px, -20px); }
            }
            
            @keyframes pulse {
              0%, 100% { opacity: 0.6; transform: translate(-50%, -50%) scale(1); }
              50% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
            }
            
            @keyframes blink {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.3; }
            }
          `}</style>
        </div>
      )
    }

    return this.props.children
  }
}

// Auto-fix helper functions
function stripPostCodeCommentary(code: string): {
  code: string
  wasFixed: boolean
} {
  const exportMatch = code.match(
    /export\s+default\s+function\s+App\s*\([^)]*\)\s*\{/,
  )
  if (!exportMatch || exportMatch.index === undefined)
    return { code, wasFixed: false }

  const startIndex = exportMatch.index
  const functionStart = startIndex + exportMatch[0].length
  let braceCount = 1
  let endIndex = functionStart

  for (let i = functionStart; i < code.length; i++) {
    if (code[i] === '{') braceCount++
    if (code[i] === '}') {
      braceCount--
      if (braceCount === 0) {
        endIndex = i + 1
        break
      }
    }
  }

  const afterCode = code.substring(endIndex).trim()
  if (
    afterCode.length > 10 &&
    /^([A-Z]|✅|❌|🎨|\*\*|##|This |The )/.test(afterCode)
  ) {
    console.log('🔧 [AUTO-FIX] Removed LLM commentary after code')
    return { code: code.substring(0, endIndex), wasFixed: true }
  }

  return { code, wasFixed: false }
}

function moveComponentsInsideApp(code: string): {
  code: string
  wasFixed: boolean
  count: number
} {
  const exportMatch = code.match(
    /([\s\S]*?)(export\s+default\s+function\s+App\s*\([^)]*\)\s*\{)/,
  )
  if (!exportMatch) return { code, wasFixed: false, count: 0 }

  const beforeApp = exportMatch[1]
  const exportDeclaration = exportMatch[2]
  const afterExport = code.substring(exportMatch[0].length)
  const componentMatches = [
    ...beforeApp.matchAll(
      /const\s+([A-Z]\w+)\s*=\s*\(\s*\{[^}]*\}\s*\)\s*=>\s*\{/g,
    ),
  ]

  if (componentMatches.length === 0) return { code, wasFixed: false, count: 0 }

  const components: Array<{ name: string; code: string; startIndex: number }> =
    []

  for (const match of componentMatches) {
    if (match.index === undefined) continue
    const componentName = match[1]
    const startIndex = match.index
    const componentStart = startIndex + match[0].length
    let braceCount = 1
    let endIndex = componentStart

    for (let i = componentStart; i < beforeApp.length; i++) {
      if (beforeApp[i] === '{') braceCount++
      if (beforeApp[i] === '}') {
        braceCount--
        if (braceCount === 0) {
          endIndex = i + 1
          while (
            endIndex < beforeApp.length &&
            /[\s;]/.test(beforeApp[endIndex])
          )
            endIndex++
          break
        }
      }
    }

    components.push({
      name: componentName,
      code: beforeApp.substring(startIndex, endIndex).trim(),
      startIndex,
    })
  }

  if (components.length === 0) return { code, wasFixed: false, count: 0 }

  let cleanedBefore = beforeApp
  for (let i = components.length - 1; i >= 0; i--) {
    const comp = components[i]
    cleanedBefore =
      cleanedBefore.substring(0, comp.startIndex) +
      cleanedBefore.substring(comp.startIndex + comp.code.length)
  }

  const componentsCode =
    components.map(c => `  // Auto-moved\n  ${c.code}`).join('\n\n') + '\n'
  console.log(
    `🔧 [AUTO-FIX] Moved ${components.length} component(s) inside App`,
  )

  return {
    code:
      cleanedBefore + exportDeclaration + '\n' + componentsCode + afterExport,
    wasFixed: true,
    count: components.length,
  }
}

interface DynamicReactRendererProps {
  jsxCode: string
  propsToInject?: Record<string, unknown>
}

// Stable empty object to avoid recreating on every render
const EMPTY_PROPS = {}

/**
 * DynamicReactRenderer
 * Evaluates JSX code strings returned from the backend and renders them
 */
export default function DynamicReactRenderer({
  jsxCode,
  propsToInject = EMPTY_PROPS,
}: DynamicReactRendererProps) {
  const [Component, setComponent] = useState<React.ComponentType | null>(null)
  const [error, setError] = useState<string | null>(null)
  const hasWarned = useRef(false)

  useEffect(() => {
    try {
      // Extract JSX code from markdown code blocks if present
      let cleanCode = jsxCode.trim()

      // Remove ```jsx, ```javascript, ```tsx, ```typescript, etc. wrappers
      cleanCode = cleanCode.replace(
        /^```(?:jsx|javascript|tsx|typescript|ts|react)?\s*/m,
        '',
      )
      cleanCode = cleanCode.replace(/```\s*$/m, '')
      cleanCode = cleanCode.trim()

      // Remove standalone language identifiers (typescript, javascript, jsx, etc)
      cleanCode = cleanCode.replace(
        /^(typescript|javascript|jsx|tsx|ts|js|react)\s*$/m,
        '',
      )
      cleanCode = cleanCode.trim()

      // 🛡️ SAFETY: Remove any import statements
      // React hooks are provided as function parameters, imports will break execution
      // This catches cases where LLM ignores prompt instructions
      cleanCode = cleanCode.replace(
        /^import\s+.+?from\s+['"][^'"]+['"]\s*;?\s*$/gm,
        '',
      )
      cleanCode = cleanCode.replace(/^import\s+['"][^'"]+['"]\s*;?\s*$/gm, '')
      // Also catch multi-line imports
      cleanCode = cleanCode.replace(
        /import\s*\{[^}]*\}\s*from\s+['"][^'"]+['"]\s*;?/gm,
        '',
      )
      cleanCode = cleanCode.replace(
        /import\s+\*\s+as\s+\w+\s+from\s+['"][^'"]+['"]\s*;?/gm,
        '',
      )
      cleanCode = cleanCode.trim()

      // 🛡️ SAFETY: Remove any export statements except "export default"
      // We handle "export default" separately below
      cleanCode = cleanCode.replace(/^export\s+\{[^}]*\}\s*;?\s*$/gm, '')
      cleanCode = cleanCode.replace(/^export\s+const\s+/gm, 'const ')
      cleanCode = cleanCode.replace(/^export\s+function\s+/gm, 'function ')
      cleanCode = cleanCode.trim()

      // 🛡️ SAFETY: Remove require() statements (CommonJS imports)
      cleanCode = cleanCode.replace(
        /(?:const|let|var)\s+\w+\s*=\s*require\s*\([^)]+\)\s*;?/gm,
        '',
      )
      cleanCode = cleanCode.trim()

      // 🛡️ SAFETY: Count const/let/var declarations before and after type removal
      const countDeclarations = (code: string) => {
        const matches = code.match(/\b(const|let|var)\s+\w+/g)
        return matches ? matches.length : 0
      }

      const declarationsBefore = countDeclarations(cleanCode)

      // 🛡️ SAFETY: Remove TypeScript type annotations more conservatively
      // Only remove type annotations in parameter lists and after variable names
      // Match patterns like: ` name: Type` or ` name: Type,` or ` name: Type)`
      // But NOT inside strings (which would be after quotes)

      // Remove function parameter type annotations: (param: Type) => (param)
      cleanCode = cleanCode.replace(
        /(\w+)\s*:\s*[A-Z][a-zA-Z0-9<>[\]|\s]*(?=[,)])/g,
        '$1',
      )

      // Remove variable type annotations: const x: Type = ... => const x = ...
      cleanCode = cleanCode.replace(
        /(const|let|var)\s+(\w+)\s*:\s*[A-Z][a-zA-Z0-9<>[\]|\s]+(?=\s*=)/g,
        '$1 $2',
      )

      // Remove interface/type definitions
      cleanCode = cleanCode.replace(/^(interface|type)\s+\w+.*$/gm, '')

      // Remove "as" type assertions
      cleanCode = cleanCode.replace(/\s+as\s+[A-Z]\w+/g, '')

      cleanCode = cleanCode.trim()

      // 🔍 DEBUG: Check if we accidentally removed any declarations
      const declarationsAfter = countDeclarations(cleanCode)
      if (declarationsAfter < declarationsBefore) {
        console.warn(
          `⚠️ Warning: ${declarationsBefore - declarationsAfter} variable declarations were removed during type cleanup!`,
        )
        console.warn('This may cause "X is not defined" errors')
      }

      // Auto-fix LLM code issues
      const fix1 = stripPostCodeCommentary(cleanCode)
      if (fix1.wasFixed) cleanCode = fix1.code

      if (/const\s+[A-Z]\w+\s*=/.test(cleanCode)) {
        if (!hasWarned.current) {
          console.log('⚠️ Components outside App detected - auto-fixing...')
          hasWarned.current = true
        }
        const fix2 = moveComponentsInsideApp(cleanCode)
        if (fix2.wasFixed) cleanCode = fix2.code
      }

      // Transform JSX to JS using Babel (with typescript preset to handle any remaining TS)
      const transformedCode = Babel.transform(cleanCode, {
        presets: ['react', 'typescript'],
        filename: 'dynamic-component.tsx',
      }).code

      if (!transformedCode) {
        throw new Error('Babel transformation failed - empty result')
      }

      // Remove "export default" and extract the function
      let executableCode = transformedCode

      // Remove export default and get just the function
      executableCode = executableCode.replace(/export\s+default\s+/, '')
      executableCode = executableCode.trim()

      // 🛡️ SAFETY: Validate that we have something that looks like a component
      if (
        !executableCode.includes('function') &&
        !executableCode.includes('=>') &&
        !executableCode.includes('React.createElement')
      ) {
        throw new Error('Invalid component - must contain a function or JSX')
      }

      // Check if it starts with "function" keyword
      if (executableCode.trim().startsWith('function')) {
        // Extract the actual function name (handles "function App", "function MyComponent", etc.)
        const functionNameMatch = executableCode.match(
          /function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/,
        )
        const functionName = functionNameMatch ? functionNameMatch[1] : 'App'

        // 🛡️ SAFETY: Ensure function accepts props parameter
        // Check if the function has parameters
        const hasPropsParam = executableCode.match(
          new RegExp(`function\\s+${functionName}\\s*\\([^)]*\\)`),
        )
        if (!hasPropsParam) {
          console.warn(
            'Component function has no parameters - may not receive props',
          )
        }

        // Wrap it and return the actual function name
        const functionBody = `
          ${executableCode}
          return ${functionName};
        `
        // eslint-disable-next-line no-new-func
        const ComponentFactory = new Function(
          'React',
          'useState',
          'useEffect',
          'useCallback',
          'useMemo',
          'useRef',
          functionBody,
        )
        const GeneratedComponent = ComponentFactory(
          React,
          React.useState,
          React.useEffect,
          React.useCallback,
          React.useMemo,
          React.useRef,
        ) as React.ComponentType

        // Wrap to inject props safely
        const WrappedComponent = (props: Record<string, unknown>) => {
          return <GeneratedComponent {...propsToInject} {...props} />
        }

        setComponent(() => WrappedComponent)
        setError(null)
      } else {
        // It's already an expression, evaluate it directly
        // 🛡️ SAFETY: Validate expression looks reasonable
        if (executableCode.length < 10) {
          throw new Error('Component code too short - likely invalid')
        }

        // eslint-disable-next-line no-new-func
        const ComponentFactory = new Function(
          'React',
          'useState',
          'useEffect',
          'useCallback',
          'useMemo',
          'useRef',
          `return ${executableCode}`,
        )
        const GeneratedComponent = ComponentFactory(
          React,
          React.useState,
          React.useEffect,
          React.useCallback,
          React.useMemo,
          React.useRef,
        ) as React.ComponentType

        // Wrap to inject props safely
        const WrappedComponent = (props: Record<string, unknown>) => {
          return <GeneratedComponent {...propsToInject} {...props} />
        }

        setComponent(() => WrappedComponent)
        setError(null)
      }
    } catch (err) {
      console.error('Error rendering dynamic React component:', err)
      console.error('Failed code sample:', jsxCode.slice(0, 500))
      setError(
        err instanceof Error ? err.message : 'Failed to render component',
      )
      setComponent(null)
    }
  }, [jsxCode, propsToInject])

  if (error) {
    return (
      <div
        style={{
          padding: '20px',
          color: '#DC2626',
          background: '#FEE2E2',
          borderRadius: '8px',
          fontFamily: 'monospace',
          fontSize: '14px',
        }}
      >
        <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
          Render Error:
        </div>
        <div>{error}</div>
      </div>
    )
  }

  if (!Component) {
    return (
      <div
        style={{
          padding: '20px',
          color: '#6B7280',
          textAlign: 'center',
        }}
      >
        Loading component...
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <Component />
    </ErrorBoundary>
  )
}
