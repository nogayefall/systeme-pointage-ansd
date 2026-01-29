import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const PrivateRoute = ({ children, requireRole = null, requireRoles = null }) => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <p>Chargement...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  // Check single role (backward compatibility)
  if (requireRole && !user?.roles?.includes(requireRole)) {
    return <Navigate to="/" />;
  }

  // Check multiple roles
  if (requireRoles && !requireRoles.some(role => user?.roles?.includes(role))) {
    return <Navigate to="/" />;
  }

  return children;
};
