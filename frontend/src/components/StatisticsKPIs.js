import React from 'react';

const StatisticsKPIs = ({ kpis, date, onDateChange, loading }) => {
  if (loading || !kpis) {
    return <div className="kpis-container loading">Chargement des KPIs...</div>;
  }

  return (
    <div className="kpis-section">
      <div className="kpis-header">
        <h2>KPIs du Jour</h2>
        <input
          type="date"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          className="kpi-date-picker"
        />
      </div>

      <div className="kpis-container">
        <div className="kpi-box primary">
          <span className="label">Total Pointages</span>
          <span className="value">{kpis.totalPointages}</span>
        </div>

        <div className="kpi-box info">
          <span className="label">Arrivées</span>
          <span className="value">{kpis.entries}</span>
        </div>

        <div className="kpi-box info">
          <span className="label">Départs</span>
          <span className="value">{kpis.exits}</span>
        </div>

        <div className="kpi-box success">
          <span className="label">Agents Présents</span>
          <span className="value">
            {kpis.agentsPresent} / {kpis.totalAgents}
          </span>
        </div>

        <div className="kpi-box warning">
          <span className="label">Agents Absents</span>
          <span className="value">{kpis.agentsAbsent}</span>
        </div>

        <div className="kpi-box danger">
          <span className="label">Retards</span>
          <span className="value">{kpis.lateArrivals}</span>
        </div>

        <div className="kpi-box highlight">
          <span className="label">Taux Assiduité</span>
          <span className="value">{kpis.attendanceRate}%</span>
        </div>
      </div>
    </div>
  );
};

export default StatisticsKPIs;
