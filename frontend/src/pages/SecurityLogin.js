import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Login.css';
import './SecurityLogin.css';

const IconMail = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16v16H4z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

const IconLock = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const IconEye = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const IconEyeOff = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a21.18 21.18 0 0 1 5.46-5.94" />
    <path d="M1 1l22 22" />
    <path d="M9.53 9.53a3.5 3.5 0 0 0 4.94 4.94" />
    <path d="M14.12 14.12A3.5 3.5 0 0 1 9.88 9.88" />
    <path d="M12 5a7 7 0 0 1 7 7" />
  </svg>
);

export const SecurityLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

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

  const togglePassword = () => setShowPassword((prev) => !prev);

  return (
    <div className="login-container">
      <button className="btn-back-login" onClick={handleBack} title="Retour">
        ← Retour
      </button>

      <div className="login-card">
        <img src="/images/ansd-logo.png" alt="ANSD Logo" className="login-logo" />
        <div className="login-header">
          <h1>Système de Pointage</h1>
          <p className="subtitle-success">Connexion Agent de Sécurité</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="alert alert-error">{error}</div>}

          <div className="input-group">
            <label htmlFor="email">Email</label>
            <span className="input-icon"><IconMail /></span>
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

          <div className="input-group">
            <label htmlFor="password">Mot de passe</label>
            <span className="input-icon"><IconLock /></span>
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Votre mot de passe"
              required
              disabled={loading}
              autoComplete="current-password"
            />
            <button
              type="button"
              className="password-toggle"
              onClick={togglePassword}
              aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            >
              {showPassword ? <IconEyeOff /> : <IconEye />}
            </button>
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
