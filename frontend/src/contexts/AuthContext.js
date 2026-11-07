import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi, session, AUTH_EXPIRED_EVENT, PASSWORD_CHANGE_REQUIRED_EVENT } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => (session.getToken() ? session.getUser() : null));
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const onExpired = () => {
      setUser(null);
      setExpired(true);
    };
    const onPasswordChangeRequired = () => {
      setUser((currentUser) => currentUser ? { ...currentUser, mustChangePassword: true } : currentUser);
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    window.addEventListener(PASSWORD_CHANGE_REQUIRED_EVENT, onPasswordChangeRequired);
    return () => {
      window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
      window.removeEventListener(PASSWORD_CHANGE_REQUIRED_EVENT, onPasswordChangeRequired);
    };
  }, []);

  const login = useCallback(async (identifier, password) => {
    const data = await authApi.login(identifier.trim(), password);
    session.save(data.token, data.user);
    setExpired(false);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    const token = session.getToken();
    session.clear();
    setUser(null);
    try { await authApi.logout(token); } catch { /* le jeton est de toute façon effacé ici */ }
  }, []);

  useEffect(() => {
    if (!user) return undefined;

    let timer;
    const expireSession = () => {
      setExpired(true);
      void logout();
    };
    const resetTimer = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(expireSession, 30 * 60 * 1000);
    };
    const activityEvents = ['mousemove', 'keydown', 'click'];
    activityEvents.forEach((event) => window.addEventListener(event, resetTimer));
    window.addEventListener('scroll', resetTimer, true);
    resetTimer();

    return () => {
      window.clearTimeout(timer);
      activityEvents.forEach((event) => window.removeEventListener(event, resetTimer));
      window.removeEventListener('scroll', resetTimer, true);
    };
  }, [user, logout]);

  const changePassword = useCallback(async (newPassword, confirmPassword) => {
    const data = await authApi.changePassword(newPassword, confirmPassword);
    const updatedUser = data.user;
    session.save(session.getToken(), updatedUser);
    setUser(updatedUser);
    return updatedUser;
  }, []);

  const value = useMemo(() => ({ user, login, logout, changePassword, expired }), [user, login, logout, changePassword, expired]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>');
  return ctx;
};
