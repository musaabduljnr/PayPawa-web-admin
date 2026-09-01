import React from 'react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import type { PermissionKey } from '../../types/rbac';

interface PermissionGateProps {
  permission?: PermissionKey;
  anyPermission?: PermissionKey[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  permission,
  anyPermission,
  children,
  fallback = null,
}) => {
  const { hasPermission, hasAnyPermission } = useAdminAuth();

  if (permission && hasPermission(permission)) {
    return <>{children}</>;
  }

  if (anyPermission && hasAnyPermission(anyPermission)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
};
