import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AdminAuthProvider } from './context/AdminAuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AdminLayout } from './components/layout/AdminLayout';

// Pages
import { Login } from './pages/Login';
import { Unauthorized } from './pages/Unauthorized';
import { Dashboard } from './pages/Dashboard';
import { Customers } from './pages/Customers';
import { Meters } from './pages/Meters';
import { Transactions } from './pages/Transactions';
import { Payments } from './pages/Payments';
import { Wallets } from './pages/Wallets';
import { Support } from './pages/Support';
import { Reports } from './pages/Reports';

// Operations Pages
import { Staff } from './pages/operations/Staff';
import { AuditLogs } from './pages/operations/AuditLogs';
import { Integrations } from './pages/operations/Integrations';
import { Settings } from './pages/operations/Settings';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AdminAuthProvider>
        <Routes>
          {/* Public Authentication Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Protected Administrative Shell */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            {/* Dashboard Overview */}
            <Route index element={<Dashboard />} />

            {/* Core Domain Operations */}
            <Route
              path="customers"
              element={
                <ProtectedRoute requiredPermission="users.view">
                  <Customers />
                </ProtectedRoute>
              }
            />
            <Route
              path="meters"
              element={
                <ProtectedRoute requiredPermission="meters.view">
                  <Meters />
                </ProtectedRoute>
              }
            />
            <Route
              path="transactions"
              element={
                <ProtectedRoute requiredPermission="transactions.view">
                  <Transactions />
                </ProtectedRoute>
              }
            />
            <Route
              path="payments"
              element={
                <ProtectedRoute requiredPermission="payments.view">
                  <Payments />
                </ProtectedRoute>
              }
            />
            <Route
              path="wallets"
              element={
                <ProtectedRoute requiredPermission="wallets.view">
                  <Wallets />
                </ProtectedRoute>
              }
            />
            <Route
              path="support"
              element={
                <ProtectedRoute requiredPermission="support.view">
                  <Support />
                </ProtectedRoute>
              }
            />
            <Route
              path="reports"
              element={
                <ProtectedRoute requiredPermission="reports.view">
                  <Reports />
                </ProtectedRoute>
              }
            />

            {/* Platform Operations */}
            <Route
              path="operations/staff"
              element={
                <ProtectedRoute requiredPermission="staff.view">
                  <Staff />
                </ProtectedRoute>
              }
            />
            <Route
              path="operations/audit-logs"
              element={
                <ProtectedRoute requiredPermission="audit_logs.view">
                  <AuditLogs />
                </ProtectedRoute>
              }
            />
            <Route
              path="operations/integrations"
              element={
                <ProtectedRoute requiredPermission="integrations.view">
                  <Integrations />
                </ProtectedRoute>
              }
            />
            <Route
              path="operations/settings"
              element={
                <ProtectedRoute requiredPermission="settings.view">
                  <Settings />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AdminAuthProvider>
    </BrowserRouter>
  );
};
export default App;
