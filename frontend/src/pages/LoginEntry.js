import React from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { Login } from './Login';
import { SecurityLogin } from './SecurityLogin';
import { AgentLogin } from './AgentLogin';

const normalizeRole = (role) => {
  if (!role) return null;
  return role.toString().trim().toLowerCase();
};

export const LoginEntry = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const role = normalizeRole(params.get('role'));

  if (role === 'agent' || role === 'agent-login') {
    return <AgentLogin />;
  }

  if (role === 'security' || role === 'security-agent' || role === 'security-login') {
    return <SecurityLogin />;
  }

  if (role === 'admin' || role === 'administrateur' || role === 'administrateur-login') {
    return <Login />;
  }

  return <Login />;
};
