import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import AddRoleModal from '../components/AddRoleModal';
import EditRoleModal from '../components/EditRoleModal';
import './RolesManagement.css';

export const RolesManagement = ({ onRolesUpdated }) => {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddRoleModal, setShowAddRoleModal] = useState(false);
  const [showEditRoleModal, setShowEditRoleModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);

  const fetchRoles = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const response = await api.get('/roles');
      setRoles(response.data.data);
      // Notifier le parent que les rôles ont été mis à jour
      if (onRolesUpdated) {
        onRolesUpdated(response.data.data);
      }
    } catch (err) {
      console.error('Erreur lors du chargement des rôles:', err);
      setError(err.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [onRolesUpdated]);

  const fetchPermissions = useCallback(async () => {
    try {
      const response = await api.get('/permissions');
      setPermissions(response.data.data);
    } catch (err) {
      console.error('Erreur lors du chargement des permissions:', err);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, [fetchRoles, fetchPermissions]);

  const handleEditRole = (role) => {
    setSelectedRole(role);
    setShowEditRoleModal(true);
  };

  const handleRoleUpdated = () => {
    fetchRoles();
  };

  const handleDeleteRole = async (roleId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce rôle?')) {
      try {
        await api.delete(`/roles/${roleId}`);
        alert('Rôle supprimé avec succès!');
        fetchRoles();
      } catch (err) {
        alert('Erreur lors de la suppression: ' + (err.response?.data?.error || err.message));
      }
    }
  };

  const handleRoleAdded = () => {
    fetchRoles();
  };

  return (
    <div className="roles-management">
      <div className="section-header">
        <h2>Gestion des Rôles et Permissions</h2>
        <button 
          className="btn btn-primary"
          onClick={() => setShowAddRoleModal(true)}
        >
          + Ajouter un rôle
        </button>
      </div>

      {loading ? (
        <div className="loading">Chargement...</div>
      ) : error ? (
        <div className="alert alert-error">
          <strong>Erreur:</strong> {error}
        </div>
      ) : (
        <div className="table-responsive">
          <table className="roles-table">
            <thead>
              <tr>
                <th>Nom du rôle</th>
                <th>Description</th>
                <th>Permissions</th>
                <th>Utilisateurs</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr key={role.id}>
                  <td className="role-name">{role.name}</td>
                  <td>{role.description || '-'}</td>
                  <td className="permissions-cell">
                    <div className="permissions-list">
                      {role.permissions.length > 0 ? (
                        role.permissions.map((perm) => (
                          <span key={perm.id} className="permission-badge">
                            {perm.name}
                          </span>
                        ))
                      ) : (
                        <span className="empty-permissions">Aucune permission</span>
                      )}
                    </div>
                  </td>
                  <td className="users-count">
                    <span className="badge badge-info">{role.usersCount}</span>
                  </td>
                  <td className="actions">
                    <button 
                      className="btn-icon btn-edit" 
                      title="Modifier"
                      onClick={() => handleEditRole(role)}
                    >
                      ✎
                    </button>
                    <button 
                      className="btn-icon btn-delete" 
                      title="Supprimer"
                      onClick={() => handleDeleteRole(role.id)}
                      disabled={role.usersCount > 0}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AddRoleModal
        isOpen={showAddRoleModal}
        onClose={() => setShowAddRoleModal(false)}
        onRoleAdded={handleRoleAdded}
        permissions={permissions}
      />

      <EditRoleModal
        isOpen={showEditRoleModal}
        onClose={() => {
          setShowEditRoleModal(false);
          setSelectedRole(null);
        }}
        onRoleUpdated={handleRoleUpdated}
        role={selectedRole}
        permissions={permissions}
      />
    </div>
  );
};

export default RolesManagement;
