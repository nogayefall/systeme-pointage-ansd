import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { FeedbackProvider } from './contexts/FeedbackContext';
import AppLayout from './components/layout/AppLayout';
import { Spinner } from './components/ui';
import { homePathFor, isEmployee, isRh, isSecurity, isSuperAdmin, isSupervisor } from './utils/roles';

const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const DashboardPage = lazy(() => import('./pages/admin/DashboardPage'));
const PointagesPage = lazy(() => import('./pages/admin/PointagesPage'));
const LeavesPage = lazy(() => import('./pages/admin/LeavesPage'));
const ReportsPage = lazy(() => import('./pages/admin/ReportsPage'));
const ServicesPage = lazy(() => import('./pages/admin/ServicesPage'));
const UsersPage = lazy(() => import('./pages/admin/UsersPage'));
const RolesPage = lazy(() => import('./pages/admin/RolesPage'));
const BadgesPage = lazy(() => import('./pages/admin/BadgesPage'));
const ScanPage = lazy(() => import('./pages/security/ScanPage'));
const AgentHomePage = lazy(() => import('./pages/agent/AgentHomePage'));
const AgentPointagesPage = lazy(() => import('./pages/agent/AgentPointagesPage'));
const AgentLeavesPage = lazy(() => import('./pages/agent/AgentLeavesPage'));

/** Laisse passer uniquement les utilisateurs connectés qui satisfont `allow`. */
function Guard({ allow }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/connexion" replace state={{ from: location.pathname }} />;
  if (allow && !allow(user)) return <Navigate to={homePathFor(user)} replace />;
  return <AppLayout />;
}

function Home() {
  const { user } = useAuth();
  return <Navigate to={user ? homePathFor(user) : '/connexion'} replace />;
}

function GuardedPage({ allow, children }) {
  const { user } = useAuth();
  if (!allow(user)) return <Navigate to={homePathFor(user)} replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <FeedbackProvider>
          <Suspense fallback={<Spinner />}>
            <Routes>
              <Route path="/connexion" element={<LoginPage />} />

              <Route element={<Guard allow={isRh} />}>
                <Route path="/admin" element={<DashboardPage />} />
                <Route path="/admin/pointages" element={<PointagesPage />} />
                <Route path="/admin/conges" element={<LeavesPage />} />
                <Route path="/admin/rapports" element={<ReportsPage />} />
                <Route path="/admin/services" element={<ServicesPage />} />
                <Route path="/admin/statistiques" element={<Navigate to="/admin" replace />} />
                <Route path="/admin/utilisateurs" element={<GuardedPage allow={isSuperAdmin}><UsersPage /></GuardedPage>} />
                <Route path="/admin/roles" element={<GuardedPage allow={isSuperAdmin}><RolesPage /></GuardedPage>} />
                <Route path="/admin/badges" element={<GuardedPage allow={isSuperAdmin}><BadgesPage /></GuardedPage>} />
              </Route>

              <Route element={<Guard allow={isSupervisor} />}>
                <Route path="/equipe" element={<DashboardPage />} />
                <Route path="/equipe/pointages" element={<PointagesPage />} />
                <Route path="/equipe/rapports" element={<ReportsPage />} />
              </Route>

              <Route element={<Guard allow={isSecurity} />}>
                <Route path="/securite" element={<ScanPage />} />
              </Route>

              <Route element={<Guard allow={(u) => isEmployee(u) || (!isRh(u) && !isSecurity(u))} />}>
                <Route path="/agent" element={<AgentHomePage />} />
                <Route path="/agent/pointages" element={<AgentPointagesPage />} />
                <Route path="/agent/conges" element={<AgentLeavesPage />} />
              </Route>

              {/* Anciennes adresses : on redirige pour ne casser aucun favori. */}
              <Route path="/login" element={<Navigate to="/connexion" replace />} />
              <Route path="/security-login" element={<Navigate to="/connexion" replace />} />
              <Route path="/agent-login" element={<Navigate to="/connexion" replace />} />
              <Route path="/dashboard" element={<Navigate to="/admin" replace />} />
              <Route path="/pointage" element={<Navigate to="/securite" replace />} />
              <Route path="/" element={<Home />} />
              <Route path="/home" element={<Home />} />
              <Route path="*" element={<Home />} />
            </Routes>
          </Suspense>
        </FeedbackProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
