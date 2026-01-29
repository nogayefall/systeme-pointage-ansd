import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { PrivateRoute } from './components/PrivateRoute';
import { Login } from './pages/Login';
import { SecurityLogin } from './pages/SecurityLogin';
import { LandingPage } from './pages/LandingPage';
import { Home } from './pages/Home';
import { Dashboard } from './pages/Dashboard';
import { PointageInterface } from './pages/PointageInterface';
import './App.css';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/security-login" element={<SecurityLogin />} />
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

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;

