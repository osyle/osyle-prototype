import {
  ArrowLeft,
  Settings,
  Smartphone,
  Smile,
  Maximize2,
  ChevronDown,
  RotateCcw,
  Palette,
  Sparkles,
} from 'lucide-react'
import { useState } from 'react'

export default function Editor() {
  const [activeTab, setActiveTab] = useState('Concept')
  const [detailsValue, setDetailsValue] = useState(66) // Bold = 66-100%
  const [energyValue, setEnergyValue] = useState(50) // 5/10
  const [craftValue, setCraftValue] = useState(10) // 1/10
  const [inputText, setInputText] = useState('')
  const [styleDropdownOpen, setStyleDropdownOpen] = useState(false)
  const [selectedStyle, setSelectedStyle] = useState({
    title: 'Playful & bold',
    bg: 'linear-gradient(135deg, #FFB6A3 0%, #E8C5E8 33%, #B8D4E8 66%, #A8E8C0 100%)',
  })

  const tabs = ['Concept', 'Prototype', 'Video pitch', 'Presentation']

  const styleOptions = [
    {
      title: 'Playful & bold',
      bg: 'linear-gradient(135deg, #FFB6A3 0%, #E8C5E8 33%, #B8D4E8 66%, #A8E8C0 100%)',
    },
    {
      title: 'Minimal & clean',
      bg: 'linear-gradient(135deg, #F5F5F5 0%, #E8E8E8 50%, #D8D8D8 100%)',
    },
    {
      title: 'Dark & moody',
      bg: 'linear-gradient(135deg, #2D2D2D 0%, #1F1F20 50%, #000000 100%)',
    },
  ]

  const getDetailsLabel = () => {
    if (detailsValue < 33) return 'Light'
    if (detailsValue < 66) return 'Medium'
    return 'Bold'
  }

  const getEnergyValue = () => Math.max(1, Math.round((energyValue / 100) * 10))
  const getCraftValue = () => Math.max(1, Math.round((craftValue / 100) * 10))

  return (
    <div
      className="min-h-screen min-w-screen flex"
      style={{ backgroundColor: '#EDEBE9' }}
    >
      {/* Left Menu Buttons - Centered vertically */}
      <div
        className="flex flex-col items-center justify-center py-6 gap-3"
        style={{ width: '80px' }}
      >
        {/* Menu button */}
        <button
          className="rounded-lg flex items-center justify-center transition-all hover:scale-105"
          style={{
            width: '56px',
            height: '40px',
            backgroundColor: '#FFFFFF',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}
        >
          <div className="flex flex-col gap-1">
            <div
              style={{
                width: '20px',
                height: '2px',
                backgroundColor: '#929397',
              }}
            />
            <div
              style={{
                width: '20px',
                height: '2px',
                backgroundColor: '#929397',
              }}
            />
          </div>
        </button>

        {/* Image square 1 */}
        <button
          className="rounded-xl transition-all hover:scale-105"
          style={{
            width: '56px',
            height: '56px',
            backgroundColor: '#FFFFFF',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            overflow: 'hidden',
          }}
        >
          <div className="w-full h-full bg-gradient-to-br from-orange-400 to-pink-400" />
        </button>

        {/* Image square 2 */}
        <button
          className="rounded-xl transition-all hover:scale-105"
          style={{
            width: '56px',
            height: '56px',
            backgroundColor: '#FFFFFF',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            overflow: 'hidden',
          }}
        >
          <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500" />
        </button>

        {/* Add button */}
        <button
          className="rounded-xl flex items-center justify-center transition-all hover:scale-105"
          style={{
            width: '56px',
            height: '56px',
            backgroundColor: '#FFFFFF',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#929397"
            strokeWidth="2"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      {/* Left Section - 60% width */}
      <div className="flex flex-col" style={{ width: 'calc(80% - 80px)' }}>
        {/* Top Section with Back Button and Tabs */}
        <div className="flex items-center justify-between px-16 py-6">
          {/* Back Button */}
          <button
            className="w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-105"
            style={{
              backgroundColor: '#FFFFFF',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}
          >
            <ArrowLeft size={20} style={{ color: '#3B3B3B' }} />
          </button>

          {/* Tab Navigation */}
          <div
            className="flex items-center gap-1 rounded-full px-2 py-1.5"
            style={{
              backgroundColor: '#FFFFFF',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}
          >
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="px-6 py-2 rounded-full transition-all duration-300 text-sm font-medium"
                style={{
                  backgroundColor:
                    activeTab === tab ? '#F4F4F4' : 'transparent',
                  color: activeTab === tab ? '#3B3B3B' : '#929397',
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Empty space for balance */}
          <div className="w-12" />
        </div>

        {/* Center White Rectangle with 10% margins on sides */}
        <div className="flex-1 px-16 pb-6">
          <div
            className="w-full h-full rounded-3xl"
            style={{
              backgroundColor: '#FFFFFF',
              boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
            }}
          >
            {/* Empty for now */}
          </div>
        </div>

        {/* Bottom Control Bar */}
        <div className="px-16 pb-6">
          <div
            className="rounded-2xl p-4"
            style={{
              backgroundColor: '#FFFFFF',
              boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
            }}
          >
            <div className="flex items-center justify-between">
              <input
                type="text"
                placeholder="Describe your edits"
                className="flex-1 px-4 py-2 rounded-lg focus:outline-none text-sm"
                style={{ backgroundColor: 'transparent', color: '#3B3B3B' }}
              />
              <div className="flex items-center gap-3">
                <button
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-105"
                  style={{ backgroundColor: '#1F1F20' }}
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: '#FFFFFF' }}
                  />
                </button>
                <button
                  className="px-4 py-2 rounded-lg flex items-center gap-2 text-sm"
                  style={{ backgroundColor: '#F7F5F3', color: '#3B3B3B' }}
                >
                  <Settings size={16} />
                </button>
                <button
                  className="px-4 py-2 rounded-lg flex items-center gap-2 text-sm"
                  style={{ backgroundColor: '#F7F5F3', color: '#3B3B3B' }}
                >
                  <Smartphone size={16} />
                  iOS
                </button>
                <button
                  className="px-4 py-2 rounded-lg flex items-center gap-2 text-sm"
                  style={{ backgroundColor: '#F7F5F3', color: '#3B3B3B' }}
                >
                  <Smile size={16} />
                  Mood
                </button>
                <button
                  className="w-10 h-10 rounded-lg flex items-center justify-center transition-all hover:scale-105"
                  style={{ backgroundColor: '#F7F5F3' }}
                >
                  <Maximize2 size={16} style={{ color: '#3B3B3B' }} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Sidebar - 40% width, full height */}
      <div
        className="rounded-3xl m-6 p-6 flex flex-col gap-6"
        style={{
          width: '20%',
          backgroundColor: '#FFFFFF',
          boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
        }}
      >
        {/* Top row - L button, 25%, NI */}
        <div className="flex items-center justify-between">
          <button
            className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-semibold transition-all hover:scale-105"
            style={{ backgroundColor: '#F7F5F3', color: '#3B3B3B' }}
          >
            L
          </button>
          <div className="flex items-center gap-3">
            <div
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{ backgroundColor: '#F7F5F3', color: '#3B3B3B' }}
            >
              25%
            </div>
            <button
              className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm"
              style={{ backgroundColor: '#3B3B3B', color: '#FFFFFF' }}
            >
              NI
            </button>
          </div>
        </div>

        {/* Title and subtitle */}
        <div>
          <h2
            className="text-2xl font-semibold mb-1"
            style={{ color: '#3B3B3B' }}
          >
            Travel interface
          </h2>
          <p className="text-sm" style={{ color: '#929397' }}>
            App for travelling with partner, iOS app
          </p>
        </div>

        {/* Style dropdown */}
        <div className="relative">
          <button
            onClick={() => setStyleDropdownOpen(!styleDropdownOpen)}
            className="w-full rounded-2xl p-4 flex flex-col transition-all hover:scale-[1.02]"
            style={{
              background: selectedStyle.bg,
              boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <div
                  className="text-xs mb-1"
                  style={{ color: '#3B3B3B', opacity: 0.7 }}
                >
                  Style
                </div>
                <div
                  className="text-sm font-semibold"
                  style={{ color: '#3B3B3B' }}
                >
                  {selectedStyle.title}
                </div>
              </div>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'rgba(255,255,255,0.8)' }}
              >
                <ChevronDown
                  size={16}
                  style={{
                    color: '#3B3B3B',
                    transform: styleDropdownOpen
                      ? 'rotate(180deg)'
                      : 'rotate(0deg)',
                    transition: 'transform 0.3s',
                  }}
                />
              </div>
            </div>
            <div
              className="h-16 rounded-xl"
              style={{ backgroundColor: 'rgba(255,255,255,0.4)' }}
            />
          </button>

          {styleDropdownOpen && (
            <div
              className="absolute top-full left-0 right-0 mt-2 p-2 rounded-2xl z-10"
              style={{
                backgroundColor: '#FFFFFF',
                boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
              }}
            >
              {styleOptions.map((option, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setSelectedStyle(option)
                    setStyleDropdownOpen(false)
                  }}
                  className="w-full rounded-xl p-3 mb-2 last:mb-0 transition-all hover:scale-[1.02]"
                  style={{ background: option.bg }}
                >
                  <div
                    className="text-sm font-semibold text-left"
                    style={{ color: '#3B3B3B' }}
                  >
                    {option.title}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sliders */}
        <div className="space-y-4">
          {/* Details slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span
                  className="text-sm font-medium"
                  style={{ color: '#3B3B3B' }}
                >
                  Details
                </span>
                <span className="text-xs" style={{ color: '#929397' }}>
                  ||
                </span>
              </div>
              <span
                className="text-sm font-medium"
                style={{ color: '#3B3B3B' }}
              >
                {getDetailsLabel()}
              </span>
            </div>
            <div
              className="relative h-2 rounded-full"
              style={{ backgroundColor: '#F4F4F4' }}
            >
              <div
                className="absolute left-0 top-0 h-full rounded-full"
                style={{
                  backgroundColor: '#3B3B3B',
                  width: `${detailsValue}%`,
                }}
              />
              <input
                type="range"
                min="10"
                max="100"
                value={detailsValue}
                onChange={e => setDetailsValue(Number(e.target.value))}
                className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
          </div>

          {/* Energy slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span
                  className="text-sm font-medium"
                  style={{ color: '#3B3B3B' }}
                >
                  Energy
                </span>
                <span className="text-xs" style={{ color: '#929397' }}>
                  ||
                </span>
              </div>
              <span
                className="text-sm font-medium"
                style={{ color: '#3B3B3B' }}
              >
                {getEnergyValue()}
              </span>
            </div>
            <div
              className="relative h-2 rounded-full"
              style={{ backgroundColor: '#F4F4F4' }}
            >
              <div
                className="absolute left-0 top-0 h-full rounded-full"
                style={{ backgroundColor: '#3B3B3B', width: `${energyValue}%` }}
              />
              <input
                type="range"
                min="10"
                max="100"
                value={energyValue}
                onChange={e => setEnergyValue(Number(e.target.value))}
                className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
          </div>

          {/* Craft slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span
                  className="text-sm font-medium"
                  style={{ color: '#3B3B3B' }}
                >
                  Craft
                </span>
                <span className="text-xs" style={{ color: '#929397' }}>
                  ||
                </span>
              </div>
              <span
                className="text-sm font-medium"
                style={{ color: '#3B3B3B' }}
              >
                {getCraftValue()}
              </span>
            </div>
            <div
              className="relative h-2 rounded-full"
              style={{ backgroundColor: '#F4F4F4' }}
            >
              <div
                className="absolute left-0 top-0 h-full rounded-full"
                style={{ backgroundColor: '#3B3B3B', width: `${craftValue}%` }}
              />
              <input
                type="range"
                min="10"
                max="100"
                value={craftValue}
                onChange={e => setCraftValue(Number(e.target.value))}
                className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* 4 Control buttons */}
        <div className="grid grid-cols-4 gap-3">
          <button
            className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all hover:scale-105"
            style={{ backgroundColor: '#F7F5F3' }}
          >
            <RotateCcw size={20} style={{ color: '#4F515A' }} />
            <span className="text-xs" style={{ color: '#929397' }}>
              Vary
            </span>
          </button>
          <button
            className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all hover:scale-105"
            style={{ backgroundColor: '#F7F5F3' }}
          >
            <Palette size={20} style={{ color: '#4F515A' }} />
            <span className="text-xs" style={{ color: '#929397' }}>
              Colors
            </span>
          </button>
          <button
            className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all hover:scale-105"
            style={{ backgroundColor: '#F7F5F3' }}
          >
            <Sparkles size={20} style={{ color: '#4F515A' }} />
            <span className="text-xs" style={{ color: '#929397' }}>
              Taste
            </span>
          </button>
          <button
            className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all hover:scale-105"
            style={{ backgroundColor: '#F7F5F3' }}
          >
            <span className="text-lg">08</span>
            <span className="text-xs" style={{ color: '#929397' }}>
              Style
            </span>
          </button>
        </div>

        {/* Input area at bottom */}
        <div className="mt-auto">
          <div className="relative">
            <textarea
              placeholder="Add suggestions or feedback..."
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              className="w-full px-4 py-3 rounded-xl resize-none focus:outline-none"
              style={{
                backgroundColor: '#F7F5F3',
                border: 'none',
                color: '#3B3B3B',
                fontSize: '14px',
              }}
              rows={3}
            />
            {inputText.length > 0 && (
              <div
                className="absolute bottom-3 right-4 px-2 py-1 rounded text-xs"
                style={{ backgroundColor: '#FFFFFF', color: '#929397' }}
              >
                Enter
              </div>
            )}
          </div>
          {inputText.length > 0 && (
            <button
              className="w-full mt-3 px-6 py-3 rounded-xl font-medium text-sm transition-all hover:scale-[1.02]"
              style={{
                backgroundColor: '#F5C563',
                color: '#1F1F20',
                boxShadow: '0 2px 12px rgba(245, 197, 99, 0.3)',
              }}
            >
              Submit
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
