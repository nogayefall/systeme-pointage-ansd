import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './BadgeCodeManagement.css';

export const BadgeCodeManagement = () => {
  const [badgeCodes, setBadgeCodes] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({ badgeCode: '', agentId: '' });

  const fetchBadgeCodes = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/badge-codes?page=${page}&limit=20`);
      setBadgeCodes(response.data.data);
      setPagination(response.data.pagination);
    } catch (err) {
      setError('Erreur lors du chargement des codes badges');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users?limit=500');
      // Filtrer les agents simples
      const agents = response.data.data.filter(u => u.role === 'Agent');
      setUsers(agents);
    } catch (err) {
      console.error('Erreur chargement users', err);
    }
  };

  useEffect(() => {
    fetchBadgeCodes();
    fetchUsers();
  }, [page]);

  const handleAddBadgeCode = async (e) => {
    e.preventDefault();
    if (!formData.badgeCode || !formData.agentId) {
      alert('Remplissez tous les champs');
      return;
    }

    try {
      await api.post('/badge-codes', formData);
      alert('Code badge ajouté avec succès!');
      setFormData({ badgeCode: '', agentId: '' });
      setShowAddModal(false);
      fetchBadgeCodes();
    } catch (err) {
      alert('Erreur: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDeleteBadgeCode = async (id) => {
    if (!window.confirm('Êtes-vous sûr?')) return;

    try {
      await api.delete(`/badge-codes/${id}`);
      alert('Code badge supprimé');
      fetchBadgeCodes();
    } catch (err) {
      alert('Erreur: ' + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div className="badge-code-management">
      <div className="section-header">
        <h2>Gestion des Codes Badges</h2>
        <p>Mappez les codes envoyés par le lecteur barcode aux agents</p>
        <button 
          className="btn btn-primary"
          onClick={() => setShowAddModal(true)}
        >
          + Ajouter un code badge
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="loading">Chargement...</div>
      ) : badgeCodes.length === 0 ? (
        <div className="empty-state">
          <p>Aucun code badge enregistré</p>
          <p>Cliquez sur "Ajouter un code badge" pour commencer</p>
        </div>
      ) : (
        <>
          <table className="badge-codes-table">
            <thead>
              <tr>
                <th>Code Badge (du lecteur)</th>
                <th>Agent</th>
                <th>Matricule</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {badgeCodes.map(code => (
                <tr key={code.id}>
                  <td className="badge-code-value">{code.badgeCode}</td>
                  <td>{code.agent.nom} {code.agent.prenom}</td>
                  <td>{code.agent.matricule}</td>
                  <td>
                    <button 
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDeleteBadgeCode(code.id)}
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {pagination && pagination.pages > 1 && (
            <div className="pagination">
              <button 
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
              >
                ← Précédent
              </button>
              <span>Page {page} sur {pagination.pages}</span>
              <button 
                onClick={() => setPage(Math.min(pagination.pages, page + 1))}
                disabled={page === pagination.pages}
              >
                Suivant →
              </button>
            </div>
          )}
        </>
      )}

      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Ajouter un Code Badge</h3>
              <button 
                className="close-btn"
                onClick={() => setShowAddModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddBadgeCode} className="modal-body">
              <div className="form-group">
                <label>Code Badge (ce que le lecteur envoie)</label>
                <input
                  type="text"
                  placeholder="Ex: !%@% ou ABC123"
                  value={formData.badgeCode}
                  onChange={e => setFormData({...formData, badgeCode: e.target.value})}
                />
                <small>Entrez exactement ce que le lecteur envoie</small>
              </div>

              <div className="form-group">
                <label>Agent</label>
                <select
                  value={formData.agentId}
                  onChange={e => setFormData({...formData, agentId: e.target.value})}
                >
                  <option value="">-- Sélectionner un agent --</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.matricule} - {user.nom} {user.prenom}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary">
                  Ajouter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BadgeCodeManagement;
