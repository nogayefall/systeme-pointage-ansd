import React, { useState } from 'react';
import api from '../services/api';
import '../styles/AddUserModal.css';

const AddUserModal = ({ isOpen, onClose, onUserAdded, roles }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    matricule: '',
    nom: '',
    prenom: '',
    roleId: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Trouver le rôle "Agent" pour vérifier si c'est un agent simple
  const agentRole = roles?.find(r => r.name.toLowerCase() === 'agent');
  const isSimpleAgent = formData.roleId === agentRole?.id?.toString();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validation des champs requis
      const requiredFields = ['matricule', 'nom', 'prenom', 'roleId'];
      
      // Ajouter email et password aux champs requis si ce n'est pas un agent simple
      if (!isSimpleAgent) {
        requiredFields.push('email', 'password');
      }

      for (let field of requiredFields) {
        if (!formData[field]) {
          setError(`Le champ ${field} est requis`);
          setLoading(false);
          return;
        }
      }

      // Préparer les données à envoyer
      const submitData = {
        matricule: formData.matricule,
        nom: formData.nom,
        prenom: formData.prenom,
        roleId: parseInt(formData.roleId),
      };

      // Ajouter email et password seulement si ce n'est pas un agent simple
      if (!isSimpleAgent) {
        submitData.email = formData.email;
        submitData.password = formData.password;
      }

      const response = await api.post('/users', submitData);

      if (response.status === 201 || response.status === 200) {
        alert('Utilisateur créé avec succès!');
        setFormData({
          email: '',
          password: '',
          matricule: '',
          nom: '',
          prenom: '',
          roleId: '',
        });
        onUserAdded();
        onClose();
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Erreur lors de la création';
      setError(errorMessage);
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Ajouter un Utilisateur</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="user-form">
          {error && <div className="error-message">{error}</div>}

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

          {isSimpleAgent && (
            <div className="info-message">
              ℹ️ Les agents simples n'ont pas de compte utilisateur. Seul le matricule, nom et prénom sont nécessaires.
            </div>
          )}

          {/* Email - Masqué pour les agents simples */}
          {!isSimpleAgent && (
            <div className="form-group">
              <label>Email *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="email@example.com"
                required={!isSimpleAgent}
              />
            </div>
          )}

          {/* Mot de passe - Masqué pour les agents simples */}
          {!isSimpleAgent && (
            <div className="form-group">
              <label>Mot de passe *</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                required={!isSimpleAgent}
              />
            </div>
          )}

          <div className="form-group">
            <label>Matricule *</label>
            <input
              type="text"
              name="matricule"
              value={formData.matricule}
              onChange={handleChange}
              placeholder="MAT001"
              required
            />
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
              {loading ? 'Création...' : 'Créer l\'utilisateur'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddUserModal;
