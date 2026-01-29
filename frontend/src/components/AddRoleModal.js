import React, { useState } from 'react';
import api from '../services/api';
import './RoleModal.css';

const AddRoleModal = ({ isOpen, onClose, onRoleAdded, permissions }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissionIds: [],
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePermissionChange = (permissionId) => {
    setFormData(prev => ({
      ...prev,
      permissionIds: prev.permissionIds.includes(permissionId)
        ? prev.permissionIds.filter(id => id !== permissionId)
        : [...prev.permissionIds, permissionId],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError('Le nom du rôle est obligatoire');
      return;
    }

    try {
      setLoading(true);

      // Créer le rôle
      const createResponse = await api.post('/roles', {
        name: formData.name,
        description: formData.description,
      });

      // Assigner les permissions si sélectionnées
      if (formData.permissionIds.length > 0) {
        await api.put(`/roles/${createResponse.data.data.id}/permissions`, {
          permissionIds: formData.permissionIds,
        });
      }

      setFormData({ name: '', description: '', permissionIds: [] });
      onRoleAdded();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la création du rôle');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Ajouter un rôle</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Nom du rôle *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Ex: Administrateur, Agent de sécurité"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Description du rôle"
              rows="3"
            />
          </div>

          <div className="form-group">
            <label>Permissions</label>
            <div className="permissions-checkboxes">
              {permissions.length > 0 ? (
                permissions.map((permission) => (
                  <label key={permission.id} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.permissionIds.includes(permission.id)}
                      onChange={() => handlePermissionChange(permission.id)}
                    />
                    <span className="checkbox-text">
                      <strong>{permission.name}</strong>
                      {permission.description && (
                        <small>{permission.description}</small>
                      )}
                    </span>
                  </label>
                ))
              ) : (
                <p className="no-permissions">Aucune permission disponible</p>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Annuler
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Création...' : 'Créer le rôle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddRoleModal;
