export type StaffRole =
  | 'SUPER_ADMIN'
  | 'OPERATIONS_MANAGER'
  | 'OPERATIONS_AGENT'
  | 'FINANCE_MANAGER'
  | 'FINANCE_AGENT'
  | 'CUSTOMER_SUPPORT'
  | 'ANALYST';

export type StaffStatus = 'ACTIVE' | 'SUSPENDED' | 'DISABLED';

export type PermissionKey =
  | 'users.view'
  | 'users.manage'
  | 'meters.view'
  | 'meters.manage'
  | 'transactions.view'
  | 'transactions.reconcile'
  | 'transactions.retry'
  | 'payments.view'
  | 'payments.reconcile'
  | 'wallets.view'
  | 'wallets.adjust'
  | 'support.view'
  | 'support.manage'
  | 'reports.view'
  | 'reports.export'
  | 'staff.view'
  | 'staff.manage'
  | 'audit_logs.view'
  | 'integrations.view'
  | 'integrations.manage'
  | 'settings.view'
  | 'settings.manage'
  | 'ai.view'
  | 'ai.manage';

export interface StaffProfile {
  isStaff: boolean;
  staffId?: string;
  userId: string;
  email: string;
  fullName?: string;
  role: StaffRole;
  roleDisplayName: string;
  status: StaffStatus;
  permissions: PermissionKey[];
  lastLoginAt?: string;
}

export interface AuditLogItem {
  id: string;
  staffId?: string;
  actorUserId?: string;
  actorName?: string;
  actorEmail?: string;
  action: string;
  targetType: string;
  targetId?: string;
  metadata: Record<string, any>;
  ipAddress?: string;
  createdAt: string;
}
