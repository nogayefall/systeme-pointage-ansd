import React, { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const Home = () => {
  const { user, loading, getUserRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      const role = getUserRole();
      
      if (role === 'SUPER_ADMIN' || role === 'RH_ADMIN') {
        navigate('/dashboard', { replace: true });
      } else if (role === 'SECURITY_AGENT') {
        navigate('/pointage', { replace: true });
      } else {
        navigate('/login', { replace: true });
      }
    }
  }, [loading, user, getUserRole, navigate]);

  if (loading) {
    return <div>Chargement...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return null;
};

export default Home;
