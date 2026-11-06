import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { errorMessage } from '../../services/api';
import { Button, Input } from '../../components/ui';
import { homePathFor } from '../../utils/roles';
import './login.css';

export default function PasswordChangePage() {
  const { user, changePassword } = useAuth();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!user) return <Navigate to="/connexion" replace />;
  if (!user.mustChangePassword) return <Navigate to={homePathFor(user)} replace />;

  const onSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (newPassword.length < 8) {
      setError('Le nouveau mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    try {
      const updatedUser = await changePassword(newPassword, confirmPassword);
      navigate(homePathFor(updatedUser), { replace: true });
    } catch (requestError) {
      setError(errorMessage(requestError, 'Impossible de modifier le mot de passe.'));
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
        </div>
        <div className="login__veil" />
      </div>
      <section className="login__card" aria-labelledby="password-change-title">
        <header className="login__head">
          <h1 id="password-change-title">Créez votre mot de passe</h1>
          <p>Pour sécuriser votre compte, choisissez un nouveau mot de passe avant de continuer.</p>
        </header>
        <form className="login__form" onSubmit={onSubmit} noValidate>
          {error && <div className="login__error" role="alert">{error}</div>}
          <div className="field">
            <label htmlFor="new-password" className="field-label">Nouveau mot de passe</label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="confirm-password" className="field-label">Confirmer le nouveau mot de passe</label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
          <p className="login__note">Le mot de passe doit contenir au moins 8 caractères.</p>
          <Button type="submit" variant="primary" loading={loading} className="login__submit">
            Enregistrer le nouveau mot de passe
          </Button>
        </form>
      </section>
    </main>
  );
}
