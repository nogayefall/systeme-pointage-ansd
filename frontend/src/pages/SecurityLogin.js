import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './SecurityLogin.css';

export const SecurityLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login(email, password);
      
      // Vérifier que l'utilisateur est un agent de sécurité
      if (!user.roles.includes('ROLE_SECURITY_AGENT')) {
        setError('Accès refusé. Vous n\'êtes pas autorisé à utiliser cette interface.');
        setLoading(false);
        return;
      }

      navigate('/pointage');
    } catch (err) {
      setError('Email ou mot de passe incorrect');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/');
  };

  return (
    <div className="login-container">
      <button className="btn-back-login" onClick={handleBack} title="Retour">
        ← Retour
      </button>

      <div className="login-card">
        <img src="/images/ansd-logo.png" alt="ANSD Logo" className="login-logo" />
        <div className="login-header">
          <h1>Système de Pointage</h1>
          <p>Connexion Agent de Sécurité</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="alert alert-error">{error}</div>}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="agent@exemple.com"
              required
              disabled={loading}
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Mot de passe</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Votre mot de passe"
              required
              disabled={loading}
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={loading}
          >
            {loading ? 'Connexion en cours...' : 'Se connecter'}
          </button>
        </form>

        <div className="login-footer">
          <p>© 2026 Système de Pointage</p>
        </div>
      </div>
    </div>
  );
};
