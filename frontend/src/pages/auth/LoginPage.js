import React, { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { errorMessage } from '../../services/api';
import { Button, Icon, Input } from '../../components/ui';
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

  if (user) return <Navigate to={user.mustChangePassword ? '/connexion/nouveau-mot-de-passe' : homePathFor(user)} replace />;

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
      if (u.mustChangePassword) {
        navigate('/connexion/nouveau-mot-de-passe', { replace: true });
        return;
      }
      const target = location.state?.from;
      navigate(target && target !== '/connexion' ? target : homePathFor(u), { replace: true });
    } catch (err) {
      setError(errorMessage(err, 'Connexion impossible.'));
      setLoading(false);
    }
  };

  return (
    <main className="login">
      <div className="login__bg" aria-hidden="true">
        <div className="login__stage">
          <span className="sq sq--1" />
          <span className="sq sq--2" />
          <span className="sq sq--3" />
          <svg viewBox="0 0 1280 800" className="login__lines">
            <ellipse cx="640" cy="430" rx="780" ry="60" fill="none" stroke="#1B3C8C"
              strokeWidth="4" opacity=".75" transform="rotate(-2 640 430)" />
            <polyline points="470,700 740,420 800,420 760,520 820,420 1010,230 1080,160"
              fill="none" stroke="#1B3C8C" strokeWidth="7"
              strokeLinejoin="round" strokeLinecap="round" />
          </svg>
        </div>
        <div className="login__veil" />
      </div>

      <section className="login__card" aria-labelledby="login-title">
        <div className="login__brand">
          <div className="login__logo">
            <img src="/images/ansd-logo.png" alt="Logo ANSD" />
          </div>
          <span className="login__org">
            Agence Nationale de la Statistique
            <br />
            et de la Démographie
          </span>
        </div>

        <header className="login__head">
          <h1 id="login-title">Connexion</h1>
          <p>Système de pointage</p>
        </header>

        <form className="login__form" onSubmit={onSubmit} noValidate>
          {expired && !error && (
            <div className="login__notice" role="status">
              <Icon name="info" size={16} />
              Votre session a expiré. Reconnectez-vous pour continuer.
            </div>
          )}
          {error && (
            <div id="login-error" className="login__error" role="alert">
              <Icon name="alert" size={16} /> {error}
            </div>
          )}

          <div className="field">
            <label htmlFor="login-identifier" className="field-label">
              Matricule ou e-mail <span className="field-req" aria-hidden="true"> *</span>
            </label>
            <Input
              id="login-identifier"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete="username"
              autoFocus
              placeholder="Ex. ANSD-00123 ou adresse e-mail"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'login-error' : undefined}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="login-password" className="field-label">
              Mot de passe <span className="field-req" aria-hidden="true"> *</span>
            </label>
            <div className="login__password">
              <Input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="Mot de passe"
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? 'login-error' : undefined}
                required
              />
              <button
                type="button"
                className="login__password-toggle"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                <Icon name={showPassword ? 'eyeOff' : 'eye'} size={18} />
              </button>
            </div>
          </div>

          <p className="login__forgot">
            Mot de passe oublié ? Contactez l'administrateur RH.
          </p>

          <Button type="submit" variant="primary" loading={loading} className="login__submit">
            Se connecter
          </Button>
        </form>

        <p className="login__note">
          Session fermée automatiquement après 30 minutes d'inactivité.
        </p>
      </section>
    </main>
  );
}
