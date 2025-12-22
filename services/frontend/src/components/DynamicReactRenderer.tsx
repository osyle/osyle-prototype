import * as Babel from '@babel/standalone'
import React, { useEffect, useState } from 'react'

interface DynamicReactRendererProps {
  jsxCode: string
  propsToInject?: Record<string, unknown>
}

/**
 * DynamicReactRenderer
 * Evaluates JSX code strings returned from the backend and renders them
 */
export default function DynamicReactRenderer({
  jsxCode,
  propsToInject = {},
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

      // Remove "export default" and extract the function
      let executableCode = transformedCode || ''

      // Remove export default and get just the function
      executableCode = executableCode.replace(/export\s+default\s+/, '')

      // Check if it starts with "function" keyword
      if (executableCode.trim().startsWith('function')) {
        // Extract function name and wrap it
        const functionBody = `
          ${executableCode}
          return App;
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

        // Wrap to inject props
        const WrappedComponent = (props: Record<string, unknown>) => {
          return <GeneratedComponent {...propsToInject} {...props} />
        }

        setComponent(() => WrappedComponent)
      } else {
        // It's already an expression, evaluate it directly
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

        // Wrap to inject props
        const WrappedComponent = (props: Record<string, unknown>) => {
          return <GeneratedComponent {...propsToInject} {...props} />
        }

        setComponent(() => WrappedComponent)
      }

      setError(null)
    } catch (err) {
      console.error('Error rendering dynamic React component:', err)
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

  return <Component />
}
