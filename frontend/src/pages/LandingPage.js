import React from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

export const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="landing-container">
      <div className="landing-content">
        <div className="landing-header">
          <div className="landing-logo">
            <img src="/images/ansd-logo.png" alt="Logo ANSD" />
          </div>
          <h1> Système de Pointage</h1>
          <p>Bienvenue dans le système de gestion des pointages</p>
        </div>

        <div className="landing-cards">
          {/* Card Admin/Dashboard */}
          <div className="landing-card admin-card">
            <div className="card-icon" aria-hidden="true">🔒</div>
            <h2>Administrateur</h2>
            <p>Accès au tableau de bord</p>
            <p className="card-description">Gestion des utilisateurs, rôles et pointages</p>
            <button 
              onClick={() => navigate('/login')}
              className="btn btn-primary btn-large"
            >
              Connexion Administrateur
            </button>
          </div>

          {/* Card Security Agent */}
          <div className="landing-card security-card">
            <div className="card-icon" aria-hidden="true">🛡️</div>
            <h2>Agent de Sécurité</h2>
            <p>Interface de pointage</p>
            <p className="card-description">Enregistrer les pointages des agents</p>
            <button 
              onClick={() => navigate('/security-login')}
              className="btn btn-primary btn-large"
            >
              Connexion Agent de Sécurité
            </button>
          </div>

          {/* Card Agent (simple) */}
          <div className="landing-card agent-card">
            <div className="card-icon" aria-hidden="true">👤</div>
            <h2>Agent</h2>
            <p>Espace personnel</p>
            <p className="card-description">Consulter mes pointages et demandes de congé</p>
            <button 
              onClick={() => navigate('/agent-login')}
              className="btn btn-primary btn-large"
            >
              Accéder à mon espace
            </button>
          </div>
        </div>

        <div className="landing-footer">
          <p>© 2026 Système de Pointage - ANSD</p>
        </div>
      </div>
    </div>
  );
};
