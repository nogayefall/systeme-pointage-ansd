import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import PointageTypeBadge, { PointageTypeLegend } from './PointageTypeBadge';

describe('PointageTypeBadge', () => {
  it('uses the server late flag and exposes the late explanation', () => {
    const markup = renderToStaticMarkup(<PointageTypeBadge type="ENTRY" late />);

    expect(markup).toContain('Arrivée · retard');
    expect(markup).toContain('Arrivée après l&#x27;heure prévue');
  });

  it('shows the arrival, late, and departure legend', () => {
    const markup = renderToStaticMarkup(<PointageTypeLegend />);

    expect(markup).toContain('À l&#x27;heure');
    expect(markup).toContain('En retard');
    expect(markup).toContain('Départ');
  });
});
