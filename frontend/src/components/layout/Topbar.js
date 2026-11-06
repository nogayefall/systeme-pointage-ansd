import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button, Icon } from '../ui';
import { homePathFor, roleLabel } from '../../utils/roles';
import './layout.css';

const PAGE_TITLES = {
  '/admin': 'Tableau de bord',
  '/admin/pointages': 'Pointages',
  '/admin/conges': 'Congés',
  '/admin/rapports': 'Rapports',
  '/admin/services': 'Services',
  '/admin/utilisateurs': 'Utilisateurs',
  '/admin/roles': 'Rôles et permissions',
  '/admin/badges': 'Badges',
  '/equipe': 'Tableau de bord',
  '/equipe/pointages': 'Pointages',
  '/equipe/rapports': 'Rapports',
  '/agent': 'Accueil',
  '/agent/pointages': 'Mes pointages',
  '/agent/conges': 'Mes congés',
};

export default function Topbar({ user, onMenu, onLogout }) {
  const { pathname } = useLocation();
  const title = PAGE_TITLES[pathname] || 'Pointage';

  return (
    <header className="app-topbar">
      <div className="topbar-crumb">
        <button type="button" className="topbar-menu" onClick={onMenu} aria-label="Ouvrir le menu">
          <Icon name="menu" size={20} />
        </button>
        <Link className="topbar-home" to={homePathFor(user)} aria-label="Accueil">
          <Icon name="home" size={18} />
        </Link>
        <Icon name="chevronRight" size={16} className="topbar-chevron" />
        <h1>{title}</h1>
      </div>
      <div className="topbar-actions">
        <div className="topbar-profile" aria-label={`Profil actif : ${roleLabel(user)}`}>
          <span>Profil actif</span>
          <strong>{roleLabel(user)}</strong>
        </div>
        <Button className="topbar-logout" variant="secondary" icon="logout" onClick={onLogout}>
          Déconnexion
        </Button>
      </div>
    </header>
  );
}
