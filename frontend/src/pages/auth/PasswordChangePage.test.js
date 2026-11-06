import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import PasswordChangePage from './PasswordChangePage';

jest.mock('react-router-dom', () => ({
  Navigate: () => null,
  useNavigate: () => jest.fn(),
}));
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { role: 'Agent', mustChangePassword: true },
    changePassword: jest.fn(),
  }),
}));
jest.mock('../../services/api', () => ({
  errorMessage: jest.fn(),
}));

describe('PasswordChangePage', () => {
  it('renders the new password and confirmation fields before access', () => {
    const markup = renderToStaticMarkup(
      <PasswordChangePage />
    );

    expect(markup).toContain('id="new-password"');
    expect(markup).toContain('id="confirm-password"');
    expect(markup).toContain('Enregistrer le nouveau mot de passe');
  });
});
