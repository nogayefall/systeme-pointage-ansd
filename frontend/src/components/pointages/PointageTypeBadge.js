import React from 'react';
import { Badge } from '../ui';
import { TYPE_LABEL } from '../../utils/formatters';

export default function PointageTypeBadge({ type, late = false }) {
  if (type === 'ENTRY' && late) {
    return <Badge tone="warning" title="Arrivée après l'heure prévue">Arrivée · retard</Badge>;
  }
  if (type === 'ENTRY') {
    return <Badge tone="success">Arrivée · à l'heure</Badge>;
  }
  if (type === 'EXIT') {
    return <Badge tone="info">Départ</Badge>;
  }
  return <Badge tone="neutral">{TYPE_LABEL[type] || type || 'Type inconnu'}</Badge>;
}

export function PointageTypeLegend() {
  return (
    <div className="pointage-type-legend" aria-label="Légende des types de pointage">
      <span className="pointage-type-legend-item">
        <span className="pointage-type-legend-dot is-on-time" aria-hidden="true" />
        À l'heure
      </span>
      <span className="pointage-type-legend-item">
        <span className="pointage-type-legend-dot is-late" aria-hidden="true" />
        En retard
      </span>
      <span className="pointage-type-legend-item">
        <span className="pointage-type-legend-dot is-exit" aria-hidden="true" />
        Départ
      </span>
    </div>
  );
}
