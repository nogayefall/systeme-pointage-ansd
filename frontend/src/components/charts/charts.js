import React from 'react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend, Filler,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

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

export function HourlyChart({ data }) {
  const rows = data || [];
  return (
    <div className="chart-box">
      <Bar
        options={baseOptions}
        data={{
          labels: rows.map((r) => r.hour),
          datasets: [
            { label: 'Arrivées', data: rows.map((r) => r.entries), backgroundColor: '#1a3a89', borderRadius: 4 },
            { label: 'Départs', data: rows.map((r) => r.exits), backgroundColor: '#6db0d5', borderRadius: 4 },
          ],
        }}
      />
    </div>
  );
}

export function TrendChart({ data }) {
  const rows = data || [];
  const line = (label, key, color) => ({
    label, data: rows.map((r) => r[key]), borderColor: color, backgroundColor: color, tension: 0.3,
    pointRadius: rows.length > 40 ? 0 : 3, borderWidth: 2,
  });
  return (
    <div className="chart-box">
      <Line
        options={baseOptions}
        data={{
          labels: rows.map((r) => {
            const [, m, d] = r.date.split('-');
            return `${d}/${m}`;
          }),
          datasets: [
            line('Présents', 'present', '#1a3a89'),
            line('Retards', 'late', '#d99a1c'),
            line('Absents', 'absent', '#d9534a'),
            line('En congé', 'leave', '#6db0d5'),
          ],
        }}
      />
    </div>
  );
}
