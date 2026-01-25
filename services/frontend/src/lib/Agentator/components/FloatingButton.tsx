import React, { useState } from 'react';
import { AgentatorMode } from '../types';

interface FloatingButtonProps {
  isActive: boolean;
  mode: AgentatorMode;
  annotationCount: number;
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  onToggle: () => void;
  onModeChange: (mode: AgentatorMode) => void;
  onCopy: () => void;
  onClear: () => void;
  onSettings: () => void;
  onToggleVisibility: () => void;
  markersVisible: boolean;
  showCopySuccess: boolean;
}

export const FloatingButton: React.FC<FloatingButtonProps> = ({
  isActive,
  mode,
  annotationCount,
  position,
  onToggle,
  onModeChange,
  onCopy,
  onClear,
  onSettings,
  onToggleVisibility,
  markersVisible,
  showCopySuccess
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const positionClasses = {
    'bottom-right': 'agentator-bottom-right',
    'bottom-left': 'agentator-bottom-left',
    'top-right': 'agentator-top-right',
    'top-left': 'agentator-top-left'
  };

  const handleModeSelect = (selectedMode: AgentatorMode) => {
    onModeChange(selectedMode);
    if (!isActive) {
      onToggle();
    }
    setIsExpanded(false);
  };

  return (
    <div className={`agentator-floating ${positionClasses[position]}`} data-annotation-ui>
      {showCopySuccess && (
        <div className="agentator-toast">✓ Copied to clipboard!</div>
      )}

      {isExpanded && (
        <div className="agentator-menu" data-annotation-ui>
          {/* Mode Selection */}
          <div className="agentator-menu-section">
            <div className="agentator-menu-section-title">Mode</div>
            <button
              className={`agentator-menu-item ${mode === 'annotate' ? 'active' : ''}`}
              onClick={() => handleModeSelect('annotate')}
              title="Annotate mode"
            >
              <span className="agentator-icon">✏️</span>
              <span>Annotate</span>
              {mode === 'annotate' && <span className="agentator-check">✓</span>}
            </button>

            <button
              className={`agentator-menu-item ${mode === 'inspect' ? 'active' : ''}`}
              onClick={() => handleModeSelect('inspect')}
              title="Inspect mode"
            >
              <span className="agentator-icon">🔍</span>
              <span>Inspect</span>
              {mode === 'inspect' && <span className="agentator-check">✓</span>}
            </button>
          </div>

          {/* Actions - Only for Annotate mode */}
          {mode === 'annotate' && (
            <div className="agentator-menu-section">
              <div className="agentator-menu-section-title">Actions</div>
              <button
                className="agentator-menu-item"
                onClick={() => {
                  onToggleVisibility();
                  setIsExpanded(false);
                }}
                title={markersVisible ? "Hide markers" : "Show markers"}
              >
                <span className="agentator-icon">{markersVisible ? '👁️' : '👁️‍🗨️'}</span>
                <span>{markersVisible ? 'Hide' : 'Show'}</span>
              </button>

              <button
                className="agentator-menu-item"
                onClick={() => {
                  onCopy();
                  setIsExpanded(false);
                }}
                disabled={annotationCount === 0}
                title="Copy feedback"
              >
                <span className="agentator-icon">📋</span>
                <span>Copy</span>
                {annotationCount > 0 && (
                  <span className="agentator-badge">{annotationCount}</span>
                )}
              </button>

              <button
                className="agentator-menu-item agentator-danger"
                onClick={() => {
                  onClear();
                  setIsExpanded(false);
                }}
                disabled={annotationCount === 0}
                title="Clear all"
              >
                <span className="agentator-icon">🗑️</span>
                <span>Clear</span>
              </button>
            </div>
          )}

          {/* Settings */}
          <div className="agentator-menu-section">
            <button
              className="agentator-menu-item"
              onClick={() => {
                onSettings();
                setIsExpanded(false);
              }}
              title="Settings"
            >
              <span className="agentator-icon">⚙️</span>
              <span>Settings</span>
            </button>
          </div>
        </div>
      )}

      <button
        className={`agentator-main-button ${isActive ? 'active' : ''} ${mode === 'inspect' ? 'inspect-mode' : ''}`}
        onClick={() => {
          if (isExpanded) {
            setIsExpanded(false);
          } else if (isActive) {
            setIsExpanded(true);
          } else {
            onToggle();
          }
        }}
        title={
          isExpanded 
            ? "Close menu"
            : isActive 
            ? `${mode === 'inspect' ? 'Inspect' : 'Annotate'} mode (click for menu)` 
            : "Start"
        }
        data-annotation-ui
      >
        {annotationCount > 0 && mode === 'annotate' && !isExpanded && (
          <span className="agentator-count-badge">{annotationCount}</span>
        )}
        <span className="agentator-icon-large">
          {isExpanded ? '✕' : (isActive ? (mode === 'inspect' ? '🔍' : '✏️') : '✏️')}
        </span>
      </button>

      {isActive && !isExpanded && (
        <button
          className="agentator-close-button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          title="Deactivate"
          data-annotation-ui
        >
          ✕
        </button>
      )}
    </div>
  );
};
