import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useConfirm } from '../../contexts/FeedbackContext';
import { Avatar, Icon } from '../ui';
import { fullName } from '../../utils/formatters';
import { isRh, isSecurity, isSuperAdmin, isSupervisor, roleLabel } from '../../utils/roles';
import './layout.css';

function navFor(user) {
  if (isRh(user)) {
    const admin = [
      ...(isSuperAdmin(user) ? [{ to: '/admin/utilisateurs', label: 'Utilisateurs', icon: 'users' }] : []),
      { to: '/admin/services', label: 'Services', icon: 'list' },
      ...(isSuperAdmin(user) ? [
        { to: '/admin/roles', label: 'Rôles et permissions', icon: 'shield' },
        { to: '/admin/badges', label: 'Badges', icon: 'badge' },
      ] : []),
    ];
    return [
      {
        items: [
          { to: '/admin', label: 'Tableau de bord', icon: 'dashboard', end: true },
          { to: '/admin/pointages', label: 'Pointages', icon: 'clock' },
          { to: '/admin/conges', label: 'Congés', icon: 'calendar' },
          { to: '/admin/rapports', label: 'Rapports', icon: 'file' },
        ],
      },
      { title: 'Administration', items: admin },
    ];
  }
  if (isSecurity(user)) {
    return [{ items: [{ to: '/securite', label: 'Pointage', icon: 'scan', end: true }] }];
  }
  if (isSupervisor(user)) {
    return [
      {
        title: 'Mon équipe',
        items: [
          { to: '/equipe', label: 'Tableau de bord', icon: 'dashboard', end: true },
          { to: '/equipe/pointages', label: 'Pointages', icon: 'clock' },
          { to: '/equipe/rapports', label: 'Rapports', icon: 'file' },
        ],
      },
      {
        title: 'Mon espace',
        items: [
          { to: '/agent', label: 'Accueil', icon: 'home', end: true },
          { to: '/agent/pointages', label: 'Mes pointages', icon: 'user' },
          { to: '/agent/conges', label: 'Mes congés', icon: 'calendar' },
        ],
      },
    ];
  }
  return [{
    items: [
      { to: '/agent', label: 'Accueil', icon: 'home', end: true },
      { to: '/agent/pointages', label: 'Mes pointages', icon: 'clock' },
      { to: '/agent/conges', label: 'Mes congés', icon: 'calendar' },
    ],
  }];
}

export default function AppLayout() {
  const { user, logout } = useAuth();
  const confirm = useConfirm();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => { setOpen(false); }, [location.pathname]);

  const onLogout = async () => {
    if (await confirm({ title: 'Se déconnecter', message: 'Voulez-vous fermer votre session ?', confirmLabel: 'Se déconnecter' })) {
      logout();
    }
  };

  return (
    <div className="shell">
      <aside className={`sidebar ${open ? 'is-open' : ''}`} aria-label="Navigation principale">
        <div className="sidebar-brand">
          <span className="brand-tile"><img src="/images/ansd-logo.png" alt="" /></span>
          <div>
            <strong>Pointage</strong>
            <span>ANSD</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navFor(user).map((group, i) => (
            <div className="nav-group" key={i}>
              {group.title && <span className="nav-title">{group.title}</span>}
              {group.items.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.end} className="nav-link">
                  <Icon name={item.icon} size={18} />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-user">
          <Avatar user={user} size={36} />
          <div className="sidebar-user-text">
            <strong>{fullName(user)}</strong>
            <span>{roleLabel(user)}</span>
          </div>
          <button type="button" className="sidebar-logout" onClick={onLogout} aria-label="Se déconnecter" title="Se déconnecter">
            <Icon name="logout" size={18} />
          </button>
        </div>
      </aside>

      {open && <div className="sidebar-scrim" onClick={() => setOpen(false)} aria-hidden="true" />}

      <div className="shell-main">
        <header className="topbar">
          <button type="button" className="topbar-menu" onClick={() => setOpen(true)} aria-label="Ouvrir le menu">
            <Icon name="menu" size={22} />
          </button>
          <strong>Pointage · ANSD</strong>
        </header>
        <main className="content" id="contenu">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
