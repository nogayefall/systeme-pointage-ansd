import React, { useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Chart } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const PointageChart = ({ data, type = 'hourly' }) => {
  if (!data || data.length === 0) {
    return <div className="no-chart-data">Aucune donnée à afficher</div>;
  }

  let chartData, chartOptions;

  if (type === 'hourly') {
    // Graphique en barres pour distribution horaire
    chartData = {
      labels: data.map((item) => item.hour),
      datasets: [
        {
          label: 'Arrivées',
          data: data.map((item) => item.entries),
          backgroundColor: '#4CAF50',
          borderColor: '#45a049',
          borderWidth: 1,
        },
        {
          label: 'Départs',
          data: data.map((item) => item.exits),
          backgroundColor: '#FF9800',
          borderColor: '#f57c00',
          borderWidth: 1,
        },
      ],
    };

    chartOptions = {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        title: {
          display: false,
        },
        legend: {
          display: true,
          position: 'top',
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Nombre de pointages',
          },
        },
      },
    };
  } else if (type === 'trend') {
    // Graphique en lignes pour tendance
    chartData = {
      labels: data.map((item) => item.date),
      datasets: [
        {
          label: 'Pointages par jour',
          data: data.map((item) => item.pointages),
          borderColor: '#2196F3',
          backgroundColor: 'rgba(33, 150, 243, 0.1)',
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 4,
          pointBackgroundColor: '#2196F3',
        },
      ],
    };

    chartOptions = {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        title: {
          display: false,
        },
        legend: {
          display: true,
          position: 'top',
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Nombre de pointages',
          },
        },
      },
    };
  }

  return (
    <div className="chart-container">
      {type === 'hourly' && <Chart type="bar" data={chartData} options={chartOptions} />}
      {type === 'trend' && <Chart type="line" data={chartData} options={chartOptions} />}
    </div>
  );
};

export default PointageChart;
