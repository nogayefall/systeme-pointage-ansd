import React, { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { errorMessage } from '../../services/api';
import { Button, Field, Icon, Input } from '../../components/ui';
import { homePathFor } from '../../utils/roles';
import './login.css';

export default function LoginPage() {
  const { user, login, expired } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to={homePathFor(user)} replace />;

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError('Renseignez votre identifiant et votre mot de passe.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const u = await login(identifier, password);
      const target = location.state?.from;
      navigate(target && target !== '/connexion' ? target : homePathFor(u), { replace: true });
    } catch (err) {
      setError(errorMessage(err, 'Connexion impossible.'));
      setLoading(false);
    }
  };

  return (
    <div className="login">
      <aside className="login-brand" aria-hidden="false">
        <div className="login-squares" aria-hidden="true">
          <span /><span /><span />
        </div>
        <div className="login-brand-inner">
          <span className="login-logo"><img src="/images/ansd-logo.png" alt="Agence Nationale de la Statistique et de la Démographie" /></span>
          <h1>Le pointage des agents, simple et fiable.</h1>
          <p>Suivi des présences, des retards et des congés de l'Agence Nationale de la Statistique et de la Démographie.</p>
        </div>
        <small>© ANSD · Système de pointage</small>
      </aside>

      <main className="login-form-side">
        <form className="login-card" onSubmit={onSubmit} noValidate>
          <div>
            <h2>Connexion</h2>
            <p className="muted">Utilisez votre matricule ou votre adresse e-mail professionnelle.</p>
          </div>

          {expired && !error && (
            <div className="login-notice" role="status">
              <Icon name="info" size={16} /> Votre session a expiré. Reconnectez-vous pour continuer.
            </div>
          )}
          {error && (
            <div className="login-error" role="alert">
              <Icon name="alert" size={16} /> {error}
            </div>
          )}

          <Field label="Matricule ou e-mail" required>
            <Input
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete="username"
              autoFocus
              placeholder="ex. 100123 ou prenom.nom@ansd.sn"
            />
          </Field>

          <Field label="Mot de passe" required>
            <div className="password-wrap">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                <Icon name={showPassword ? 'eyeOff' : 'eye'} size={18} />
              </button>
            </div>
          </Field>

          <Button type="submit" variant="primary" loading={loading} className="login-submit">Se connecter</Button>
          <p className="login-help muted">Mot de passe oublié ? Contactez l'administrateur RH.</p>
        </form>
      </main>
    </div>
  );
}
