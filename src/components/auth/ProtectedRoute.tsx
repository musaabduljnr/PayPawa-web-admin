import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';
import type { PermissionKey } from '../../types/rbac';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: PermissionKey;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredPermission }) => {
  const { isAuthenticated, isStaff, staffProfile, isLoading, hasPermission } = useAdminAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0B0F17' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid #1E293B', borderTopColor: '#84CC16', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px auto' }} />
          <p style={{ color: '#94A3B8', fontSize: '13px', fontWeight: '500' }}>Authenticating staff session...</p>
        </div>
      </div>
    );
  }

  // 1. Unauthenticated -> Redirect to Admin Login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Customer or non-staff account -> Redirect to Unauthorized
  if (!isStaff) {
    return <Navigate to="/unauthorized" state={{ reason: 'NOT_STAFF' }} replace />;
  }

  // 3. Suspended / Disabled Staff -> Redirect to Unauthorized
  if (staffProfile?.status !== 'ACTIVE') {
    return <Navigate to="/unauthorized" state={{ reason: staffProfile?.status }} replace />;
  }

  // 4. Permission Check
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/unauthorized" state={{ reason: 'PERMISSION_DENIED', permission: requiredPermission }} replace />;
  }

  return <>{children}</>;
};
