import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { AuthProvider, useAuth } from './AuthContext';
import { authApi, session } from '../services/api';

jest.mock('../services/api', () => ({
  authApi: {
    login: jest.fn(),
    logout: jest.fn(),
    changePassword: jest.fn(),
  },
  session: {
    getToken: jest.fn(),
    getUser: jest.fn(),
    save: jest.fn(),
    clear: jest.fn(),
  },
  AUTH_EXPIRED_EVENT: 'ansd:auth-expired',
  PASSWORD_CHANGE_REQUIRED_EVENT: 'ansd:password-change-required',
}));

function SessionState() {
  const { user, expired } = useAuth();
  return <span>{user ? 'connected' : expired ? 'expired' : 'signed out'}</span>;
}

describe('AuthProvider idle session', () => {
  let container;
  let root;

  beforeEach(() => {
    jest.useFakeTimers();
    session.getToken.mockReturnValue('test-token');
    session.getUser.mockReturnValue({ id: 1, role: 'Agent' });
    authApi.logout.mockResolvedValue({});
    container = document.createElement('div');
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('resets the 30-minute timer on activity and logs out when idle', async () => {
    await act(async () => {
      root.render(<AuthProvider><SessionState /></AuthProvider>);
    });

    act(() => jest.advanceTimersByTime(29 * 60 * 1000));
    window.dispatchEvent(new Event('mousemove'));
    act(() => jest.advanceTimersByTime(29 * 60 * 1000));
    expect(authApi.logout).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(60 * 1000);
    });

    expect(authApi.logout).toHaveBeenCalledWith('test-token');
    expect(session.clear).toHaveBeenCalled();
    expect(container.textContent).toBe('expired');
  });
});
