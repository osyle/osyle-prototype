import * as Babel from '@babel/standalone'
import React, {
  useEffect,
  useState,
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
            backgroundColor: '#F5F5F5',
            borderRadius: '8px',
            padding: '20px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎨</div>
          <div
            style={{ fontSize: '14px', color: '#666666', fontWeight: '500' }}
          >
            Preview Unavailable
          </div>
        </div>
      )
    }

    return this.props.children
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
