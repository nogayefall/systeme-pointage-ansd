import React, { useEffect, useState } from 'react';
import { pointagesAPI, leavesAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { translatePointageType, pointageBadgeClass } from '../utils/formatters';
import '../pages/Dashboard.css';
import './AgentDashboard.css';


export function AgentDashboard() {
  const { user, logout } = useAuth();
  const [pointages, setPointages] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState('dashboard');
  const [lastActioned, setLastActioned] = useState(null);

  // Form state for leave request
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [submittingLeave, setSubmittingLeave] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [pRes, lRes] = await Promise.all([
        pointagesAPI.myPointages(1, 20),
        leavesAPI.list(),
      ]);

      const rawPointages = pRes.data?.data || [];
      // map pointage type to french
      const typeMap = { ENTRY: 'Entrée', EXIT: 'Sortie', IN: 'Entrée', OUT: 'Sortie' };
      const mappedPointages = rawPointages.map(p => ({
        ...p,
        typeLabel: typeMap[(p.type||p.event||'').toUpperCase()] || (p.type || p.event || '—')
      }));

      const rawLeaves = lRes.data?.data || [];
      // map statuses to French and normalize
      const statusMap = { APPROVED: 'Approuvé', REJECTED: 'Rejeté', PENDING: 'En attente' };
      const mappedLeaves = rawLeaves.map(l => {
        const s = (l.status||'').toUpperCase();
        return {
          ...l,
          statusCode: s,
          statusLabel: statusMap[s] || l.status,
        };
      });

      // sort leaves: non-pending (APPROVED/REJECTED) first by approvedAt desc, then pending by created/ startDate
      mappedLeaves.sort((a,b) => {
        const aPending = a.statusCode === 'PENDING';
        const bPending = b.statusCode === 'PENDING';
        if (aPending !== bPending) return aPending ? 1 : -1;
        const aTime = (a.approvedAt || a.startDate || '');
        const bTime = (b.approvedAt || b.startDate || '');
        return (bTime || '').localeCompare(aTime || '');
      });

      setPointages(mappedPointages);
      setLeaves(mappedLeaves);

      // find most recent actioned leave (approved or rejected)
      const actioned = mappedLeaves.find(l => (l.statusCode || '').toUpperCase() !== 'PENDING');
      if (actioned) setLastActioned(actioned);
      else setLastActioned(null);
    } catch (err) {
      console.error(err);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // Poll every 12 seconds to keep leave status updated for agent
    const interval = setInterval(fetchData, 12000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmitLeave = async (e) => {
    e.preventDefault();
    setSubmittingLeave(true);
    setError('');

    if (!startDate || !endDate) {
      setError('Veuillez renseigner la date de début et de fin');
      setSubmittingLeave(false);
      return;
    }

    try {
      await leavesAPI.create({ startDate, endDate, reason });
      setStartDate('');
      setEndDate('');
      setReason('');
      await fetchData();
      alert('Demande de congé envoyée');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Erreur lors de la création de la demande');
    } finally {
      setSubmittingLeave(false);
    }
  };

  const approvedCount = leaves.filter(l => (l.statusCode || '').toUpperCase() === 'APPROVED').length;
  const pendingCount = leaves.filter(l => ['PENDING', 'REQUESTED', 'REQUEST'].includes((l.statusCode || '').toUpperCase())).length;

  const handleLogout = async () => {
    await logout();
    window.location.href = '/';
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-brand">
            <img src="/images/ansd-logo.png" alt="ANSD Logo" className="ansd-logo" />
            <h1>Tableau de bord - Agent</h1>
          </div>
          <div className="header-user">
            <span>{user?.prenom} {user?.nom}</span>
            <button onClick={handleLogout} className="btn-logout">Déconnexion</button>
          </div>
        </div>
      </header>

      <div className="dashboard-container">
        <aside className="sidebar">
          <nav className="sidebar-menu">
            <div className="menu-section">
              <h3>Mon Espace</h3>
              <ul>
                <li>
                  <button className={`menu-link ${activeSection === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveSection('dashboard')}>Tableau de bord</button>
                </li>
                <li>
                  <button className={`menu-link ${activeSection === 'leaves' ? 'active' : ''}`} onClick={() => setActiveSection('leaves')}>Mes congés</button>
                </li>
                <li>
                  <button className={`menu-link ${activeSection === 'pointages' ? 'active' : ''}`} onClick={() => setActiveSection('pointages')}>Mes pointages</button>
                </li>
              </ul>
            </div>
          </nav>
          <div style={{padding:16}}>
            <button className="btn btn-logout" onClick={handleLogout}>Déconnexion</button>
          </div>
        </aside>

        <main className="dashboard-content">
          <section className="content-section">
            <div className="section-header">
              <h2>Tableau de bord</h2>
            </div>

            <div style={{display:'flex', gap: '24px', marginTop: 20}}>
              {activeSection === 'dashboard' && (
                <>
                  {lastActioned && (
                    <div style={{background:'#e9f9ee', borderLeft:'4px solid #2ecc71', padding:'12px 16px', marginBottom:12, borderRadius:6, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                      <div>
                        <strong>Notification :</strong> Votre demande du {lastActioned.startDate} → {lastActioned.endDate} a été <strong>{lastActioned.statusLabel}</strong>.
                        {lastActioned.statusCode === 'APPROVED' && lastActioned.approvedAt && (<div style={{color:'#27ae60', marginTop:6}}>Approuvé le {lastActioned.approvedAt.split(' ')[0]} par {lastActioned.approvedByName || lastActioned.approvedBy}</div>)}
                        {lastActioned.statusCode === 'REJECTED' && lastActioned.approvedAt && (<div style={{color:'#c0392b', marginTop:6}}>Rejeté le {lastActioned.approvedAt.split(' ')[0]} par {lastActioned.approvedByName || lastActioned.approvedBy}</div>)}
                      </div>
                      <div>
                        <button className="btn" onClick={() => setLastActioned(null)}>Fermer</button>
                      </div>
                    </div>
                  )}
                  <div style={{flex:1}}>
                    <h3>Derniers pointages</h3>
                    {loading ? <p>Chargement...</p> : (
                      <div className="table-responsive">
                        <table className="users-table">
                          <thead>
                            <tr>
                              <th>Date</th>
                              <th>Heure</th>
                              <th>Type</th>
                              <th>Lieu</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pointages.length === 0 && (<tr><td colSpan={4}>Aucun pointage récent</td></tr>)}
                            {pointages.map(p => (
                              <tr key={p.id}>
                                <td>{new Date(p.datetime).toLocaleDateString()}</td>
                                <td>{new Date(p.datetime).toLocaleTimeString()}</td>
                                <td>{p.typeLabel}</td>
                                <td>{p.lieu || p.location || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  <div style={{width: 360}}>
                    <div className="leave-box">
                      <h3>Demander un congé</h3>
                      <form onSubmit={handleSubmitLeave} className="leave-form">
                        {error && <div className="alert alert-error">{error}</div>}
                        <label>Début</label>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                        <label>Fin</label>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                        <label>Raison</label>
                        <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} />
                        <button type="submit" className="btn btn-primary" disabled={submittingLeave}>{submittingLeave ? 'Envoi...' : 'Envoyer la demande'}</button>
                      </form>
                    </div>

                    <div className="leave-list" style={{marginTop: 16}}>
                      <h3>Mes demandes</h3>
                      {loading ? <p>Chargement...</p> : (
                        <ul>
                            {leaves.length === 0 && <li>Aucune demande</li>}
                          {leaves.map(l => (
                            <li key={l.id} className={`leave-item ${(l.statusCode || '').toLowerCase()}`}>
                              <div className="leave-dates">{l.startDate} → {l.endDate}</div>
                              <div className="leave-reason">{l.reason}</div>
                              <div className="leave-status">{l.statusLabel}</div>
                              {(l.statusCode || '').toUpperCase() === 'APPROVED' && <div style={{color:'#2ecc71', marginTop:6}}>Approuvé le {l.approvedAt?.split(' ')[0] || ''} par {l.approvedByName || l.approvedBy}</div>}
                              {(l.statusCode || '').toUpperCase() === 'REJECTED' && <div style={{color:'#e74c3c', marginTop:6}}>Rejeté le {l.approvedAt?.split(' ')[0] || ''} par {l.approvedByName || l.approvedBy}</div>}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </>
              )}

              {activeSection === 'leaves' && (
                <div style={{flex:1}}>
                  <h2>Mes congés</h2>
                  {loading ? <p>Chargement...</p> : (
                    <div className="table-responsive">
                      <table className="users-table">
                        <thead>
                          <tr><th>Début</th><th>Fin</th><th>Motif</th><th>Statut</th></tr>
                        </thead>
                          <tbody>
                          {leaves.length === 0 && <tr><td colSpan={4}>Aucune demande</td></tr>}
                          {leaves.map(l => (
                            <tr key={l.id}>
                              <td>{l.startDate}</td>
                              <td>{l.endDate}</td>
                              <td>{l.reason}</td>
                              <td>{l.statusLabel}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {activeSection === 'pointages' && (
                <div style={{flex:1}}>
                  <h2>Mes pointages</h2>
                  {loading ? <p>Chargement...</p> : (
                    <div className="table-responsive">
                      <table className="users-table">
                        <thead>
                          <tr><th>Date</th><th>Heure</th><th>Type</th><th>Lieu</th></tr>
                        </thead>
                        <tbody>
                          {pointages.length === 0 && <tr><td colSpan={4}>Aucun pointage</td></tr>}
                          {pointages.map(p => (
                            <tr key={p.id}>
                              <td>{new Date(p.datetime).toLocaleDateString('fr-FR')}</td>
                              <td>{new Date(p.datetime).toLocaleTimeString('fr-FR')}</td>
                              <td>
                                <span className={`badge ${pointageBadgeClass(p.type)}`}>
                                  {translatePointageType(p.type)}
                                </span>
                              </td>
                              <td>{p.lieu || p.location || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
