import React from 'react';
import { InspectedElement } from '../types';

interface InspectorPanelProps {
  inspectedElement: InspectedElement | null;
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  accentColor?: string;
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  inspectedElement,
  position,
  accentColor = '#3c82f7'
}) => {
  if (!inspectedElement) return null;

  const isTop = position.startsWith('top');
  const panelClass = isTop ? 'agentator-inspector-top' : 'agentator-inspector-bottom';

  return (
    <div className={`agentator-inspector ${panelClass}`} data-annotation-ui>
      <div className="agentator-inspector-header" style={{ borderLeftColor: accentColor }}>
        <div className="agentator-inspector-title">🔍 Inspecting</div>
      </div>
      
      <div className="agentator-inspector-content">
        <div className="agentator-inspector-section">
          <div className="agentator-inspector-label">Element</div>
          <div className="agentator-inspector-value" title={inspectedElement.element}>
            {inspectedElement.element}
          </div>
        </div>

        <div className="agentator-inspector-section">
          <div className="agentator-inspector-label">Path</div>
          <div className="agentator-inspector-value agentator-inspector-path" title={inspectedElement.elementPath}>
            {inspectedElement.elementPath}
          </div>
        </div>

        {inspectedElement.tagName && (
          <div className="agentator-inspector-section">
            <div className="agentator-inspector-label">Tag</div>
            <div className="agentator-inspector-value agentator-inspector-tag">
              &lt;{inspectedElement.tagName.toLowerCase()}&gt;
            </div>
          </div>
        )}

        {inspectedElement.cssClasses && (
          <div className="agentator-inspector-section">
            <div className="agentator-inspector-label">Classes</div>
            <div className="agentator-inspector-value agentator-inspector-classes">
              {inspectedElement.cssClasses}
            </div>
          </div>
        )}

        {inspectedElement.boundingBox && (
          <div className="agentator-inspector-section">
            <div className="agentator-inspector-label">Position</div>
            <div className="agentator-inspector-value agentator-inspector-position">
              {Math.round(inspectedElement.boundingBox.x)}px, {Math.round(inspectedElement.boundingBox.y)}px
              <span className="agentator-inspector-dim">
                ({Math.round(inspectedElement.boundingBox.width)}×{Math.round(inspectedElement.boundingBox.height)}px)
              </span>
            </div>
          </div>
        )}

        {inspectedElement.attributes && Object.keys(inspectedElement.attributes).length > 0 && (
          <div className="agentator-inspector-section">
            <div className="agentator-inspector-label">Attributes</div>
            <div className="agentator-inspector-attributes">
              {Object.entries(inspectedElement.attributes).slice(0, 3).map(([key, value]) => (
                <div key={key} className="agentator-inspector-attribute">
                  <span className="agentator-inspector-attr-key">{key}:</span>
                  <span className="agentator-inspector-attr-value" title={value}>
                    {value.length > 30 ? `${value.slice(0, 30)}...` : value}
                  </span>
                </div>
              ))}
              {Object.keys(inspectedElement.attributes).length > 3 && (
                <div className="agentator-inspector-more">
                  +{Object.keys(inspectedElement.attributes).length - 3} more
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
