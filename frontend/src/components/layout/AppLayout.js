import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useConfirm } from '../../contexts/FeedbackContext';
import { Avatar, Icon } from '../ui';
import { fullName } from '../../utils/formatters';
import { isSecurity } from '../../utils/roles';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { navigationFor } from './navigation';
import './layout.css';
import './app-layout.css';

function HeaderDateTime() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const time = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const date = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const capitalizedDate = date.charAt(0).toUpperCase() + date.slice(1);

  return (
    <time className="staff-datetime" dateTime={now.toISOString()}>
      <Icon name="clock" size={15} />
      <strong>{time}</strong>
      <span>{capitalizedDate}</span>
    </time>
  );
}

export default function AppLayout() {
  const { user, logout } = useAuth();
  const confirm = useConfirm();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const securityPortal = isSecurity(user);

  useEffect(() => { setOpen(false); }, [location.pathname]);

  const onLogout = async () => {
    if (await confirm({ title: 'Se déconnecter', message: 'Voulez-vous fermer votre session ?', confirmLabel: 'Se déconnecter' })) {
      logout();
    }
  };

  if (securityPortal) {
    return (
      <div className="shell staff-shell">
        <div className="shell-main">
          <header className="staff-topbar">
            <div className="staff-brand">
              <span className="staff-brand-tile"><img src="/images/ansd-logo.png" alt="Logo ANSD" /></span>
              <span><strong>Pointage</strong><small>ANSD · Agence Nationale de la Statistique et de la Démographie</small></span>
            </div>
            <nav className="staff-nav" aria-label="Navigation principale">
              {navigationFor(user).flatMap((group) => group.items).map((item) => (
                <NavLink key={item.to} to={item.to} end={item.end} className="staff-nav-link">
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <HeaderDateTime />
            <div className="staff-profile">
              <Avatar user={user} size={30} />
              <span><strong>{fullName(user)}</strong><small>{user?.role}</small></span>
            </div>
            <button type="button" className="staff-logout" onClick={onLogout}>
              <Icon name="logout" size={15} />
              <span>Déconnexion</span>
            </button>
          </header>
          <main className="content staff-content" id="contenu"><Outlet /></main>
        </div>
      </div>
    );
  }

  return (
    <div className="shell app-shell">
      <Sidebar user={user} open={open} onNavigate={() => setOpen(false)} />
      {open && <button type="button" className="sidebar-scrim" onClick={() => setOpen(false)} aria-label="Fermer le menu" />}
      <div className="shell-main">
        <Topbar user={user} onMenu={() => setOpen(true)} onLogout={onLogout} />
        <main className="content app-content" id="contenu"><Outlet /></main>
      </div>
    </div>
  );
}
