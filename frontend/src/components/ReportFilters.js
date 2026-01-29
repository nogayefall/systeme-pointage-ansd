import React from 'react';

const ReportFilters = ({
  reportType,
  dateStart,
  setDateStart,
  dateEnd,
  setDateEnd,
  selectedAgent,
  setSelectedAgent,
  agents,
}) => {
  return (
    <div className="report-filters">
      <div className="filter-group">
        <label>Date Début:</label>
        <input
          type="date"
          value={dateStart}
          onChange={(e) => setDateStart(e.target.value)}
        />
      </div>

      <div className="filter-group">
        <label>Date Fin:</label>
        <input
          type="date"
          value={dateEnd}
          onChange={(e) => setDateEnd(e.target.value)}
        />
      </div>

      {reportType === 'pointages' && (
        <div className="filter-group">
          <label>Agent:</label>
          <select
            value={selectedAgent || ''}
            onChange={(e) => setSelectedAgent(e.target.value ? parseInt(e.target.value) : null)}
          >
            <option value="">Tous les agents</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.matricule} - {agent.nom} {agent.prenom}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};

export default ReportFilters;
