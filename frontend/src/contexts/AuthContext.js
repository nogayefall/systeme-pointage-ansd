import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi, session, AUTH_EXPIRED_EVENT } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => (session.getToken() ? session.getUser() : null));
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const onExpired = () => {
      setUser(null);
      setExpired(true);
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, []);

  const login = useCallback(async (identifier, password) => {
    const data = await authApi.login(identifier.trim(), password);
    session.save(data.token, data.user);
    setExpired(false);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try { await authApi.logout(); } catch { /* le jeton est de toute façon effacé ici */ }
    session.clear();
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, login, logout, expired }), [user, login, logout, expired]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>');
  return ctx;
};
