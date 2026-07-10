import React, { useEffect, useState } from 'react';
import { pointagesAPI } from '../services/api';
import { translatePointageType, pointageBadgeClass } from '../utils/formatters';

export function MyPointages() {
  const [pointages, setPointages] = useState([]);

  useEffect(() => {
    pointagesAPI.myPointages(1, 100)
      .then(res => setPointages(res.data.data))
      .catch(() => setPointages([]));
  }, []);

  return (
    <div className="container">
      <h2>Mes pointages</h2>
      <table className="table">
        <thead>
          <tr>
            <th>Date / Heure</th>
            <th>Type</th>
            <th>Méthode</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          {pointages.map(p => (
            <tr key={p.id}>
              <td>{new Date(p.datetime).toLocaleString('fr-FR')}</td>
              <td>
                <span className={`badge ${pointageBadgeClass(p.type)}`}>
                  {translatePointageType(p.type)}
                </span>
              </td>
              <td>{p.method}</td>
              <td>{p.notes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
