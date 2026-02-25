/**
 * TasteStudioDTRView
 *
 * Per-resource DTR (Design Taste Representation) viewer.
 * Shows a resource selector on the left, rich pass-by-pass breakdown on the right.
 */
import {
  Image as ImageIcon,
  FileJson,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react'
import React, { useState, useEffect } from 'react'
import api, { type DTRPassData } from '../services/api'
import { type TasteDisplay } from '../types/home.types'

// ============================================================================
// TYPES
// ============================================================================

interface Props {
  taste: TasteDisplay | null
}

interface PassTab {
  key: string
  label: string
  number: string
}

const PASS_TABS: PassTab[] = [
  { key: 'pass_1_structure', label: 'Structure', number: '1' },
  { key: 'pass_2_surface', label: 'Surface', number: '2' },
  { key: 'pass_3_typography', label: 'Typography', number: '3' },
  { key: 'pass_4_image_usage', label: 'Images', number: '4' },
  { key: 'pass_5_components', label: 'Components', number: '5' },
  { key: 'pass_6_complete_dtr', label: 'Synthesis', number: '6' },
]

// ============================================================================
// UTILITIES
// ============================================================================

// Renders any pass's data as a structured visual breakdown
const PassViewer: React.FC<{
  passKey: string
  data: Record<string, unknown> | undefined
}> = ({ passKey, data }) => {
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center"
          style={{ backgroundColor: '#F7F5F3' }}
        >
          <Clock size={22} style={{ color: '#C0B8B0' }} />
        </div>
        <p className="text-sm" style={{ color: '#929397' }}>
          This pass has not been extracted yet
        </p>
      </div>
    )
  }

  // ── PASS 1: Structure ──────────────────────────────────────────────────────
  if (passKey === 'pass_1_structure') {
    const layout = data['layout'] as Record<string, unknown> | undefined
    const hierarchy = data['hierarchy'] as
      | {
          levels?: Array<{
            rank: number
            elements: string[]
            established_by: string
          }>
        }
      | undefined
    const density = data['density'] as
      | {
          global?: number
          per_section?: Array<{ section: string; density: number }>
        }
      | undefined
    const spacing = data['spacing'] as
      | { quantum?: string; scale?: number[]; consistency?: number }
      | undefined

    return (
      <div className="space-y-6">
        {/* Layout */}
        {layout && (
          <div>
            <SectionLabel label="Layout Structure" />
            <div className="grid grid-cols-3 gap-3">
              <MetricCard
                label="Layout Type"
                value={String(layout['type'] || '').replace(/_/g, ' ')}
                highlight
              />
              <MetricCard
                label="Direction"
                value={String(layout['direction'] || 'vertical')}
              />
              <MetricCard
                label="Nesting Depth"
                value={String(layout['nesting_depth'] ?? '—')}
              />
            </div>
          </div>
        )}

        {/* Hierarchy */}
        {hierarchy?.levels && hierarchy.levels.length > 0 && (
          <div>
            <SectionLabel label="Visual Hierarchy" />
            <div className="space-y-2">
              {hierarchy.levels.map(level => (
                <div
                  key={level.rank}
                  className="flex items-start gap-3 rounded-xl p-3"
                  style={{ backgroundColor: '#F7F5F3' }}
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                    style={{ backgroundColor: '#1F1F20', color: '#F5C563' }}
                  >
                    {level.rank}
                  </div>
                  <div className="flex-1">
                    <p
                      className="text-sm font-medium mb-0.5"
                      style={{ color: '#1F1F20' }}
                    >
                      {(level.elements || []).join(', ')}
                    </p>
                    <p className="text-xs" style={{ color: '#929397' }}>
                      Established by: {level.established_by}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Density */}
        {density && (
          <div>
            <SectionLabel label="Content Density" />
            <div className="space-y-2">
              {density.global !== undefined && (
                <div className="flex items-center gap-3">
                  <span
                    className="text-xs w-20 font-medium"
                    style={{ color: '#929397' }}
                  >
                    Global
                  </span>
                  <div
                    className="flex-1 h-2 rounded-full overflow-hidden"
                    style={{ backgroundColor: '#E8E1DD' }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(density.global || 0) * 100}%`,
                        backgroundColor: '#4A90E2',
                      }}
                    />
                  </div>
                  <span
                    className="text-xs font-mono w-8"
                    style={{ color: '#3B3B3B' }}
                  >
                    {Math.round((density.global || 0) * 100)}%
                  </span>
                </div>
              )}
              {(density.per_section || []).map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span
                    className="text-xs w-20 truncate"
                    style={{ color: '#929397' }}
                  >
                    {s.section}
                  </span>
                  <div
                    className="flex-1 h-1.5 rounded-full overflow-hidden"
                    style={{ backgroundColor: '#E8E1DD' }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${s.density * 100}%`,
                        backgroundColor: '#10B981',
                        opacity: 0.7,
                      }}
                    />
                  </div>
                  <span
                    className="text-xs font-mono w-8"
                    style={{ color: '#929397' }}
                  >
                    {Math.round(s.density * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Spacing */}
        {spacing && (
          <div>
            <SectionLabel label="Spacing System" />
            <div className="grid grid-cols-3 gap-3 mb-3">
              <MetricCard
                label="Base Quantum"
                value={String(spacing.quantum || '—')}
                highlight
              />
              <MetricCard
                label="Consistency"
                value={
                  spacing.consistency !== undefined
                    ? `${Math.round(spacing.consistency * 100)}%`
                    : '—'
                }
              />
              <MetricCard
                label="Scale Steps"
                value={String(spacing.scale?.length ?? 0)}
              />
            </div>
            {spacing.scale && spacing.scale.length > 0 && (
              <div className="space-y-1.5">
                {spacing.scale.map((val, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span
                      className="text-xs font-mono w-8 text-right"
                      style={{ color: '#C0B8B0' }}
                    >
                      {val}
                    </span>
                    <div
                      className="h-4 rounded"
                      style={{
                        width: Math.min(val * 3, 280),
                        minWidth: 4,
                        backgroundColor: '#F5C563',
                        opacity: 0.2 + (i / spacing.scale!.length) * 0.65,
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <NarrativeBlock
          narratives={{
            'Spatial Philosophy': data['spatial_philosophy'] as string,
            'Hierarchy Logic': data['hierarchy_logic'] as string,
            Rhythm: data['rhythm_description'] as string,
          }}
        />
      </div>
    )
  }

  // ── PASS 2: Surface ────────────────────────────────────────────────────────
  if (passKey === 'pass_2_surface') {
    const colors = data['colors'] as
      | {
          exact_palette?: Array<{
            hex: string
            role: string
            frequency: number
          }>
        }
      | undefined
    const atmosphere = data['atmosphere'] as string | undefined

    return (
      <div className="space-y-6">
        {colors?.exact_palette && colors.exact_palette.length > 0 && (
          <div>
            <SectionLabel label="Color Palette" />
            <div className="flex flex-wrap gap-4">
              {colors.exact_palette.map((c, i) => {
                const rgb = hexToRgbSimple(c.hex)
                return (
                  <div key={i} className="flex flex-col items-center gap-1.5">
                    <div
                      className="rounded-full"
                      style={{
                        width: 52,
                        height: 52,
                        backgroundColor: c.hex,
                        boxShadow: rgb ? `0 6px 18px rgba(${rgb},0.3)` : 'none',
                      }}
                    />
                    <p
                      className="text-xs font-mono"
                      style={{ color: '#3B3B3B' }}
                    >
                      {c.hex.toUpperCase()}
                    </p>
                    <p
                      className="text-xs text-center capitalize"
                      style={{ color: '#929397', maxWidth: 60 }}
                    >
                      {c.role?.replace(/_/g, ' ')}
                    </p>
                  </div>
                )
              })}
            </div>
            {/* Gradient strip */}
            <div
              className="w-full h-2 rounded-full mt-4"
              style={{
                background: `linear-gradient(to right, ${colors.exact_palette.map(c => c.hex).join(', ')})`,
              }}
            />
          </div>
        )}

        {atmosphere && (
          <div>
            <SectionLabel label="Atmosphere" />
            <div
              className="rounded-2xl p-5"
              style={{ backgroundColor: '#F7F5F3' }}
            >
              <p
                className="text-sm italic leading-relaxed"
                style={{ color: '#3B3B3B' }}
              >
                {atmosphere}
              </p>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── PASS 3: Typography ────────────────────────────────────────────────────
  if (passKey === 'pass_3_typography') {
    const families = data['families'] as
      | Array<{ name: string; weights_used: number[] }>
      | undefined
    const sizesUsed = ((data['sizes_used'] as number[] | undefined) || []).sort(
      (a, b) => a - b,
    )
    const primaryFont = families?.[0]

    return (
      <div className="space-y-6">
        {primaryFont && (
          <div>
            <SectionLabel label="Primary Typeface" />
            <div
              className="rounded-2xl p-6"
              style={{ backgroundColor: '#1F1F20' }}
            >
              <div
                style={{
                  fontFamily: `'${primaryFont.name}', serif`,
                  fontSize: 72,
                  fontWeight: 700,
                  color: '#F5C563',
                  lineHeight: 1,
                  marginBottom: 12,
                }}
              >
                Ag
              </div>
              <p
                style={{
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: 18,
                  fontFamily: `'${primaryFont.name}', serif`,
                }}
              >
                {primaryFont.name}
              </p>
              <div className="flex gap-2 mt-3 flex-wrap">
                {(primaryFont.weights_used || []).map(w => (
                  <span
                    key={w}
                    style={{
                      fontFamily: `'${primaryFont.name}', serif`,
                      fontWeight: w,
                      fontSize: 12,
                      padding: '3px 10px',
                      borderRadius: 20,
                      backgroundColor: 'rgba(255,255,255,0.08)',
                      color: 'rgba(255,255,255,0.6)',
                    }}
                  >
                    {w}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {sizesUsed.length > 0 && (
          <div>
            <SectionLabel label="Type Scale" />
            <div
              className="rounded-2xl p-5 space-y-2"
              style={{ backgroundColor: '#F7F5F3' }}
            >
              {[...sizesUsed].reverse().map(size => (
                <div key={size} className="flex items-baseline gap-3">
                  <span
                    className="text-xs font-mono w-8 text-right flex-shrink-0"
                    style={{ color: '#C0B8B0' }}
                  >
                    {size}
                  </span>
                  <span
                    style={{
                      fontFamily: primaryFont
                        ? `'${primaryFont.name}', serif`
                        : 'inherit',
                      fontSize: Math.min(size, 40),
                      lineHeight: 1.15,
                      color: '#1F1F20',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {size >= 28
                      ? 'Heading'
                      : size >= 18
                        ? 'Subheading'
                        : 'Body text at this size'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <NarrativeBlock
          narratives={{
            Philosophy: data['scale_philosophy'] as string,
            'Weight Logic': data['weight_hierarchy_logic'] as string,
            System: data['system_narrative'] as string,
          }}
        />
      </div>
    )
  }

  // ── PASS 4: Image Usage ───────────────────────────────────────────────────
  if (passKey === 'pass_4_image_usage') {
    const hasImages = data['has_images'] as boolean
    const imageDensity = data['image_density'] as string | undefined
    const placements = data['placements'] as
      | Array<{
          role: string
          position: string
          frequency: string
          treatment?: { sizing: string; border_radius: string }
        }>
      | undefined

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3">
          <MetricCard label="Has Images" value={hasImages ? 'Yes' : 'No'} />
          <MetricCard
            label="Image Density"
            value={imageDensity?.replace(/_/g, ' ') || '—'}
            highlight
          />
        </div>

        {placements && placements.length > 0 && (
          <div>
            <SectionLabel label="Image Placements" />
            <div className="space-y-2">
              {placements.map((p, i) => (
                <div
                  key={i}
                  className="rounded-xl p-3 flex items-start gap-3"
                  style={{ backgroundColor: '#F7F5F3' }}
                >
                  <ImageIcon
                    size={16}
                    style={{ color: '#929397', marginTop: 2 }}
                  />
                  <div>
                    <p
                      className="text-sm font-medium capitalize"
                      style={{ color: '#1F1F20' }}
                    >
                      {p.role?.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs" style={{ color: '#929397' }}>
                      {p.position} · {p.frequency}
                    </p>
                    {p.treatment && (
                      <p
                        className="text-xs mt-0.5"
                        style={{ color: '#C0B8B0' }}
                      >
                        {p.treatment.sizing} · r={p.treatment.border_radius}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <NarrativeBlock
          narratives={{
            Narrative: data['narrative'] as string,
            Rhythm: data['rhythm'] as string,
          }}
        />
      </div>
    )
  }

  // ── PASS 5: Components ────────────────────────────────────────────────────
  if (passKey === 'pass_5_components') {
    const inventory = data['inventory'] as
      | Array<{
          type: string
          variants: string[]
          source: string
          confidence: number
          narratives?: Record<string, string>
        }>
      | undefined
    const total = data['total_components'] as number | undefined

    return (
      <div className="space-y-6">
        {total !== undefined && (
          <div className="grid grid-cols-2 gap-3">
            <MetricCard
              label="Component Types"
              value={String(total)}
              highlight
            />
            <MetricCard
              label="Total Variants"
              value={String(data['total_variants'] ?? 0)}
            />
          </div>
        )}

        {inventory && inventory.length > 0 && (
          <div>
            <SectionLabel label="Component Inventory" />
            <div className="space-y-2">
              {inventory.map((comp, i) => (
                <div
                  key={i}
                  className="rounded-xl p-4"
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E8E1DD',
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-sm font-semibold capitalize"
                        style={{ color: '#1F1F20' }}
                      >
                        {comp.type?.replace(/_/g, ' ')}
                      </span>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: '#F7F5F3', color: '#929397' }}
                      >
                        {comp.source}
                      </span>
                    </div>
                    <div
                      className="text-xs font-bold"
                      style={{
                        color:
                          comp.confidence > 0.7
                            ? '#10B981'
                            : comp.confidence > 0.4
                              ? '#F59E0B'
                              : '#EF4444',
                      }}
                    >
                      {Math.round(comp.confidence * 100)}%
                    </div>
                  </div>
                  {comp.variants && comp.variants.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap">
                      {comp.variants.map(v => (
                        <span
                          key={v}
                          className="text-xs px-2 py-0.5 rounded"
                          style={{
                            backgroundColor: '#F7F5F3',
                            color: '#929397',
                          }}
                        >
                          {v}
                        </span>
                      ))}
                    </div>
                  )}
                  {comp.narratives?.['design_thinking'] && (
                    <p
                      className="text-xs mt-2 italic"
                      style={{ color: '#929397', lineHeight: 1.5 }}
                    >
                      {comp.narratives['design_thinking'].substring(0, 140)}
                      {comp.narratives['design_thinking'].length > 140
                        ? '…'
                        : ''}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <NarrativeBlock
          narratives={{
            Philosophy: data['component_system_philosophy'] as string,
            Patterns: data['cross_component_patterns'] as string,
          }}
        />
      </div>
    )
  }

  // ── PASS 6: Synthesis ─────────────────────────────────────────────────────
  if (passKey === 'pass_6_complete_dtr') {
    const personality = data['personality'] as
      | Record<string, unknown>
      | undefined
    const patterns = data['cross_cutting_patterns'] as
      | Record<string, unknown>
      | undefined
    const guidance = data['generation_guidance'] as
      | { confidence_by_domain?: Record<string, number> }
      | undefined

    return (
      <div className="space-y-6">
        {/* Confidence scores */}
        {guidance?.confidence_by_domain && (
          <div>
            <SectionLabel label="Confidence Scores" />
            <div className="space-y-2">
              {Object.entries(guidance.confidence_by_domain).map(
                ([domain, score]) => (
                  <div key={domain} className="flex items-center gap-3">
                    <span
                      className="text-xs capitalize w-24"
                      style={{ color: '#929397' }}
                    >
                      {domain}
                    </span>
                    <div
                      className="flex-1 h-2 rounded-full overflow-hidden"
                      style={{ backgroundColor: '#E8E1DD' }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${score * 100}%`,
                          backgroundColor:
                            score > 0.7
                              ? '#10B981'
                              : score > 0.4
                                ? '#F59E0B'
                                : '#EF4444',
                        }}
                      />
                    </div>
                    <span
                      className="text-xs font-bold w-8 text-right"
                      style={{ color: '#3B3B3B' }}
                    >
                      {Math.round(score * 100)}
                    </span>
                  </div>
                ),
              )}
            </div>
          </div>
        )}

        {/* Personality */}
        {personality && (
          <div>
            <SectionLabel label="Design Personality" />
            <NarrativeBlock
              narratives={{
                'Design Lineage': personality['design_lineage'] as string,
                'Emotional Register': personality[
                  'emotional_register'
                ] as string,
              }}
            />
          </div>
        )}

        {/* Cross-cutting patterns */}
        {patterns && (
          <div>
            <SectionLabel label="Cross-Cutting Patterns" />
            <NarrativeBlock
              narratives={Object.fromEntries(
                Object.entries(patterns)
                  .filter(([, v]) => typeof v === 'string')
                  .map(([k, v]) => [k.replace(/_/g, ' '), v as string]),
              )}
            />
          </div>
        )}
      </div>
    )
  }

  // ── Fallback: generic key-value display ───────────────────────────────────
  return (
    <div className="space-y-2">
      {Object.entries(data)
        .filter(([, v]) => typeof v === 'string' && v.length > 0)
        .map(([key, value]) => (
          <div
            key={key}
            className="rounded-xl p-4"
            style={{ backgroundColor: '#F7F5F3' }}
          >
            <p
              className="text-xs font-bold uppercase mb-1"
              style={{ color: '#929397', letterSpacing: '0.12em' }}
            >
              {key.replace(/_/g, ' ')}
            </p>
            <p className="text-sm" style={{ color: '#3B3B3B' }}>
              {String(value)}
            </p>
          </div>
        ))}
    </div>
  )
}

// ── Helper sub-components ─────────────────────────────────────────────────────

const SectionLabel: React.FC<{ label: string }> = ({ label }) => (
  <p
    className="text-xs font-bold uppercase mb-3"
    style={{ color: '#929397', letterSpacing: '0.2em' }}
  >
    {label}
  </p>
)

const MetricCard: React.FC<{
  label: string
  value: string
  highlight?: boolean
}> = ({ label, value, highlight = false }) => (
  <div
    className="rounded-xl p-4"
    style={{
      backgroundColor: highlight ? '#1F1F20' : '#F7F5F3',
      border: highlight ? 'none' : '1px solid #E8E1DD',
    }}
  >
    <p
      className="text-xs font-bold uppercase mb-1"
      style={{
        color: highlight ? '#929397' : '#929397',
        letterSpacing: '0.12em',
      }}
    >
      {label}
    </p>
    <p
      className="text-base font-semibold capitalize"
      style={{ color: highlight ? '#F5C563' : '#1F1F20' }}
    >
      {value}
    </p>
  </div>
)

const NarrativeBlock: React.FC<{
  narratives: Record<string, string | undefined>
}> = ({ narratives }) => (
  <div className="space-y-3">
    {Object.entries(narratives)
      .filter(([, v]) => v && v.length > 0)
      .map(([label, text]) => (
        <div
          key={label}
          className="rounded-2xl p-4"
          style={{ backgroundColor: '#F7F5F3' }}
        >
          <p
            className="text-xs font-bold uppercase mb-2"
            style={{ color: '#929397', letterSpacing: '0.15em' }}
          >
            {label}
          </p>
          <p
            className="text-sm italic leading-relaxed"
            style={{ color: '#3B3B3B' }}
          >
            {text}
          </p>
        </div>
      ))}
  </div>
)

function hexToRgbSimple(hex: string): string | null {
  try {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `${r},${g},${b}`
  } catch {
    return null
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const TasteStudioDTRView: React.FC<Props> = ({ taste }) => {
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(
    null,
  )
  const [dtrData, setDtrData] = useState<DTRPassData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activePass, setActivePass] = useState<string>('pass_1_structure')

  // Select first resource by default
  useEffect(() => {
    if (taste?.resources?.length && !selectedResourceId) {
      setSelectedResourceId(taste.resources[0].resource_id)
    }
  }, [taste, selectedResourceId])

  // Load DTR when resource selected
  useEffect(() => {
    if (!selectedResourceId || !taste) return
    setLoading(true)
    setError(null)
    setDtrData(null)

    api.dtr
      .getData(taste.taste_id, selectedResourceId)
      .then(data => {
        setDtrData(data)
        // Auto-select first available pass
        const firstAvail = PASS_TABS.find(
          p => data.passes?.[p.key as keyof typeof data.passes],
        )
        if (firstAvail) setActivePass(firstAvail.key)
      })
      .catch(err => {
        setError(err?.message || 'Failed to load DTR data')
      })
      .finally(() => setLoading(false))
  }, [selectedResourceId, taste])

  if (!taste) return null

  const resources = taste.resources || []
  const selectedResource = resources.find(
    r => r.resource_id === selectedResourceId,
  )
  const activePassData = dtrData?.passes?.[
    activePass as keyof typeof dtrData.passes
  ] as Record<string, unknown> | undefined

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        overflow: 'hidden',
      }}
    >
      {/* ── Left sidebar: resource list ────────────────────────────────────── */}
      <div
        className="w-48 flex-shrink-0 overflow-y-auto border-r py-4 px-3 space-y-1"
        style={{ borderColor: '#E8E1DD', backgroundColor: '#FAFAF9' }}
      >
        <p
          className="text-xs font-bold uppercase px-2 mb-3"
          style={{ color: '#929397', letterSpacing: '0.18em' }}
        >
          Resources
        </p>
        {resources.map(resource => {
          const isSelected = resource.resource_id === selectedResourceId
          return (
            <button
              key={resource.resource_id}
              onClick={() => setSelectedResourceId(resource.resource_id)}
              className="w-full text-left rounded-xl px-3 py-2.5 transition-all"
              style={{
                backgroundColor: isSelected ? '#1F1F20' : 'transparent',
                border: isSelected ? 'none' : '1px solid transparent',
              }}
            >
              <div className="flex items-center gap-2">
                {/* Thumbnail */}
                <div
                  className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0"
                  style={{ backgroundColor: '#E8E1DD' }}
                >
                  {resource.imageUrl ? (
                    <img
                      src={resource.imageUrl}
                      alt={resource.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon size={14} style={{ color: '#929397' }} />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p
                    className="text-xs font-medium truncate"
                    style={{ color: isSelected ? '#FFFFFF' : '#3B3B3B' }}
                  >
                    {resource.name}
                  </p>
                  <div className="flex gap-1 mt-0.5">
                    {resource.has_figma && (
                      <FileJson
                        size={10}
                        style={{ color: isSelected ? '#929397' : '#C0B8B0' }}
                      />
                    )}
                    {resource.has_image && (
                      <ImageIcon
                        size={10}
                        style={{ color: isSelected ? '#929397' : '#C0B8B0' }}
                      />
                    )}
                  </div>
                </div>
              </div>
            </button>
          )
        })}

        {resources.length === 0 && (
          <p className="text-xs px-2" style={{ color: '#929397' }}>
            No resources yet
          </p>
        )}
      </div>

      {/* ── Right: pass viewer ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Resource header */}
        {selectedResource && (
          <div
            className="flex-shrink-0 px-6 py-4 border-b flex items-center gap-3"
            style={{ borderColor: '#E8E1DD', backgroundColor: '#FFFFFF' }}
          >
            <div
              className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0"
              style={{ backgroundColor: '#E8E1DD' }}
            >
              {selectedResource.imageUrl ? (
                <img
                  src={selectedResource.imageUrl}
                  alt={selectedResource.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon size={16} style={{ color: '#929397' }} />
                </div>
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: '#1F1F20' }}>
                {selectedResource.name}
              </p>
              {dtrData?.status && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  {dtrData.status.status === 'completed' ? (
                    <CheckCircle2 size={12} style={{ color: '#10B981' }} />
                  ) : dtrData.status.status === 'failed' ? (
                    <AlertCircle size={12} style={{ color: '#EF4444' }} />
                  ) : (
                    <Clock size={12} style={{ color: '#F59E0B' }} />
                  )}
                  <span
                    className="text-xs capitalize"
                    style={{ color: '#929397' }}
                  >
                    {dtrData.status.status}
                    {dtrData.status.quality_tier &&
                      ` · ${dtrData.status.quality_tier}`}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pass tabs */}
        <div
          className="flex-shrink-0 flex items-center gap-1 px-5 py-3 border-b overflow-x-auto"
          style={{ borderColor: '#E8E1DD', backgroundColor: '#FAFAF9' }}
        >
          {PASS_TABS.map(tab => {
            const hasData =
              dtrData?.passes?.[tab.key as keyof typeof dtrData.passes]
            const isActive = activePass === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActivePass(tab.key)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex-shrink-0"
                style={{
                  backgroundColor: isActive ? '#1F1F20' : 'transparent',
                  color: isActive ? '#FFFFFF' : hasData ? '#3B3B3B' : '#C0B8B0',
                  opacity: hasData || isActive ? 1 : 0.5,
                }}
              >
                <span
                  className="w-4 h-4 rounded flex items-center justify-center text-xs font-bold"
                  style={{
                    backgroundColor: isActive ? '#F5C563' : 'rgba(0,0,0,0.08)',
                    color: isActive ? '#1F1F20' : 'inherit',
                  }}
                >
                  {tab.number}
                </span>
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Pass content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div
                className="w-10 h-10 border-4 rounded-full animate-spin"
                style={{ borderColor: '#E8E1DD', borderTopColor: '#F5C563' }}
              />
              <p className="text-sm" style={{ color: '#929397' }}>
                Loading DTR data…
              </p>
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <AlertCircle size={28} style={{ color: '#EF4444' }} />
              <p className="text-sm" style={{ color: '#929397' }}>
                {error}
              </p>
            </div>
          )}

          {!loading && !error && dtrData && (
            <PassViewer passKey={activePass} data={activePassData} />
          )}

          {!loading && !error && !dtrData && selectedResourceId && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Clock size={28} style={{ color: '#C0B8B0' }} />
              <p className="text-sm" style={{ color: '#929397' }}>
                No DTR data found for this resource
              </p>
            </div>
          )}

          {!selectedResourceId && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <ImageIcon size={28} style={{ color: '#C0B8B0' }} />
              <p className="text-sm" style={{ color: '#929397' }}>
                Select a resource to inspect its design taste representation
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default TasteStudioDTRView
