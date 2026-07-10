import React, { useEffect, useState } from 'react';
import { leavesAPI } from '../services/api';
import ConfirmModal from '../components/ConfirmModal';
import Toast from '../components/Toast';
import './LeaveManagement.css';
import { formatMatricule, translateLeaveStatus, statusBadgeClass } from '../utils/formatters';

export function LeaveManagement() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters & pagination
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  // Confirm modal
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmPayload, setConfirmPayload] = useState(null);

  // Toast
  const [toast, setToast] = useState({ message: '', type: 'info' });

  useEffect(() => { fetchLeaves(); }, []);

  async function fetchLeaves() {
    setLoading(true);
    setError('');
    try {
      const res = await leavesAPI.list();
      setLeaves(res.data.data || []);
    } catch (err) {
      console.error(err);
      setError('Erreur lors du chargement des demandes');
      setLeaves([]);
    } finally {
      setLoading(false);
    }
  }

  function openConfirm(action, payload) {
    setConfirmAction(action);
    setConfirmPayload(payload);
    setConfirmOpen(true);
  }

  async function runConfirmAction() {
    if (!confirmAction || !confirmPayload) return;
    const { id } = confirmPayload;
    setConfirmOpen(false);

    try {
      if (confirmAction === 'approve') {
        await leavesAPI.approve(id);
        setToast({ message: 'Demande approuvée', type: 'success' });
      } else if (confirmAction === 'reject') {
        await leavesAPI.reject(id);
        setToast({ message: 'Demande rejetée', type: 'success' });
      }
      await fetchLeaves();
    } catch (err) {
      console.error('Approve/Reject error:', err);
      const serverMsg = err.response?.data?.error || err.response?.data?.message || err.message;
      setToast({ message: `Erreur: ${serverMsg}`, type: 'error' });
    }
  }

  const filtered = leaves.filter(l => {
    if (statusFilter && l.status !== statusFilter) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return (l.user && l.user.toLowerCase().includes(s)) || (l.userName && l.userName.toLowerCase().includes(s));
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageData = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="container leaves-page">
      <h2>Gestion des congés</h2>

      <div className="leaves-filters">
        <input placeholder="Rechercher par matricule ou nom" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">Tous statuts</option>
          <option value="PENDING">En attente</option>
          <option value="APPROVED">Approuvés</option>
          <option value="REJECTED">Rejetés</option>
        </select>
        <button onClick={() => { setSearch(''); setStatusFilter(''); setPage(1); }}>Réinitialiser</button>
      </div>

      {loading ? <p>Chargement...</p> : error ? <div className="alert alert-error">{error}</div> : (
        <>
          <table className="table leaves-table">
            <thead>
              <tr><th>Matricule</th><th>Agent</th><th>Début</th><th>Fin</th><th>Motif</th><th>Statut</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {pageData.map(l => (
                <tr key={l.id}>
                  <td>{formatMatricule(l.user)}</td>
                  <td>{l.userName || '—'}</td>
                  <td>{l.startDate}</td>
                  <td>{l.endDate}</td>
                  <td>{l.reason}</td>
                  <td>
                    <span className={`badge ${statusBadgeClass(l.status)}`}>
                      {translateLeaveStatus(l.status)}
                    </span>
                  </td>
                  <td>
                    {['PENDING', 'REQUEST', 'REQUESTED'].includes((l.status || '').toUpperCase()) && (
                      <>
                        <button className="btn-approve" onClick={() => openConfirm('approve', { id: l.id })}>Valider</button>
                        <button className="btn-reject" onClick={() => openConfirm('reject', { id: l.id })}>Rejeter</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="leaves-pagination">
            <button disabled={page === 1} onClick={() => setPage(p => Math.max(1, p-1))}>Précédent</button>
            <span>Page {page} / {totalPages}</span>
            <button disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p+1))}>Suivant</button>
          </div>
        </>
      )}

      <ConfirmModal
        isOpen={confirmOpen}
        title={confirmAction === 'approve' ? 'Confirmer la validation' : 'Confirmer le rejet'}
        message={confirmAction === 'approve' ? 'Voulez-vous vraiment approuver cette demande ?' : 'Voulez-vous vraiment rejeter cette demande ?'}
        onConfirm={runConfirmAction}
        onCancel={() => setConfirmOpen(false)}
      />

      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'info' })} />
    </div>
  );
}
