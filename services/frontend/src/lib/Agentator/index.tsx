import React, { useState } from 'react';
import { AnnotationCanvas } from './components/AnnotationCanvas';
import { FloatingButton } from './components/FloatingButton';
import { AnnotationSettingsPanel as SettingsPanel } from './components/SettingsPanel';
import { InspectorPanel } from './components/InspectorPanel';
import { Annotation, AnnotationSettings, InspectedElement, AgentatorMode } from './types';
import { generateMarkdown, copyToClipboard } from './utils/exportUtils';
import './styles.css';

export interface AgentatorProps {
  children: React.ReactNode;
  screenId?: string;
  screenName?: string;
  onExport?: (markdown: string, annotations: Annotation[]) => void;
  onAnnotationAdd?: (annotation: Annotation) => void;
  onAnnotationDelete?: (annotation: Annotation) => void;
  onAnnotationUpdate?: (annotation: Annotation) => void;
  onInspect?: (element: InspectedElement | null) => void;
  initialAnnotations?: Annotation[];
  initialColor?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  disabled?: boolean;
}

const DEFAULT_SETTINGS: AnnotationSettings = {
  outputDetail: 'standard',
  annotationColor: '#3c82f7',
  autoClearAfterCopy: false
};

export const Agentator: React.FC<AgentatorProps> = ({
  children,
  screenId = 'screen-1',
  screenName = 'Screen 1',
  onExport,
  onAnnotationAdd,
  onAnnotationDelete,
  onAnnotationUpdate,
  onInspect,
  initialAnnotations = [],
  initialColor = '#3c82f7',
  position = 'bottom-right',
  disabled = false
}) => {
  const [annotations, setAnnotations] = useState<Annotation[]>(initialAnnotations);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<AgentatorMode>('annotate');
  const [markersVisible, setMarkersVisible] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<AnnotationSettings>({
    ...DEFAULT_SETTINGS,
    annotationColor: initialColor
  });
  const [showCopySuccess, setShowCopySuccess] = useState(false);
  const [inspectedElement, setInspectedElement] = useState<InspectedElement | null>(null);

  if (disabled) {
    return <>{children}</>;
  }

  const handleModeChange = (newMode: AgentatorMode) => {
    setMode(newMode);
    // Clear inspection when switching to annotate mode
    if (newMode === 'annotate') {
      setInspectedElement(null);
      onInspect?.(null);
    }
  };

  const handleInspect = (element: InspectedElement | null) => {
    setInspectedElement(element);
    onInspect?.(element);
  };

  const handleAnnotationAdd = (annotation: Annotation) => {
    setAnnotations([...annotations, annotation]);
    onAnnotationAdd?.(annotation);
  };

  const handleAnnotationDelete = (annotation: Annotation) => {
    setAnnotations(annotations.filter(a => a.id !== annotation.id));
    onAnnotationDelete?.(annotation);
  };

  const handleAnnotationUpdate = (annotation: Annotation) => {
    setAnnotations(annotations.map(a => a.id === annotation.id ? annotation : a));
    onAnnotationUpdate?.(annotation);
  };

  const handleCopy = async () => {
    const markdown = generateMarkdown(annotations, screenName, settings.outputDetail);
    const success = await copyToClipboard(markdown);
    
    if (success) {
      setShowCopySuccess(true);
      setTimeout(() => setShowCopySuccess(false), 2000);
      
      onExport?.(markdown, annotations);
      
      if (settings.autoClearAfterCopy) {
        setAnnotations([]);
      }
    }
  };

  const handleClear = () => {
    if (window.confirm(`Clear all ${annotations.length} annotations?`)) {
      setAnnotations([]);
    }
  };

  return (
    <>
      <AnnotationCanvas
        screenId={screenId}
        screenName={screenName}
        onAnnotationAdd={handleAnnotationAdd}
        onAnnotationDelete={handleAnnotationDelete}
        onAnnotationUpdate={handleAnnotationUpdate}
        onInspect={handleInspect}
        annotations={markersVisible ? annotations : []}
        isActive={isActive}
        mode={mode}
        annotationColor={settings.annotationColor}
      >
        {children}
      </AnnotationCanvas>

      <FloatingButton
        isActive={isActive}
        mode={mode}
        annotationCount={annotations.length}
        position={position}
        onToggle={() => setIsActive(!isActive)}
        onModeChange={handleModeChange}
        onCopy={handleCopy}
        onClear={handleClear}
        onSettings={() => setShowSettings(true)}
        onToggleVisibility={() => setMarkersVisible(!markersVisible)}
        markersVisible={markersVisible}
        showCopySuccess={showCopySuccess}
      />

      {mode === 'inspect' && isActive && (
        <InspectorPanel
          inspectedElement={inspectedElement}
          position={position}
          accentColor={settings.annotationColor}
        />
      )}

      {showSettings && (
        <SettingsPanel
          settings={settings}
          onSettingsChange={setSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </>
  );
};

export default Agentator;

// Re-export types
export type { 
  Annotation, 
  AnnotationSettings, 
  PendingAnnotation, 
  HoverInfo, 
  OutputDetailLevel,
  InspectedElement,
  AgentatorMode
} from './types';
