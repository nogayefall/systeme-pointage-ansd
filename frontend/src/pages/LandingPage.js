import React from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

export const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="landing-container">
      <div className="landing-content">
        <div className="landing-header">
          <h1>🔐 Système de Pointage</h1>
          <p>Bienvenue dans le système de gestion des pointages</p>
        </div>

        <div className="landing-cards">
          {/* Card Admin/Dashboard */}
          <div className="landing-card admin-card">
            <div className="card-icon">👨‍💼</div>
            <h2>Administrateur</h2>
            <p>Accès au tableau de bord</p>
            <p className="card-description">Gestion des utilisateurs, rôles et pointages</p>
            <button 
              onClick={() => navigate('/login')}
              className="btn btn-primary btn-large"
            >
              Connexion Admin
            </button>
          </div>

          {/* Card Security Agent */}
          <div className="landing-card security-card">
            <div className="card-icon">🔐</div>
            <h2>Agent de Sécurité</h2>
            <p>Interface de pointage</p>
            <p className="card-description">Enregistrer les pointages des agents</p>
            <button 
              onClick={() => navigate('/security-login')}
              className="btn btn-success btn-large"
            >
              Connexion Agent
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
