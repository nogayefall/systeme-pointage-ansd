import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { PrivateRoute } from './components/PrivateRoute';
import { LoginEntry } from './pages/LoginEntry';
import { Login } from './pages/Login';
import { SecurityLogin } from './pages/SecurityLogin';
import { AgentLogin } from './pages/AgentLogin';
import HomePage from './pages/HomePage';
import { Home } from './pages/Home';
import { Dashboard } from './pages/Dashboard';
import { PointageInterface } from './pages/PointageInterface';
import { AgentDashboard } from './pages/AgentDashboard';
import { MyPointages } from './pages/MyPointages';
import { MyLeaves } from './pages/MyLeaves';
import { LeaveManagement } from './pages/LeaveManagement';
import './App.css';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginEntry />} />
          <Route path="/security-login" element={<SecurityLogin />} />
          <Route path="/agent-login" element={<AgentLogin />} />
          <Route path="/home" element={<Home />} />
          
          <Route
            path="/dashboard"
            element={
              <PrivateRoute requireRoles={["ROLE_SUPER_ADMIN", "ROLE_RH_ADMIN"]}>
                <Dashboard />
              </PrivateRoute>
            }
          />

          <Route
            path="/pointage"
            element={
              <PrivateRoute requireRole="ROLE_SECURITY_AGENT">
                <PointageInterface />
              </PrivateRoute>
            }
          />

          <Route
            path="/agent/dashboard"
            element={
              <PrivateRoute requireRole="ROLE_AGENT">
                <AgentDashboard />
              </PrivateRoute>
            }
          />

          <Route
            path="/agent/pointages"
            element={
              <PrivateRoute requireRole="ROLE_AGENT">
                <MyPointages />
              </PrivateRoute>
            }
          />

          <Route
            path="/agent/conges"
            element={
              <PrivateRoute requireRole="ROLE_AGENT">
                <MyLeaves />
              </PrivateRoute>
            }
          />

          <Route
            path="/rh/leaves"
            element={
              <PrivateRoute requireRole="ROLE_RH_ADMIN">
                <LeaveManagement />
              </PrivateRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;

