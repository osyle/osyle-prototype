import { type ReactNode } from 'react'

/**
 * DeviceFrame — Universal device frame with two variants:
 *
 * "canvas"    — Used on the concept canvas (Figma-style). Decorative border +
 *               shadow only. Content fills 100% of the node dimensions with
 *               no extra pixels added.
 *
 * "prototype" — Used in the Prototype tab / fullscreen runner. Sleek device
 *               shell via CSS shadow + rounded border. Content area is exactly
 *               the container size — no bezel inflation, scrolls internally.
 */

export interface DeviceFrameProps {
  children: ReactNode
  /** @default "prototype" */
  variant?: 'canvas' | 'prototype'
}

export default function DeviceFrame({
  children,
  variant = 'prototype',
}: DeviceFrameProps) {
  if (variant === 'canvas') {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 0 0 1px rgba(0,0,0,0.08), 0 4px 24px rgba(0,0,0,0.12)',
        }}
      >
        <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
          {children}
        </div>
      </div>
    )
  }

  // prototype variant
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        borderRadius: '16px',
        overflow: 'hidden',
        backgroundColor: '#ffffff',
        boxShadow: [
          '0 0 0 1px rgba(0,0,0,0.12)',
          '0 0 0 3px rgba(255,255,255,0.06)',
          '0 8px 32px rgba(0,0,0,0.28)',
          '0 32px 64px rgba(0,0,0,0.2)',
        ].join(', '),
      }}
    >
      <div style={{ width: '100%', height: '100%', overflow: 'auto' }}>
        {children}
      </div>
    </div>
  )
}
