import React, { useEffect, useState } from 'react';
import { leavesAPI } from '../services/api';
import { translateLeaveStatus, statusBadgeClass } from '../utils/formatters';

export function MyLeaves() {
  const [leaves, setLeaves] = useState([]);
  const [form, setForm] = useState({ startDate: '', endDate: '', reason: '' });

  useEffect(() => {
    fetchLeaves();
  }, []);

  function fetchLeaves() {
    leavesAPI.list().then(res => setLeaves(res.data.data)).catch(() => setLeaves([]));
  }

  function submit(e) {
    e.preventDefault();
    leavesAPI.create(form).then(() => {
      fetchLeaves();
      setForm({ startDate: '', endDate: '', reason: '' });
      alert('Demande envoyée');
    }).catch(err => alert(err?.response?.data?.error || 'Erreur'));
  }

  return (
    <div className="container">
      <h2>Mes congés</h2>

      <form onSubmit={submit} style={{marginBottom: '20px'}}>
        <div>
          <label>Date début</label>
          <input type="date" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} required />
        </div>
        <div>
          <label>Date fin</label>
          <input type="date" value={form.endDate} onChange={e => setForm({...form, endDate: e.target.value})} required />
        </div>
        <div>
          <label>Motif</label>
          <input value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} />
        </div>
        <button type="submit">Soumettre</button>
      </form>

      <h3>Historique</h3>
      <table className="table">
        <thead>
          <tr><th>Début</th><th>Fin</th><th>Motif</th><th>Statut</th></tr>
        </thead>
        <tbody>
          {leaves.map(l => (
            <tr key={l.id}>
              <td>{l.startDate}</td>
              <td>{l.endDate}</td>
              <td>{l.reason}</td>
              <td>
                <span className={`badge ${statusBadgeClass(l.status)}`}>
                  {translateLeaveStatus(l.status)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
