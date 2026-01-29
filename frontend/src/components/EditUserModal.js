import React, { useState, useEffect } from 'react';
import api from '../services/api';
import '../styles/AddUserModal.css';

const EditUserModal = ({ isOpen, onClose, onUserUpdated, user, roles }) => {
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    isActive: true,
    roleId: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && isOpen) {
      setFormData({
        nom: user.nom || '',
        prenom: user.prenom || '',
        isActive: user.isActive !== undefined ? user.isActive : true,
        roleId: user.roleId || '',
      });
    }
  }, [user, isOpen]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const submitData = {
        nom: formData.nom,
        prenom: formData.prenom,
        isActive: formData.isActive,
      };

      if (formData.roleId) {
        submitData.roleId = parseInt(formData.roleId);
      }

      const response = await api.put(`/users/${user.id}`, submitData);

      if (response.status === 200) {
        alert('Utilisateur modifié avec succès!');
        onUserUpdated();
        onClose();
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Erreur lors de la modification';
      setError(errorMessage);
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !user) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Modifier l'utilisateur</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="user-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label>Matricule</label>
            <input
              type="text"
              value={user.matricule}
              disabled
              className="input-disabled"
            />
            <small>Ne peut pas être modifié</small>
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={user.email}
              disabled
              className="input-disabled"
            />
            <small>Ne peut pas être modifié</small>
          </div>

          <div className="form-group">
            <label>Nom *</label>
            <input
              type="text"
              name="nom"
              value={formData.nom}
              onChange={handleChange}
              placeholder="Nom de famille"
              required
            />
          </div>

          <div className="form-group">
            <label>Prénom *</label>
            <input
              type="text"
              name="prenom"
              value={formData.prenom}
              onChange={handleChange}
              placeholder="Prénom"
              required
            />
          </div>

          <div className="form-group">
            <label>Rôle *</label>
            <select
              name="roleId"
              value={formData.roleId}
              onChange={handleChange}
              required
            >
              <option value="">-- Sélectionner un rôle --</option>
              {roles && roles.map(role => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
              />
              Utilisateur actif
            </label>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn-cancel"
              onClick={onClose}
              disabled={loading}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="btn-submit"
              disabled={loading}
            >
              {loading ? 'Modification...' : 'Modifier l\'utilisateur'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditUserModal;
