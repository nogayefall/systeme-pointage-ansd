import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Login.css';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      
      // Vérifier que l'utilisateur est Admin (Super Admin ou RH Admin)
      // Ou qu'il a des permissions (view_pointages, view_reports, etc)
      const isAdmin = user.roles?.includes('ROLE_SUPER_ADMIN') || user.roles?.includes('ROLE_RH_ADMIN');
      const hasPermissions = user.permissions && user.permissions.length > 0;
      
      if (!isAdmin && !hasPermissions) {
        setError('Accès refusé. Cette interface est réservée aux administrateurs.');
        setLoading(false);
        return;
      }

      navigate('/dashboard');
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
          <p>Connexion Administrateur</p>
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
              placeholder="admin@exemple.com"
              required
              disabled={loading}
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
