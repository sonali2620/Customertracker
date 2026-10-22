import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AppLayout } from '../components/layout/AppLayout';

// Pages
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage';
import { DashboardPage } from '../pages/DashboardPage';
import { ComplaintsListPage } from '../pages/ComplaintsListPage';
import { ComplaintDetailPage } from '../pages/ComplaintDetailPage';
import { CreateComplaintPage } from '../pages/CreateComplaintPage';
import { EditComplaintPage } from '../pages/EditComplaintPage';
import { MyTicketsPage } from '../pages/MyTicketsPage';
import { SLAMonitoringPage } from '../pages/SLAMonitoringPage';
import { UsersPage } from '../pages/UsersPage';
import { ReportsPage } from '../pages/ReportsPage';
import { NotificationsPage } from '../pages/NotificationsPage';
import { SettingsPage } from '../pages/SettingsPage';
import { AccessDeniedPage } from '../pages/AccessDeniedPage';
import { NotFoundPage } from '../pages/NotFoundPage';

/**
 * Route protection wrapper requiring authentication
 */
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

/**
 * Role-restricted route wrapper
 */
function RoleRoute({ allowedRoles, children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/access-denied" replace />;
  }

  return children;
}

export function AppRoutes() {
  return (
    <Routes>
      {/* Public Authentication Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      {/* Protected SaaS Application Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="complaints" element={<ComplaintsListPage />} />
        <Route path="complaints/new" element={<CreateComplaintPage />} />
        <Route path="complaints/:id" element={<ComplaintDetailPage />} />
        <Route path="complaints/:id/edit" element={<EditComplaintPage />} />

        {/* Support Agent Queue */}
        <Route
          path="my-tickets"
          element={
            <RoleRoute allowedRoles={['AGENT']}>
              <MyTicketsPage />
            </RoleRoute>
          }
        />

        {/* SLA & Escalation Engine */}
        <Route
          path="sla-monitoring"
          element={
            <RoleRoute allowedRoles={['AGENT', 'MANAGER']}>
              <SLAMonitoringPage />
            </RoleRoute>
          }
        />

        {/* User Administration (Manager Only) */}
        <Route
          path="users"
          element={
            <RoleRoute allowedRoles={['MANAGER']}>
              <UsersPage />
            </RoleRoute>
          }
        />

        <Route path="analytics" element={<ReportsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="access-denied" element={<AccessDeniedPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
