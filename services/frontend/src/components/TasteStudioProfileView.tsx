/**
 * TasteStudioProfileView
 *
 * The flagship visualizer for a synthesized Design Taste Model (DTM / Pass 7).
 * Editorial magazine aesthetic — each section is a full-bleed visual moment.
 */
import { RefreshCw, AlertCircle, Sparkles, Zap } from 'lucide-react'
import React, { useEffect, useState, useRef } from 'react'

// ============================================================================
// TYPES
// ============================================================================

interface ColorEntry {
  hex: string
  role: string
  frequency: number
  contexts?: string[]
  source?: string
}

interface FontFamily {
  name: string
  weights_used: number[]
  source?: string
}

interface DepthPlane {
  level: number
  treatment: string
  css: string
}

interface ConflictResolution {
  dimension: string
  resources_involved?: Record<string, string[]>
  resolution_narrative: string
  resolved_approach: string
  confidence: number
  alternatives?: string
}

interface CrossResourceObsession {
  pattern: string
  universality: string
  application_rule: string
}

interface DTMData {
  taste_id: string
  resource_ids: string[]
  created_at: string
  mode?: string
  consensus_narrative?: {
    spatial_philosophy?: string
    color_relationships?: string
    typography_philosophy?: string
    surface_treatment?: string
    component_vocabulary?: string
    image_integration?: string
  }
  conflict_resolutions?: ConflictResolution[]
  unified_personality?: {
    design_lineage?: string
    emotional_register?: string
    decision_heuristics?: {
      complexity_approach?: string
      drama_vs_usability?: string
      density_preference?: string
      color_philosophy?: string
      spacing_philosophy?: string
    }
    cross_resource_obsessions?: CrossResourceObsession[]
    universal_absences?: string[]
  }
  consolidated_tokens?: {
    colors?: {
      exact_palette?: ColorEntry[]
      temperature?: string
      saturation_profile?: string
      relationships?: string
    }
    typography?: {
      families?: FontFamily[]
      sizes_used?: number[]
      scale_metrics?: { ratio_mean?: number; ratio_consistency?: number }
      weight_frequencies?: Record<
        string,
        { frequency: number; contexts: string[] }
      >
      exact_line_heights?: Record<string, number>
      exact_letter_spacing?: Record<string, string>
      system_narrative?: string
    }
    spacing?: {
      quantum?: string
      scale?: number[]
      consistency?: number
    }
    materials?: {
      primary_language?: string
      depth_planes?: DepthPlane[]
    }
    components?: Array<{
      type: string
      variants?: string[]
      narratives?: Record<string, string>
      source?: string
    }>
  }
  generation_guidance?: {
    confidence_by_domain?: Record<string, number>
  }
}

interface Props {
  tasteId: string
  tasteName: string
  dtm: DTMData | null
  loading: boolean
  error: string | null
  onRebuild?: () => void
  resourceCount?: number
}

// ============================================================================
// UTILITIES
// ============================================================================

function getContrastColor(hex: string): string {
  try {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    return lum > 0.55 ? '#1F1F20' : '#FFFFFF'
  } catch {
    return '#1F1F20'
  }
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  try {
    return {
      r: parseInt(hex.slice(1, 3), 16),
      g: parseInt(hex.slice(3, 5), 16),
      b: parseInt(hex.slice(5, 7), 16),
    }
  } catch {
    return null
  }
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

// Animated confidence ring (SVG arc)
const ConfidenceRing: React.FC<{
  score: number
  label: string
  color: string
  delay?: number
}> = ({ score, label, color, delay = 0 }) => {
  const [animated, setAnimated] = useState(false)
  const r = 32
  const cx = 40
  const cy = 40
  const circumference = 2 * Math.PI * r

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), delay)
    return () => clearTimeout(t)
  }, [delay])

  const arc = animated ? circumference * score : 0

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <svg width={80} height={80} style={{ transform: 'rotate(-90deg)' }}>
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="#E8E1DD"
            strokeWidth={6}
          />
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={6}
            strokeLinecap="round"
            strokeDasharray={`${arc} ${circumference}`}
            style={{
              transition:
                'stroke-dasharray 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          />
        </svg>
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ transform: 'rotate(0deg)' }}
        >
          <span className="text-sm font-bold" style={{ color: '#1F1F20' }}>
            {Math.round(score * 100)}
          </span>
        </div>
      </div>
      <span
        className="text-xs font-medium uppercase tracking-widest"
        style={{ color: '#929397', letterSpacing: '0.1em' }}
      >
        {label}
      </span>
    </div>
  )
}

// Section header with editorial label
const SectionLabel: React.FC<{
  number: string
  title: string
  light?: boolean
}> = ({ number, title, light = false }) => (
  <div className="flex items-center gap-4 mb-8">
    <span
      className="text-xs font-bold uppercase"
      style={{
        color: light ? 'rgba(255,255,255,0.4)' : '#929397',
        letterSpacing: '0.2em',
        fontFamily: 'monospace',
      }}
    >
      {number}
    </span>
    <div
      className="flex-1 h-px"
      style={{ backgroundColor: light ? 'rgba(255,255,255,0.15)' : '#E8E1DD' }}
    />
    <span
      className="text-xs font-bold uppercase"
      style={{
        color: light ? 'rgba(255,255,255,0.6)' : '#3B3B3B',
        letterSpacing: '0.25em',
      }}
    >
      {title}
    </span>
  </div>
)

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const TasteStudioProfileView: React.FC<Props> = ({
  tasteName,
  dtm,
  loading,
  error,
  onRebuild,
  resourceCount = 0,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [fontsLoaded, setFontsLoaded] = useState<Record<string, boolean>>({})

  // Load Google Fonts for the taste's typography
  useEffect(() => {
    if (!dtm?.consolidated_tokens?.typography?.families) return
    dtm.consolidated_tokens.typography.families.forEach(fam => {
      if (fontsLoaded[fam.name]) return
      try {
        const weights = (fam.weights_used || [400]).join(';')
        const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fam.name)}:wght@${weights}&display=swap`
        const link = document.createElement('link')
        link.href = url
        link.rel = 'stylesheet'
        document.head.appendChild(link)
        setFontsLoaded(prev => ({ ...prev, [fam.name]: true }))
      } catch {
        // ignore font load failures
      }
    })
  }, [dtm, fontsLoaded])

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '24px',
        }}
      >
        <div
          className="w-16 h-16 rounded-full border-4 animate-spin"
          style={{ borderColor: '#E8E1DD', borderTopColor: '#F5C563' }}
        />
        <div className="text-center">
          <p className="text-base font-medium" style={{ color: '#3B3B3B' }}>
            Loading Taste Profile
          </p>
          <p className="text-sm mt-1" style={{ color: '#929397' }}>
            Reading design intelligence…
          </p>
        </div>
      </div>
    )
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
        }}
      >
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{ backgroundColor: '#FEE2E2' }}
        >
          <AlertCircle size={28} style={{ color: '#DC2626' }} />
        </div>
        <p className="text-sm" style={{ color: '#929397' }}>
          {error}
        </p>
        {onRebuild && (
          <button
            onClick={onRebuild}
            className="px-5 py-2 rounded-full text-sm font-medium transition-all hover:scale-105"
            style={{ backgroundColor: '#F5C563', color: '#1F1F20' }}
          >
            Build Taste Model
          </button>
        )}
      </div>
    )
  }

  // ── No DTM state ──────────────────────────────────────────────────────────
  if (!dtm) {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '24px',
          padding: '0 32px',
        }}
      >
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, #F5C563 0%, #F59E0B 100%)',
            boxShadow: '0 12px 32px rgba(245,197,99,0.4)',
          }}
        >
          <Sparkles size={36} style={{ color: '#FFFFFF' }} />
        </div>
        <div className="text-center max-w-sm">
          <h3
            className="text-xl font-semibold mb-2"
            style={{ color: '#3B3B3B' }}
          >
            No Taste Profile Yet
          </h3>
          <p className="text-sm leading-relaxed" style={{ color: '#929397' }}>
            Add at least 2 resources to this taste and build the model to see a
            synthesized taste profile here.
          </p>
        </div>
        {onRebuild && resourceCount >= 2 && (
          <button
            onClick={onRebuild}
            className="px-6 py-3 rounded-full text-sm font-semibold transition-all hover:scale-105 flex items-center gap-2"
            style={{
              backgroundColor: '#F5C563',
              color: '#1F1F20',
              boxShadow: '0 4px 16px rgba(245,197,99,0.4)',
            }}
          >
            <Sparkles size={16} />
            Build Taste Profile
          </button>
        )}
      </div>
    )
  }

  // ── Extract data ──────────────────────────────────────────────────────────
  const tokens = dtm.consolidated_tokens || {}
  const colors = tokens.colors || {}
  const palette: ColorEntry[] = colors.exact_palette || []
  const typography = tokens.typography || {}
  const spacing = tokens.spacing || {}
  const materials = tokens.materials || {}
  const personality = dtm.unified_personality || {}
  const consensus = dtm.consensus_narrative || {}
  const confidence = dtm.generation_guidance?.confidence_by_domain || {}
  const conflicts = dtm.conflict_resolutions || []
  const fonts = typography.families || []
  const primaryFont = fonts[0]
  const sizesUsed = (typography.sizes_used || []).sort((a, b) => a - b)
  const spacingScale = spacing.scale || []
  const depthPlanes = materials.depth_planes || []
  const obsessions = personality.cross_resource_obsessions || []
  const absences = personality.universal_absences || []

  // Dominant colors for hero gradient
  const dominantColors = palette.slice(0, 3)
  const accentColor =
    palette.find(c =>
      ['accent', 'primary', 'brand', 'cta'].some(k =>
        c.role?.toLowerCase().includes(k),
      ),
    )?.hex || '#F5C563'

  const heroGradient =
    dominantColors.length >= 2
      ? `linear-gradient(135deg, ${dominantColors[0]?.hex}20 0%, ${dominantColors[1]?.hex}15 50%, ${dominantColors[2]?.hex || dominantColors[0]?.hex}10 100%)`
      : 'linear-gradient(135deg, #F5C56310 0%, #4A90E210 100%)'

  const confidenceItems = [
    { key: 'overall', label: 'Overall', color: '#F5C563' },
    { key: 'colors', label: 'Colors', color: '#EF4444' },
    { key: 'typography', label: 'Type', color: '#8B5CF6' },
    { key: 'spacing', label: 'Space', color: '#10B981' },
    { key: 'components', label: 'Comp.', color: '#3B82F6' },
  ]

  return (
    <div
      ref={scrollRef}
      style={{
        position: 'absolute',
        inset: 0,
        overflowY: 'auto',
        scrollBehavior: 'smooth',
      }}
    >
      {/* ================================================================
          HERO — Taste Identity
      ================================================================ */}
      <div
        className="relative px-8 py-10"
        style={{ background: heroGradient, borderBottom: '1px solid #E8E1DD' }}
      >
        {/* Background number decoration */}
        <div
          className="absolute right-8 top-4 text-9xl font-black select-none pointer-events-none"
          style={{ color: 'rgba(0,0,0,0.03)', lineHeight: 1 }}
        >
          DTM
        </div>

        <div className="relative flex items-start justify-between gap-8">
          {/* Left: identity */}
          <div className="flex-1 min-w-0">
            <div
              className="text-xs font-bold uppercase mb-3"
              style={{ color: '#929397', letterSpacing: '0.25em' }}
            >
              Design Taste Model
            </div>
            <h1
              className="text-4xl font-light mb-2 truncate"
              style={{ color: '#1F1F20', letterSpacing: '-0.02em' }}
            >
              {tasteName}
            </h1>
            <div className="flex items-center gap-4 mt-3">
              <span
                className="text-xs px-3 py-1 rounded-full font-medium"
                style={{ backgroundColor: '#1F1F2012', color: '#3B3B3B' }}
              >
                {dtm.resource_ids.length} resource
                {dtm.resource_ids.length !== 1 ? 's' : ''}
              </span>
              {dtm.mode && (
                <span
                  className="text-xs px-3 py-1 rounded-full font-medium capitalize"
                  style={{ backgroundColor: '#F5C56320', color: '#92690A' }}
                >
                  {dtm.mode.replace(/_/g, ' ')}
                </span>
              )}
              {dtm.created_at && (
                <span className="text-xs" style={{ color: '#929397' }}>
                  Built{' '}
                  {new Date(dtm.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              )}
            </div>
          </div>

          {/* Right: confidence rings */}
          <div className="flex items-center gap-4 flex-shrink-0">
            {confidenceItems
              .filter(item => confidence[item.key] !== undefined)
              .map((item, i) => (
                <ConfidenceRing
                  key={item.key}
                  score={confidence[item.key] || 0}
                  label={item.label}
                  color={item.color}
                  delay={i * 150}
                />
              ))}
          </div>
        </div>

        {/* Rebuild button */}
        {onRebuild && (
          <button
            onClick={onRebuild}
            className="absolute top-6 right-8 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-all hover:scale-105"
            style={{
              backgroundColor: 'rgba(255,255,255,0.7)',
              color: '#929397',
            }}
          >
            <RefreshCw size={12} />
            Rebuild
          </button>
        )}
      </div>

      <div className="px-8 py-8 space-y-12">
        {/* ================================================================
            01 — COLOR STORY
        ================================================================ */}
        {palette.length > 0 && (
          <section>
            <SectionLabel number="01" title="Color Story" />

            {/* Palette orbs */}
            <div className="flex flex-wrap gap-5 mb-8">
              {palette.map((color, i) => {
                const rgb = hexToRgb(color.hex)
                const glowColor = rgb
                  ? `rgba(${rgb.r},${rgb.g},${rgb.b},0.35)`
                  : 'rgba(0,0,0,0.1)'
                return (
                  <div
                    key={i}
                    className="flex flex-col items-center gap-2 group cursor-default"
                    style={{
                      animation: `fadeSlideUp 0.5s ease forwards`,
                      animationDelay: `${i * 60}ms`,
                      opacity: 0,
                    }}
                  >
                    <div
                      className="rounded-full transition-transform duration-300 group-hover:scale-110"
                      style={{
                        width: 64,
                        height: 64,
                        backgroundColor: color.hex,
                        boxShadow: `0 8px 24px ${glowColor}`,
                      }}
                    />
                    <div className="text-center">
                      <p
                        className="text-xs font-mono font-medium"
                        style={{ color: '#3B3B3B' }}
                      >
                        {color.hex.toUpperCase()}
                      </p>
                      <p
                        className="text-xs capitalize"
                        style={{
                          color: '#929397',
                          maxWidth: 72,
                          lineHeight: 1.3,
                        }}
                      >
                        {color.role?.replace(/_/g, ' ')}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Full-width gradient strip */}
            {palette.length >= 2 && (
              <div
                className="w-full h-3 rounded-full mb-6"
                style={{
                  background: `linear-gradient(to right, ${palette.map(c => c.hex).join(', ')})`,
                  boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                }}
              />
            )}

            {/* Narrative quotes */}
            <div className="grid grid-cols-2 gap-6">
              {colors.temperature && (
                <div
                  className="rounded-2xl p-5"
                  style={{ backgroundColor: '#F7F5F3' }}
                >
                  <p
                    className="text-xs uppercase font-bold mb-2"
                    style={{ color: '#929397', letterSpacing: '0.15em' }}
                  >
                    Temperature
                  </p>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: '#3B3B3B' }}
                  >
                    {colors.temperature}
                  </p>
                </div>
              )}
              {colors.saturation_profile && (
                <div
                  className="rounded-2xl p-5"
                  style={{ backgroundColor: '#F7F5F3' }}
                >
                  <p
                    className="text-xs uppercase font-bold mb-2"
                    style={{ color: '#929397', letterSpacing: '0.15em' }}
                  >
                    Saturation
                  </p>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: '#3B3B3B' }}
                  >
                    {colors.saturation_profile}
                  </p>
                </div>
              )}
              {colors.relationships && (
                <div
                  className="col-span-2 rounded-2xl p-5"
                  style={{ backgroundColor: '#F7F5F3' }}
                >
                  <p
                    className="text-xs uppercase font-bold mb-2"
                    style={{ color: '#929397', letterSpacing: '0.15em' }}
                  >
                    Relationships
                  </p>
                  <p
                    className="text-sm leading-relaxed italic"
                    style={{ color: '#3B3B3B' }}
                  >
                    {colors.relationships}
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ================================================================
            02 — TYPOGRAPHY
        ================================================================ */}
        {(primaryFont || sizesUsed.length > 0) && (
          <section>
            <SectionLabel number="02" title="Typography" />

            {primaryFont && (
              <>
                {/* Giant specimen */}
                <div
                  className="rounded-3xl overflow-hidden mb-6"
                  style={{ backgroundColor: '#1F1F20', minHeight: 200 }}
                >
                  <div className="p-8 flex items-end justify-between gap-6">
                    {/* Giant character */}
                    <div
                      style={{
                        fontFamily: `'${primaryFont.name}', serif`,
                        fontSize: 140,
                        fontWeight: 700,
                        lineHeight: 1,
                        color: accentColor,
                        letterSpacing: '-0.04em',
                        textShadow: `0 0 60px ${accentColor}40`,
                        userSelect: 'none',
                      }}
                    >
                      Ag
                    </div>

                    {/* Font info */}
                    <div className="pb-2">
                      <p
                        className="text-3xl font-light mb-1"
                        style={{
                          color: 'rgba(255,255,255,0.9)',
                          fontFamily: `'${primaryFont.name}', serif`,
                        }}
                      >
                        {primaryFont.name}
                      </p>
                      <p
                        style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}
                      >
                        Primary typeface
                      </p>

                      {/* Weight pills */}
                      <div className="flex gap-2 mt-4 flex-wrap">
                        {(primaryFont.weights_used || []).map(w => (
                          <span
                            key={w}
                            className="px-3 py-1 rounded-full text-xs"
                            style={{
                              fontFamily: `'${primaryFont.name}', serif`,
                              fontWeight: w,
                              backgroundColor: 'rgba(255,255,255,0.1)',
                              color: 'rgba(255,255,255,0.8)',
                            }}
                          >
                            {w}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Pangram at body weight */}
                  <div
                    className="px-8 pb-6"
                    style={{
                      fontFamily: `'${primaryFont.name}', serif`,
                      fontSize: 15,
                      color: 'rgba(255,255,255,0.5)',
                      borderTop: '1px solid rgba(255,255,255,0.08)',
                      paddingTop: 16,
                    }}
                  >
                    The quick brown fox jumps over the lazy dog — 0123456789
                  </div>
                </div>

                {/* Second font if exists */}
                {fonts[1] && (
                  <div
                    className="rounded-2xl p-5 mb-6 flex items-center gap-6"
                    style={{ backgroundColor: '#F7F5F3' }}
                  >
                    <div
                      style={{
                        fontFamily: `'${fonts[1].name}', monospace`,
                        fontSize: 48,
                        fontWeight: 400,
                        color: '#3B3B3B',
                        lineHeight: 1,
                      }}
                    >
                      Aa
                    </div>
                    <div>
                      <p
                        className="font-semibold text-base"
                        style={{ color: '#1F1F20' }}
                      >
                        {fonts[1].name}
                      </p>
                      <p className="text-sm" style={{ color: '#929397' }}>
                        Secondary typeface
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Type scale ladder */}
            {sizesUsed.length > 0 && (
              <div
                className="rounded-2xl p-6 space-y-3"
                style={{ backgroundColor: '#F7F5F3' }}
              >
                <p
                  className="text-xs font-bold uppercase mb-4"
                  style={{ color: '#929397', letterSpacing: '0.15em' }}
                >
                  Type Scale — {sizesUsed.length} steps
                </p>
                {[...sizesUsed].reverse().map(size => (
                  <div key={size} className="flex items-baseline gap-4">
                    <span
                      className="text-xs font-mono w-10 text-right flex-shrink-0"
                      style={{ color: '#C0B8B0' }}
                    >
                      {size}
                    </span>
                    <div
                      style={{
                        fontFamily: primaryFont
                          ? `'${primaryFont.name}', serif`
                          : 'inherit',
                        fontSize: Math.min(size, 48),
                        lineHeight: 1.1,
                        color: '#1F1F20',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis',
                        maxWidth: '100%',
                      }}
                    >
                      {size >= 32
                        ? 'Display Heading'
                        : size >= 20
                          ? 'Section Title'
                          : size >= 16
                            ? 'Body text — readable at this scale'
                            : 'Small label or caption text at this size'}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Weight specimens */}
            {primaryFont && primaryFont.weights_used?.length > 1 && (
              <div className="mt-4 grid grid-cols-4 gap-3">
                {primaryFont.weights_used.map(w => {
                  const labels: Record<number, string> = {
                    100: 'Thin',
                    200: 'ExLight',
                    300: 'Light',
                    400: 'Regular',
                    500: 'Medium',
                    600: 'SemiBold',
                    700: 'Bold',
                    800: 'ExBold',
                    900: 'Black',
                  }
                  return (
                    <div
                      key={w}
                      className="rounded-xl p-4"
                      style={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E8E1DD',
                      }}
                    >
                      <p
                        style={{
                          fontFamily: `'${primaryFont.name}', serif`,
                          fontWeight: w,
                          fontSize: 20,
                          color: '#1F1F20',
                          lineHeight: 1.2,
                          marginBottom: 6,
                        }}
                      >
                        Aa
                      </p>
                      <p className="text-xs" style={{ color: '#929397' }}>
                        {labels[w] || `${w}`}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Typography narrative */}
            {(consensus.typography_philosophy ||
              typography.system_narrative) && (
              <div
                className="mt-4 rounded-2xl p-5"
                style={{ backgroundColor: '#F7F5F3' }}
              >
                <p
                  className="text-xs uppercase font-bold mb-2"
                  style={{ color: '#929397', letterSpacing: '0.15em' }}
                >
                  Type Philosophy
                </p>
                <p
                  className="text-sm leading-relaxed italic"
                  style={{ color: '#3B3B3B' }}
                >
                  {consensus.typography_philosophy ||
                    typography.system_narrative}
                </p>
              </div>
            )}
          </section>
        )}

        {/* ================================================================
            03 — SURFACE & MATERIALS
        ================================================================ */}
        {(depthPlanes.length > 0 ||
          materials.primary_language ||
          consensus.surface_treatment) && (
          <section>
            <SectionLabel number="03" title="Surface & Materials" />

            {/* Depth planes as stacked visual cards */}
            {depthPlanes.length > 0 && (
              <div className="mb-6">
                <p
                  className="text-xs font-bold uppercase mb-4"
                  style={{ color: '#929397', letterSpacing: '0.15em' }}
                >
                  Depth Planes — {depthPlanes.length} layers
                </p>
                <div className="flex gap-4 flex-wrap">
                  {depthPlanes.map((plane, i) => (
                    <div
                      key={i}
                      className="rounded-2xl p-5 flex-1"
                      style={{
                        minWidth: 140,
                        maxWidth: 200,
                        ...(plane.css
                          ? Object.fromEntries(
                              plane.css
                                .split(';')
                                .map(s => s.trim())
                                .filter(Boolean)
                                .map(s => {
                                  const [k, v] = s.split(':').map(x => x.trim())
                                  // Convert kebab-case to camelCase
                                  const camel = k?.replace(
                                    /-([a-z])/g,
                                    (_, c) => c.toUpperCase(),
                                  )
                                  return [camel, v]
                                })
                                .filter(([k]) => k),
                            )
                          : { backgroundColor: '#F7F5F3' }),
                        boxShadow:
                          plane.level > 0
                            ? `0 ${plane.level * 4}px ${plane.level * 12}px rgba(0,0,0,0.08)`
                            : 'none',
                        border: '1px solid rgba(0,0,0,0.06)',
                      }}
                    >
                      <p
                        className="text-xs font-bold uppercase mb-1"
                        style={{ color: '#929397', letterSpacing: '0.12em' }}
                      >
                        Level {plane.level}
                      </p>
                      <p
                        className="text-sm capitalize"
                        style={{ color: '#3B3B3B' }}
                      >
                        {plane.treatment?.replace(/_/g, ' ')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {materials.primary_language && (
              <div
                className="rounded-2xl p-5"
                style={{ backgroundColor: '#F7F5F3' }}
              >
                <p
                  className="text-xs uppercase font-bold mb-2"
                  style={{ color: '#929397', letterSpacing: '0.15em' }}
                >
                  Material Language
                </p>
                <p
                  className="text-sm leading-relaxed italic"
                  style={{ color: '#3B3B3B' }}
                >
                  {materials.primary_language}
                </p>
              </div>
            )}

            {consensus.surface_treatment && !materials.primary_language && (
              <div
                className="rounded-2xl p-5"
                style={{ backgroundColor: '#F7F5F3' }}
              >
                <p
                  className="text-xs uppercase font-bold mb-2"
                  style={{ color: '#929397', letterSpacing: '0.15em' }}
                >
                  Surface Treatment
                </p>
                <p
                  className="text-sm leading-relaxed italic"
                  style={{ color: '#3B3B3B' }}
                >
                  {consensus.surface_treatment}
                </p>
              </div>
            )}
          </section>
        )}

        {/* ================================================================
            04 — SPACE & RHYTHM
        ================================================================ */}
        {(spacing.quantum ||
          spacingScale.length > 0 ||
          consensus.spatial_philosophy) && (
          <section>
            <SectionLabel number="04" title="Space &amp; Rhythm" />

            {spacing.quantum && (
              <div className="flex items-center gap-6 mb-6">
                {/* Quantum number — big */}
                <div
                  className="rounded-2xl px-8 py-5 flex flex-col items-center justify-center flex-shrink-0"
                  style={{
                    backgroundColor: accentColor,
                    boxShadow: `0 8px 32px ${accentColor}50`,
                  }}
                >
                  <span
                    className="text-4xl font-black"
                    style={{
                      color: getContrastColor(accentColor),
                      lineHeight: 1,
                    }}
                  >
                    {spacing.quantum}
                  </span>
                  <span
                    className="text-xs uppercase mt-1 font-bold"
                    style={{
                      color: `${getContrastColor(accentColor)}80`,
                      letterSpacing: '0.15em',
                    }}
                  >
                    Quantum
                  </span>
                </div>

                {/* Consistency bar */}
                {spacing.consistency !== undefined && (
                  <div className="flex-1">
                    <div className="flex justify-between mb-2">
                      <span
                        className="text-xs font-bold uppercase"
                        style={{ color: '#929397', letterSpacing: '0.12em' }}
                      >
                        Scale Consistency
                      </span>
                      <span
                        className="text-xs font-bold"
                        style={{ color: '#3B3B3B' }}
                      >
                        {Math.round(spacing.consistency * 100)}%
                      </span>
                    </div>
                    <div
                      className="h-2 rounded-full overflow-hidden"
                      style={{ backgroundColor: '#E8E1DD' }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${spacing.consistency * 100}%`,
                          backgroundColor: '#10B981',
                          boxShadow: '0 0 8px rgba(16,185,129,0.4)',
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Spacing scale visual */}
            {spacingScale.length > 0 && (
              <div
                className="rounded-2xl p-6 mb-4"
                style={{ backgroundColor: '#F7F5F3' }}
              >
                <p
                  className="text-xs font-bold uppercase mb-4"
                  style={{ color: '#929397', letterSpacing: '0.15em' }}
                >
                  Spacing Scale
                </p>
                <div className="space-y-2">
                  {spacingScale.map((val, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span
                        className="text-xs font-mono w-8 text-right"
                        style={{ color: '#C0B8B0' }}
                      >
                        {val}
                      </span>
                      <div
                        className="h-5 rounded-md"
                        style={{
                          width: Math.min(val * 2.5, 320),
                          minWidth: 8,
                          backgroundColor: accentColor,
                          opacity: 0.15 + (i / spacingScale.length) * 0.7,
                        }}
                      />
                      <span className="text-xs" style={{ color: '#C0B8B0' }}>
                        px
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {consensus.spatial_philosophy && (
              <div
                className="rounded-2xl p-5"
                style={{ backgroundColor: '#F7F5F3' }}
              >
                <p
                  className="text-xs uppercase font-bold mb-2"
                  style={{ color: '#929397', letterSpacing: '0.15em' }}
                >
                  Spatial Philosophy
                </p>
                <p
                  className="text-sm leading-relaxed italic"
                  style={{ color: '#3B3B3B' }}
                >
                  {consensus.spatial_philosophy}
                </p>
              </div>
            )}
          </section>
        )}

        {/* ================================================================
            05 — DESIGN PERSONALITY
        ================================================================ */}
        {(personality.design_lineage ||
          personality.emotional_register ||
          obsessions.length > 0) && (
          <section>
            <div
              className="rounded-3xl overflow-hidden"
              style={{ backgroundColor: '#1F1F20' }}
            >
              <div className="px-8 py-8">
                <SectionLabel number="05" title="Design Intelligence" light />

                {/* Design lineage */}
                {personality.design_lineage && (
                  <div className="mb-8">
                    <p
                      className="text-xs uppercase font-bold mb-3"
                      style={{
                        color: 'rgba(255,255,255,0.3)',
                        letterSpacing: '0.2em',
                      }}
                    >
                      Design Lineage
                    </p>
                    <p
                      className="text-base leading-relaxed"
                      style={{
                        color: 'rgba(255,255,255,0.85)',
                        fontStyle: 'italic',
                        lineHeight: 1.7,
                        borderLeft: `3px solid ${accentColor}`,
                        paddingLeft: 16,
                      }}
                    >
                      {personality.design_lineage}
                    </p>
                  </div>
                )}

                {/* Emotional register */}
                {personality.emotional_register && (
                  <div className="mb-8">
                    <p
                      className="text-xs uppercase font-bold mb-3"
                      style={{
                        color: 'rgba(255,255,255,0.3)',
                        letterSpacing: '0.2em',
                      }}
                    >
                      Emotional Register
                    </p>
                    <p
                      className="text-sm leading-relaxed"
                      style={{
                        color: 'rgba(255,255,255,0.6)',
                        lineHeight: 1.7,
                      }}
                    >
                      {personality.emotional_register}
                    </p>
                  </div>
                )}

                {/* Decision heuristics grid */}
                {personality.decision_heuristics && (
                  <div className="mb-8">
                    <p
                      className="text-xs uppercase font-bold mb-3"
                      style={{
                        color: 'rgba(255,255,255,0.3)',
                        letterSpacing: '0.2em',
                      }}
                    >
                      Decision Heuristics
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(personality.decision_heuristics)
                        .filter(([, v]) => v)
                        .map(([key, value]) => (
                          <div
                            key={key}
                            className="rounded-xl p-3"
                            style={{
                              backgroundColor: 'rgba(255,255,255,0.05)',
                            }}
                          >
                            <p
                              className="text-xs uppercase font-bold mb-1"
                              style={{
                                color: accentColor,
                                letterSpacing: '0.12em',
                                opacity: 0.9,
                              }}
                            >
                              {key.replace(/_/g, ' ')}
                            </p>
                            <p
                              className="text-xs leading-relaxed"
                              style={{ color: 'rgba(255,255,255,0.55)' }}
                            >
                              {value as string}
                            </p>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Signature obsessions */}
                {obsessions.length > 0 && (
                  <div className="mb-8">
                    <p
                      className="text-xs uppercase font-bold mb-3 flex items-center gap-2"
                      style={{
                        color: 'rgba(255,255,255,0.3)',
                        letterSpacing: '0.2em',
                      }}
                    >
                      <Zap size={12} style={{ color: accentColor }} />
                      Signature Obsessions
                    </p>
                    <div className="space-y-3">
                      {obsessions.map((obs, i) => (
                        <div
                          key={i}
                          className="rounded-xl p-4 flex items-start gap-3"
                          style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
                        >
                          <div
                            className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                            style={{ backgroundColor: accentColor }}
                          />
                          <div>
                            <p
                              className="text-sm font-medium mb-1"
                              style={{ color: 'rgba(255,255,255,0.8)' }}
                            >
                              {obs.pattern}
                            </p>
                            <p
                              className="text-xs"
                              style={{ color: 'rgba(255,255,255,0.35)' }}
                            >
                              {obs.universality}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Universal absences */}
                {absences.length > 0 && (
                  <div>
                    <p
                      className="text-xs uppercase font-bold mb-3"
                      style={{
                        color: 'rgba(255,255,255,0.3)',
                        letterSpacing: '0.2em',
                      }}
                    >
                      Never Does
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {absences.map((ab, i) => (
                        <span
                          key={i}
                          className="text-xs px-3 py-1.5 rounded-full"
                          style={{
                            backgroundColor: 'rgba(255,255,255,0.06)',
                            color: 'rgba(255,255,255,0.4)',
                            textDecoration: 'line-through',
                            textDecorationColor: 'rgba(255,255,255,0.2)',
                          }}
                        >
                          {ab}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ================================================================
            06 — RESOLVED CONFLICTS
        ================================================================ */}
        {conflicts.length > 0 && (
          <section>
            <SectionLabel number="06" title="Resolved Tensions" />
            <div className="space-y-3">
              {conflicts.map((conflict, i) => (
                <details
                  key={i}
                  className="group rounded-2xl overflow-hidden"
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E8E1DD',
                  }}
                >
                  <summary
                    className="flex items-center justify-between px-5 py-4 cursor-pointer list-none"
                    style={{ userSelect: 'none' }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-1.5 h-6 rounded-full"
                        style={{
                          backgroundColor:
                            conflict.confidence > 0.7
                              ? '#10B981'
                              : conflict.confidence > 0.4
                                ? '#F59E0B'
                                : '#EF4444',
                        }}
                      />
                      <span
                        className="text-sm font-semibold"
                        style={{ color: '#1F1F20' }}
                      >
                        {conflict.dimension}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className="text-xs px-2.5 py-1 rounded-full"
                        style={{ backgroundColor: '#F7F5F3', color: '#929397' }}
                      >
                        {Math.round(conflict.confidence * 100)}% confidence
                      </span>
                      <svg
                        className="w-4 h-4 transition-transform group-open:rotate-180"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        style={{ color: '#929397' }}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </summary>
                  <div className="px-5 pb-5 space-y-3">
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: '#3B3B3B' }}
                    >
                      {conflict.resolution_narrative}
                    </p>
                    <div
                      className="rounded-xl p-3"
                      style={{ backgroundColor: '#F7F5F3' }}
                    >
                      <p
                        className="text-xs font-bold uppercase mb-1"
                        style={{ color: '#929397', letterSpacing: '0.12em' }}
                      >
                        Resolution
                      </p>
                      <p
                        className="text-sm font-medium"
                        style={{ color: '#1F1F20' }}
                      >
                        {conflict.resolved_approach}
                      </p>
                    </div>
                    {conflict.alternatives && (
                      <p
                        className="text-xs italic"
                        style={{ color: '#929397' }}
                      >
                        Alternatives: {conflict.alternatives}
                      </p>
                    )}
                  </div>
                </details>
              ))}
            </div>
          </section>
        )}

        {/* ================================================================
            07 — COMPONENT VOCABULARY (from consensus)
        ================================================================ */}
        {consensus.component_vocabulary && (
          <section>
            <SectionLabel number="07" title="Component Vocabulary" />
            <div
              className="rounded-2xl p-5"
              style={{ backgroundColor: '#F7F5F3' }}
            >
              <p
                className="text-sm leading-relaxed italic"
                style={{ color: '#3B3B3B' }}
              >
                {consensus.component_vocabulary}
              </p>
            </div>
          </section>
        )}

        {/* bottom padding */}
        <div style={{ height: 48 }} />
      </div>

      {/* Keyframe animations injected */}
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

export default TasteStudioProfileView
