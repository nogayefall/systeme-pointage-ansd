import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie, Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

const AttendanceChart = ({ data }) => {
  if (!data || data.length === 0) {
    return <div className="no-chart-data">Aucune donnée à afficher</div>;
  }

  // Résumer les données d'assiduité
  const present = data.filter((item) => item.daysWorked > 0).length;
  const absent = data.filter((item) => item.daysAbsent > 0).length;
  const late = data.filter((item) => item.lateArrivals > 0).length;

  const chartData = {
    labels: ['Présents', 'Absents', 'Retardataires'],
    datasets: [
      {
        data: [present, absent, late],
        backgroundColor: ['#4CAF50', '#F44336', '#FF9800'],
        borderColor: ['#45a049', '#da190b', '#f57c00'],
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
      },
    },
  };

  return (
    <div className="chart-container">
      <Doughnut data={chartData} options={options} />
    </div>
  );
};

export default AttendanceChart;
