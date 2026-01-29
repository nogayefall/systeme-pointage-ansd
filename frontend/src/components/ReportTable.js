import React from 'react';

const ReportTable = ({ data, columns }) => {
  if (!data || data.length === 0) {
    return <div className="no-data">Aucune donnée à afficher</div>;
  }

  // Traductions FR
  const translations = {
    ENTRY: 'ARRIVÉE',
    EXIT: 'DÉPART',
    BARCODE: 'CODE-BARRE',
    MANUAL: 'MANUEL',
  };

  const getColumnLabel = (col) => {
    const labels = {
      agent: 'Agent',
      type: 'Type',
      datetime: 'Date/Heure',
      method: 'Méthode',
      securityOfficer: 'Agent Sécurité',
      daysWorked: 'Jours Travaillés',
      daysAbsent: 'Jours Absents',
      lateArrivals: 'Retards',
      attendanceRate: 'Assiduité',
      matricule: 'Matricule',
      nom: 'Nom',
      prenom: 'Prénom',
    };
    return labels[col] || col;
  };

  const getColumnValue = (row, col) => {
    if (col === 'agent') {
      // Vérifier si c'est la structure d'assiduité (nom, prenom, matricule directs)
      if (row.nom && row.prenom && row.matricule && !row.agent) {
        return `${row.matricule} - ${row.nom} ${row.prenom}`;
      }
      // Sinon c'est la structure de pointages (agent object)
      return row.agent
        ? `${row.agent.matricule} - ${row.agent.nom} ${row.agent.prenom}`
        : row.matricule || 'N/A';
    }
    if (col === 'securityOfficer') {
      return row.securityOfficer
        ? `${row.securityOfficer.nom} ${row.securityOfficer.prenom}`
        : 'N/A';
    }
    if (col === 'attendanceRate') {
      return `${row[col]}%`;
    }
    if (col === 'type') {
      return translations[row[col]] || row[col];
    }
    if (col === 'method') {
      return translations[row[col]] || row[col];
    }
    return row[col] || '-';
  };

  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col}>{getColumnLabel(col)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={idx}>
              {columns.map((col) => (
                <td key={col}>{getColumnValue(row, col)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ReportTable;
