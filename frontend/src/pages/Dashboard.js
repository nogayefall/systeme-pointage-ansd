import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usersAPI } from '../services/api';
import api from '../services/api';
import AddUserModal from '../components/AddUserModal';
import EditUserModal from '../components/EditUserModal';
import RolesManagement from './RolesManagement';
import { Reports } from './Reports';
import { Statistics } from './Statistics';
import { LeaveManagement } from './LeaveManagement';
import './Dashboard.css';

export const Dashboard = () => {
  const { user, logout, hasPermission } = useAuth();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [pointages, setPointages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [error, setError] = useState(null);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [activeSection, setActiveSection] = useState('users');
  const [searchPointage, setSearchPointage] = useState(''); // Filtrage pointages
  const [pointagePageSize] = useState(10); // Nombre de pointages par page
  const [pointagePage, setPointagePage] = useState(1); // Page actuelle pour pointages

  // Charger les rôles
  const fetchRoles = useCallback(async () => {
    try {
      const response = await api.get('/roles');
      setRoles(response.data.data || response.data);
    } catch (err) {
      console.error('Erreur lors du chargement des rôles:', err);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const fetchUsers = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      console.log('Fetching users...');
      const response = await usersAPI.list(page, 10);
      console.log('Users fetched:', response.data);
      setUsers(response.data.data);
      setPagination(response.data.pagination);
    } catch (err) {
      console.error('Erreur lors du chargement des utilisateurs:', err);
      setError(err.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Charger les pointages du jour
  useEffect(() => {
    const fetchPointages = async () => {
      try {
        const response = await api.get('/pointages?page=1&limit=500');
        // Afficher tous les pointages, pas juste d'aujourd'hui
        let pointagesList = [];
        if (response.data?.data && Array.isArray(response.data.data)) {
          pointagesList = response.data.data;
        }
        setPointages(pointagesList);
      } catch (err) {
        console.error('Erreur lors du chargement des pointages:', err);
        setPointages([]);
      }
    };

    // Charger immédiatement au montage
    fetchPointages();
    
    // Rafraîchir toutes les 5 secondes
    const interval = setInterval(fetchPointages, 5000);
    return () => clearInterval(interval);
  }, [activeSection]); // Recharger quand on change d'onglet


  const handleLogout = async () => {
    await logout();
  };

  const handleUserAdded = () => {
    setPage(1);
    fetchUsers();
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setShowEditUserModal(true);
  };

  const handleUserUpdated = () => {
    fetchUsers();
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur?')) {
      try {
        await api.delete(`/users/${userId}`);
        alert('Utilisateur supprimé avec succès!');
        fetchUsers();
      } catch (err) {
        alert('Erreur lors de la suppression: ' + (err.response?.data?.error || err.message));
      }
    }
  };

  // Supprimer un pointage
  const handleDeletePointage = async (pointageId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce pointage? Cette action est irréversible.')) {
      try {
        const response = await api.delete(`/pointages/${pointageId}`);
        
        if (response.data?.success) {
          // Supprimer le pointage de l'état local immédiatement
          setPointages(pointages.filter(p => p.id !== pointageId));
          alert('Pointage supprimé avec succès');
        } else {
          alert('Erreur: ' + (response.data?.error || 'Impossible de supprimer le pointage'));
        }
      } catch (err) {
        console.error('Erreur lors de la suppression:', err);
        alert('Erreur lors de la suppression: ' + (err.response?.data?.error || err.message));
      }
    }
  };

  // Filtrer les pointages selon la recherche
  const getFilteredPointages = () => {
    if (!searchPointage.trim()) {
      return pointages;
    }
    
    const search = searchPointage.toLowerCase();
    return pointages.filter(p => {
      const matricule = p.agent?.matricule?.toLowerCase() || '';
      const nom = p.agent?.nom?.toLowerCase() || '';
      const prenom = p.agent?.prenom?.toLowerCase() || '';
      
      return matricule.includes(search) || nom.includes(search) || prenom.includes(search);
    });
  };

  const filteredPointages = getFilteredPointages();

  // Paginer les pointages filtrés
  const totalPointagePages = Math.ceil(filteredPointages.length / pointagePageSize);
  const startIndex = (pointagePage - 1) * pointagePageSize;
  const paginatedPointages = filteredPointages.slice(startIndex, startIndex + pointagePageSize);

  // Réinitialiser la page si la recherche change
  useEffect(() => {
    setPointagePage(1);
  }, [searchPointage]);

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-brand">
            <img src="/images/ansd-logo.png" alt="ANSD Logo" className="ansd-logo" />
            <h1>Tableau de Bord - {user?.roles?.includes('ROLE_SUPER_ADMIN') ? 'Super Admin' : user?.roles?.includes('ROLE_RH_ADMIN') ? 'Admin RH' : user?.roles?.includes('ROLE_SECURITY_AGENT') ? 'Agent de Sécurité' : 'Agent'}</h1>
          </div>
          <div className="header-user">
            <span>{user?.prenom} {user?.nom}</span>
            <button onClick={handleLogout} className="btn btn-logout">
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <div className="dashboard-container">
        <aside className="sidebar">
          <nav className="sidebar-menu">
            <div className="menu-section">
              <h3>Gestion</h3>
              <ul>
                <li>
                  <button 
                    className={`menu-link ${activeSection === 'users' ? 'active' : ''}`}
                    onClick={() => setActiveSection('users')}
                  >
                    Utilisateurs
                  </button>
                </li>
                {(user?.roles?.includes('ROLE_RH_ADMIN') || user?.roles?.includes('ROLE_SUPER_ADMIN')) && (
                <li>
                  <button 
                    className={`menu-link ${activeSection === 'leaves' ? 'active' : ''}`}
                    onClick={() => setActiveSection('leaves')}
                  >
                    Gestion des congés
                  </button>
                </li>
                )}
                <li>
                  <button 
                    className={`menu-link ${activeSection === 'roles' ? 'active' : ''}`}
                    onClick={() => setActiveSection('roles')}
                  >
                    Rôles et Permissions
                  </button>
                </li>
              </ul>
            </div>

            {/* Pointages - Visible pour Super Admin et ceux avec permission view_pointages */}
            {(hasPermission('view_pointages') || user?.roles?.includes('ROLE_SUPER_ADMIN')) && (
              <div className="menu-section">
                <h3>Opérations</h3>
                <ul>
                  <li>
                    <button 
                      className={`menu-link ${activeSection === 'pointages' ? 'active' : ''}`}
                      onClick={() => setActiveSection('pointages')}
                    >
                      Pointages
                    </button>
                  </li>
                </ul>
              </div>
            )}

            {/* Rapports et Statistiques - Visible pour Super Admin et ceux avec permission view_reports */}
            {(hasPermission('view_reports') || user?.roles?.includes('ROLE_SUPER_ADMIN')) && (
              <div className="menu-section">
                <h3>Rapports</h3>
                <ul>
                  <li>
                    <button 
                      className={`menu-link ${activeSection === 'reports' ? 'active' : ''}`}
                      onClick={() => setActiveSection('reports')}
                    >
                      Rapports
                    </button>
                  </li>
                  <li>
                    <button 
                      className={`menu-link ${activeSection === 'statistics' ? 'active' : ''}`}
                      onClick={() => setActiveSection('statistics')}
                    >
                      Statistiques
                    </button>
                  </li>
                </ul>
              </div>
            )}
          </nav>
        </aside>

        <main className="dashboard-content">
          {/* Section Utilisateurs - Visible seulement pour Super Admin */}
          {activeSection === 'users' && user?.roles?.includes('ROLE_SUPER_ADMIN') && (
          <section className="content-section">
            <div className="section-header">
              <h2>Gestion des Utilisateurs</h2>
              <button 
                className="btn btn-primary"
                onClick={() => setShowAddUserModal(true)}
              >
                + Ajouter un utilisateur
              </button>
            </div>

            {loading ? (
              <div className="loading">Chargement...</div>
            ) : error ? (
              <div className="alert alert-error">
                <strong>Erreur:</strong> {error}
              </div>
            ) : (
              <>
                <div className="table-responsive">
                  <table className="users-table">
                    <thead>
                      <tr>
                        <th>Matricule</th>
                        <th>Nom</th>
                        <th>Prénom</th>
                        <th>Email</th>
                        <th>Rôle</th>
                        <th>Statut</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id}>
                          <td>{user.matricule}</td>
                          <td>{user.nom}</td>
                          <td>{user.prenom}</td>
                          <td>{user.email}</td>
                          <td>
                            <span className="badge badge-info">{user.role}</span>
                          </td>
                          <td>
                            <span
                              className={`badge ${
                                user.isActive ? 'badge-success' : 'badge-danger'
                              }`}
                            >
                              {user.isActive ? 'Actif' : 'Inactif'}
                            </span>
                          </td>
                          <td className="actions">
                            <button 
                              className="btn-icon btn-edit" 
                              title="Modifier"
                              onClick={() => handleEditUser(user)}
                            >
                              ✎
                            </button>
                            <button 
                              className="btn-icon btn-delete" 
                              title="Supprimer"
                              onClick={() => handleDeleteUser(user.id)}
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {pagination && (
                  <div className="pagination">
                    <button
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      className="btn btn-sm"
                    >
                      Précédent
                    </button>
                    <span className="page-info">
                      Page {page} sur {pagination.pages} ({pagination.total} utilisateurs)
                    </span>
                    <button
                      onClick={() => setPage(Math.min(pagination.pages, page + 1))}
                      disabled={page === pagination.pages}
                      className="btn btn-sm"
                    >
                      Suivant
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
          )}

          {/* Section Rôles et Permissions - Visible seulement pour Super Admin */}
          {activeSection === 'roles' && user?.roles?.includes('ROLE_SUPER_ADMIN') && (
            <RolesManagement onRolesUpdated={fetchRoles} />
          )}

          {/* Section Pointages - Visible pour Super Admin et ceux avec permission view_pointages */}
          {activeSection === 'pointages' && (hasPermission('view_pointages') || user?.roles?.includes('ROLE_SUPER_ADMIN')) && (
            <section className="content-section">
              <h2>📋 Pointages Enregistrés</h2>
              <p style={{color: '#666', marginBottom: '20px'}}>Gestion de tous les pointages enregistrés</p>
              
              {/* Barre de recherche et filtrage */}
              <div style={{marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center'}}>
                <input
                  type="text"
                  placeholder="Rechercher par matricule, nom ou prénom..."
                  value={searchPointage}
                  onChange={(e) => setSearchPointage(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '10px 15px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
                <button
                  onClick={() => setSearchPointage('')}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Réinitialiser
                </button>
              </div>
              
              <div className="pointages-container">
                <div className="pointages-stats">
                  <div className="stat-box">
                    <div className="stat-number">{filteredPointages.length}</div>
                    <div className="stat-label">Total pointages</div>
                  </div>
                </div>
                {filteredPointages.length === 0 ? (
                  <div style={{
                    padding: '40px',
                    textAlign: 'center',
                    color: '#999'
                  }}>
                    <p>{searchPointage ? 'Aucun pointage trouvé pour cette recherche' : 'Aucun pointage enregistré pour le moment'}</p>
                  </div>
                ) : (
                  <>
                    <table className="pointages-table">
                      <thead>
                        <tr>
                          <th>Matricule</th>
                          <th>Agent</th>
                          <th>Date</th>
                          <th>Heure</th>
                          <th>Type</th>
                          <th>Méthode</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedPointages.map((p) => (
                          <tr key={p.id}>
                            <td className="matricule-col">{p.agent?.matricule}</td>
                            <td className="agent-col">{p.agent?.prenom} {p.agent?.nom}</td>
                            <td className="date-col"><strong>{new Date(p.datetime).toLocaleDateString('fr-FR')}</strong></td>
                            <td className="time-col"><strong>{new Date(p.datetime).toLocaleTimeString('fr-FR')}</strong></td>
                            <td>
                              <span className={`badge badge-${p.type === 'ENTRY' ? 'success' : 'danger'}`}>
                                {p.type === 'ENTRY' ? 'ARRIVÉE' : 'DÉPART'}
                              </span>
                            </td>
                            <td>
                              <span className="badge badge-method">
                                {p.method === 'BARCODE' ? 'CODE-BARRE' : 'MANUEL'}
                              </span>
                            </td>
                            <td className="actions-col">
                              <button
                                className="btn btn-sm btn-danger"
                                onClick={() => handleDeletePointage(p.id)}
                                title="Supprimer ce pointage"
                              >
                                Supprimer
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    
                    {totalPointagePages > 1 && (
                      <div style={{marginTop: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px'}}>
                        <button
                          onClick={() => setPointagePage(Math.max(1, pointagePage - 1))}
                          disabled={pointagePage === 1}
                          style={{
                            padding: '8px 15px',
                            backgroundColor: pointagePage === 1 ? '#ccc' : '#0066cc',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: pointagePage === 1 ? 'not-allowed' : 'pointer'
                          }}
                        >
                          ← Précédent
                        </button>
                        
                        <span style={{margin: '0 10px', fontSize: '14px', fontWeight: 'bold'}}>
                          Page {pointagePage} sur {totalPointagePages}
                        </span>
                        
                        <button
                          onClick={() => setPointagePage(Math.min(totalPointagePages, pointagePage + 1))}
                          disabled={pointagePage === totalPointagePages}
                          style={{
                            padding: '8px 15px',
                            backgroundColor: pointagePage === totalPointagePages ? '#ccc' : '#0066cc',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: pointagePage === totalPointagePages ? 'not-allowed' : 'pointer'
                          }}
                        >
                          Suivant →
                        </button>
                        
                        <span style={{marginLeft: '20px', fontSize: '13px', color: '#666'}}>
                          ({filteredPointages.length} résultats)
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </section>
          )}

          {/* Section Gestion des congés - Visible pour RH Admin et Super Admin */}
          {activeSection === 'leaves' && (user?.roles?.includes('ROLE_RH_ADMIN') || user?.roles?.includes('ROLE_SUPER_ADMIN')) && (
            <section className="content-section">
              <LeaveManagement />
            </section>
          )}

          {/* Section Rapports - Visible pour Super Admin et ceux avec permission view_reports */}
          {activeSection === 'reports' && (hasPermission('view_reports') || user?.roles?.includes('ROLE_SUPER_ADMIN')) && (
            <Reports />
          )}

          {/* Section Statistiques - Visible pour Super Admin et ceux avec permission view_reports */}
          {activeSection === 'statistics' && (hasPermission('view_reports') || user?.roles?.includes('ROLE_SUPER_ADMIN')) && (
            <Statistics />
          )}
        </main>

      <EditUserModal
        isOpen={showEditUserModal}
        onClose={() => {
          setShowEditUserModal(false);
          setSelectedUser(null);
        }}
        onUserUpdated={handleUserUpdated}
        user={selectedUser}
        roles={roles}
      />
      </div>

      <AddUserModal
        isOpen={showAddUserModal}
        onClose={() => setShowAddUserModal(false)}
        onUserAdded={handleUserAdded}
        roles={roles}
      />
    </div>
  );
};
