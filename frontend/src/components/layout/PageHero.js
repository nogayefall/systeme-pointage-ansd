import React from 'react';
import './layout.css';

export default function PageHero({ title, subtitle, action }) {
  return (
    <section className="page-hero" aria-labelledby="page-hero-title">
      <div className="page-hero-copy">
        <h2 id="page-hero-title">{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action && <div className="page-hero-action">{action}</div>}
    </section>
  );
}
