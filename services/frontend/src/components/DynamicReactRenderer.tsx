import * as Babel from '@babel/standalone'
import React, { useEffect, useState } from 'react'

interface DynamicReactRendererProps {
  jsxCode: string
}

/**
 * DynamicReactRenderer
 * Evaluates JSX code strings returned from the backend and renders them
 */
export default function DynamicReactRenderer({
  jsxCode,
}: DynamicReactRendererProps) {
  const [Component, setComponent] = useState<React.ComponentType | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      // Extract JSX code from markdown code blocks if present
      let cleanCode = jsxCode.trim()

      // Remove ```jsx or ```javascript wrappers
      cleanCode = cleanCode.replace(/^```(?:jsx|javascript|tsx|ts)?\s*/m, '')
      cleanCode = cleanCode.replace(/```\s*$/m, '')
      cleanCode = cleanCode.trim()

      // Transform JSX to JS using Babel
      const transformedCode = Babel.transform(cleanCode, {
        presets: ['react'],
        filename: 'dynamic-component.jsx',
      }).code

      // ✅ FIX: Remove "export default" and extract the function
      // The transformed code looks like: "export default function App() {...}"
      // We need to remove "export default" and just get the function
      let executableCode = transformedCode || ''

      // Remove export default and get just the function
      executableCode = executableCode.replace(/export\s+default\s+/, '')

      // If it's a function declaration like "function App() {...}",
      // we need to wrap it to return the function
      // If it's already an expression like "() => {...}", it's fine

      // Check if it starts with "function" keyword
      if (executableCode.trim().startsWith('function')) {
        // Extract function name and wrap it
        const functionBody = `
          ${executableCode}
          return App;
        `
        // eslint-disable-next-line no-new-func
        const ComponentFactory = new Function('React', functionBody)
        const GeneratedComponent = ComponentFactory(React)
        setComponent(() => GeneratedComponent)
      } else {
        // It's already an expression, evaluate it directly
        // eslint-disable-next-line no-new-func
        const ComponentFactory = new Function(
          'React',
          `return ${executableCode}`,
        )
        const GeneratedComponent = ComponentFactory(React)
        setComponent(() => GeneratedComponent)
      }

      setError(null)
    } catch (err) {
      console.error('Error rendering dynamic React component:', err)
      setError(
        err instanceof Error ? err.message : 'Failed to render component',
      )
      setComponent(null)
    }
  }, [jsxCode])

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

  return <Component />
}
