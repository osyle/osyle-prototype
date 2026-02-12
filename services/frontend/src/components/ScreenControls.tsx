import { Smartphone, Monitor, RotateCcw } from 'lucide-react'

interface ScreenControlsProps {
  // eslint-disable-next-line no-unused-vars
  onPresetResize: (width: number, height: number) => void
  onReset: () => void
}

const PRESETS = [
  { label: '📱 375', width: 375, height: 812, icon: Smartphone },
  { label: '💻 768', width: 768, height: 1024, icon: Monitor },
  { label: '💻 1024', width: 1024, height: 768, icon: Monitor },
  { label: '🖥️ 1440', width: 1440, height: 900, icon: Monitor },
]

export default function ScreenControls({
  onPresetResize,
  onReset,
}: ScreenControlsProps) {
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: -45,
        display: 'flex',
        gap: '8px',
        backgroundColor: 'rgba(31, 31, 32, 0.95)',
        padding: '6px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        zIndex: 1000,
        pointerEvents: 'auto',
      }}
      onClick={e => e.stopPropagation()}
    >
      {PRESETS.map(preset => (
        <button
          key={preset.label}
          onClick={() => onPresetResize(preset.width, preset.height)}
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            padding: '6px 12px',
            fontSize: '12px',
            fontWeight: 600,
            color: 'white',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.2)'
            e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.5)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'
          }}
        >
          {preset.label}
        </button>
      ))}

      <div
        style={{
          width: '1px',
          height: '24px',
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          margin: '0 4px',
        }}
      />

      <button
        onClick={onReset}
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '8px',
          padding: '6px 12px',
          fontSize: '12px',
          fontWeight: 600,
          color: 'white',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'
        }}
      >
        <RotateCcw size={14} />
        Reset
      </button>
    </div>
  )
}
