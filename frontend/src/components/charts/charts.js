import React from 'react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend, Filler,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend, Filler);
ChartJS.defaults.font.family = "'DM Sans', system-ui, sans-serif";
ChartJS.defaults.color = '#556277';

const grid = { color: '#e6edf5' };
const baseOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } } },
  scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grid, ticks: { precision: 0 } } },
};

const hourlyOptions = {
  ...baseOptions,
  plugins: {
    ...baseOptions.plugins,
    legend: {
      position: 'top',
      align: 'end',
      labels: { usePointStyle: true, pointStyle: 'rect', boxWidth: 8, boxHeight: 8, padding: 14, font: { size: 11 } },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: {
        autoSkip: false,
        maxRotation: 0,
        minRotation: 0,
        callback(value, index) {
          if (index % 2 !== 0) return '';
          return `${String(this.getLabelForValue(value)).slice(0, 2)}h`;
        },
      },
    },
    y: {
      beginAtZero: true,
      grid: { color: 'rgba(15, 36, 87, .06)' },
      ticks: { precision: 0 },
    },
  },
};

export function HourlyChart({ data, dashboard = false }) {
  const rows = data || [];
  const barStyle = dashboard ? { borderRadius: 3, barThickness: 9, maxBarThickness: 11 } : { borderRadius: 4 };
  return (
    <div
      className={`chart-box${dashboard ? ' dashboard-hourly-chart' : ''}`}
      role={dashboard ? 'img' : undefined}
      aria-label={dashboard ? 'Arrivées et départs par heure' : undefined}
    >
      <Bar
        options={dashboard ? hourlyOptions : baseOptions}
        data={{
          labels: rows.map((r) => r.hour),
          datasets: [
            { label: 'Arrivées', data: rows.map((r) => r.entries), backgroundColor: '#1a3a89', ...barStyle },
            { label: 'Départs', data: rows.map((r) => r.exits), backgroundColor: '#6db0d5', ...barStyle },
          ],
        }}
      />
    </div>
  );
}

export function TrendChart({ data }) {
  const rows = data || [];
  const trendOptions = {
    ...baseOptions,
    plugins: {
      ...baseOptions.plugins,
      legend: {
        position: 'top',
        align: 'end',
        labels: { usePointStyle: true, pointStyle: 'rectRounded', boxWidth: 9, boxHeight: 9, padding: 14, font: { size: 11 } },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { autoSkip: true, maxTicksLimit: rows.length > 45 ? 12 : 16, maxRotation: 0, minRotation: 0 },
      },
      y: { beginAtZero: true, grid: { color: 'rgba(15, 36, 87, .06)' }, ticks: { precision: 0 } },
    },
  };
  const bar = (label, key, color) => ({
    label,
    data: rows.map((r) => r[key] ?? 0),
    backgroundColor: color,
    borderRadius: 4,
    borderSkipped: false,
    maxBarThickness: rows.length > 45 ? 10 : 16,
  });
  return (
    <div className="chart-box reports-trend-chart">
      <Bar
        options={trendOptions}
        data={{
          labels: rows.map((r) => {
            const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(r.date || '');
            return match ? `${match[3]}/${match[2]}` : '';
          }),
          datasets: [
            bar('Présents', 'present', '#1a3a89'),
            bar('Retards', 'late', '#d99a1c'),
            bar('Absents', 'absent', '#d9534a'),
            bar('En congé', 'leave', '#6db0d5'),
          ],
        }}
      />
    </div>
  );
}
