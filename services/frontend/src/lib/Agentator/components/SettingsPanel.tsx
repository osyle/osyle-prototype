import React from 'react';
import { OutputDetailLevel, AnnotationSettings } from '../types';
import './AnnotationSettings.css';

interface AnnotationSettingsProps {
  settings: AnnotationSettings;
  onSettingsChange: (settings: AnnotationSettings) => void;
  onClose: () => void;
}

const OUTPUT_DETAIL_OPTIONS: { value: OutputDetailLevel; label: string }[] = [
  { value: 'compact', label: 'Compact' },
  { value: 'standard', label: 'Standard' },
  { value: 'detailed', label: 'Detailed' },
  { value: 'forensic', label: 'Forensic' }
];

const COLOR_OPTIONS = [
  { value: '#AF52DE', label: 'Purple', color: '#AF52DE' },
  { value: '#3c82f7', label: 'Blue', color: '#3c82f7' },
  { value: '#5AC8FA', label: 'Cyan', color: '#5AC8FA' },
  { value: '#34C759', label: 'Green', color: '#34C759' },
  { value: '#FFD60A', label: 'Yellow', color: '#FFD60A' },
  { value: '#FF9500', label: 'Orange', color: '#FF9500' },
  { value: '#FF3B30', label: 'Red', color: '#FF3B30' }
];

export const AnnotationSettingsPanel: React.FC<AnnotationSettingsProps> = ({
  settings,
  onSettingsChange,
  onClose
}) => {
  const updateSetting = <K extends keyof AnnotationSettings>(
    key: K,
    value: AnnotationSettings[K]
  ) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h3>Annotation Settings</h3>
          <button className="settings-close" onClick={onClose}>×</button>
        </div>

        <div className="settings-body">
          <div className="setting-group">
            <label className="setting-label">Output Detail Level</label>
            <div className="setting-options">
              {OUTPUT_DETAIL_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  className={`setting-option ${settings.outputDetail === option.value ? 'active' : ''}`}
                  onClick={() => updateSetting('outputDetail', option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className="setting-description">
              {settings.outputDetail === 'compact' && 'Minimal information for quick feedback'}
              {settings.outputDetail === 'standard' && 'Balanced detail with element paths and feedback'}
              {settings.outputDetail === 'detailed' && 'Includes CSS classes, positions, and context'}
              {settings.outputDetail === 'forensic' && 'Maximum detail with computed styles and accessibility info'}
            </p>
          </div>

          <div className="setting-group">
            <label className="setting-label">Annotation Color</label>
            <div className="color-options">
              {COLOR_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  className={`color-option ${settings.annotationColor === option.value ? 'active' : ''}`}
                  onClick={() => updateSetting('annotationColor', option.value)}
                  style={{ backgroundColor: option.color }}
                  title={option.label}
                >
                  {settings.annotationColor === option.value && '✓'}
                </button>
              ))}
            </div>
          </div>

          <div className="setting-group">
            <label className="setting-toggle">
              <input
                type="checkbox"
                checked={settings.autoClearAfterCopy}
                onChange={(e) => updateSetting('autoClearAfterCopy', e.target.checked)}
              />
              <span className="toggle-label">Auto-clear after copy</span>
            </label>
            <p className="setting-description">
              Automatically clear all annotations after copying to clipboard
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
