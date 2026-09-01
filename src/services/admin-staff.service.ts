import { supabase } from './supabase';
import type { StaffRole, StaffStatus, PermissionKey } from '../types/rbac';

export interface StaffListItem {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone?: string;
  role_id: string;
  role: StaffRole;
  role_display_name: string;
  status: StaffStatus;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
  permissions: PermissionKey[];
  total_actions_count: number;
}

export interface PermissionItem {
  id: string;
  key: PermissionKey;
  module: string;
  description: string;
}

export interface RoleWithPermissions {
  id: string;
  name: StaffRole;
  display_name: string;
  description: string;
  member_count: number;
  permission_keys: PermissionKey[];
}

export interface GovernanceApprovalItem {
  id: string;
  request_type: string;
  target_type: string;
  target_id: string;
  requested_by_user_id: string;
  requested_by_name?: string;
  requested_by_email?: string;
  payload: Record<string, any>;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXECUTED' | 'CANCELLED';
  approved_by_user_id?: string;
  approved_by_name?: string;
  decision_notes?: string;
  created_at: string;
  decided_at?: string;
}

export interface StaffActivityItem {
  id: string;
  action: string;
  target_type: string;
  target_id?: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface ListStaffFilter {
  search?: string;
  role?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export interface CreateStaffPayload {
  name: string;
  email: string;
  roleId: string;
  initialStatus?: StaffStatus;
}

export class AdminStaffService {
  /**
   * List staff directory with server-side filtering, search, and pagination
   */
  static async listStaff(filters: ListStaffFilter = {}): Promise<{
    success: boolean;
    data: StaffListItem[];
    total: number;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase.rpc('admin_list_staff', {
        p_search: filters.search || null,
        p_role: filters.role === 'ALL' ? null : filters.role || null,
        p_status: filters.status === 'ALL' ? null : filters.status || null,
        p_limit: filters.limit || 20,
        p_offset: filters.offset || 0,
      });

      if (error) {
        console.error('Error in admin_list_staff:', error);
        return { success: false, data: [], total: 0, error: error.message };
      }

      const result = data as { total: number; data: StaffListItem[] };
      return {
        success: true,
        data: result.data || [],
        total: result.total || 0,
      };
    } catch (err: any) {
      console.error('Unexpected error in listStaff:', err);
      return { success: false, data: [], total: 0, error: err.message };
    }
  }

  /**
   * Create or invite a new staff member (Super Admin)
   */
  static async createStaff(payload: CreateStaffPayload): Promise<{
    success: boolean;
    staff_id?: string;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase.rpc('admin_create_staff', {
        p_name: payload.name,
        p_email: payload.email,
        p_role_id: payload.roleId,
        p_initial_status: payload.initialStatus || 'ACTIVE',
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return data as { success: boolean; staff_id?: string; error?: string };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Update staff status (ACTIVE, SUSPENDED, DISABLED) with self-modification protection
   */
  static async updateStaffStatus(
    staffId: string,
    status: StaffStatus,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('admin_update_staff_status', {
        p_staff_id: staffId,
        p_status: status,
        p_reason: reason || null,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return data as { success: boolean; error?: string };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Update staff role with self-escalation protection and dual-control check
   */
  static async updateStaffRole(
    staffId: string,
    newRoleId: string,
    reason?: string
  ): Promise<{
    success: boolean;
    requires_dual_control?: boolean;
    approval_id?: string;
    message?: string;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase.rpc('admin_update_staff_role', {
        p_staff_id: staffId,
        p_new_role_id: newRoleId,
        p_reason: reason || null,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return data as {
        success: boolean;
        requires_dual_control?: boolean;
        approval_id?: string;
        message?: string;
        error?: string;
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Retrieve all roles and modular permissions
   */
  static async listRolesAndPermissions(): Promise<{
    success: boolean;
    roles: RoleWithPermissions[];
    permissions: PermissionItem[];
    error?: string;
  }> {
    try {
      const { data, error } = await supabase.rpc('admin_list_roles_and_permissions');

      if (error) {
        return { success: false, roles: [], permissions: [], error: error.message };
      }

      const res = data as { roles: RoleWithPermissions[]; permissions: PermissionItem[] };
      return {
        success: true,
        roles: res.roles || [],
        permissions: res.permissions || [],
      };
    } catch (err: any) {
      return { success: false, roles: [], permissions: [], error: err.message };
    }
  }

  /**
   * Update permission mapping for a specific role
   */
  static async updateRolePermissions(
    roleId: string,
    permissionKeys: string[]
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('admin_update_role_permissions', {
        p_role_id: roleId,
        p_permission_keys: permissionKeys,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return data as { success: boolean; error?: string };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Retrieve pending governance approval requests (Dual Control queue)
   */
  static async listGovernanceApprovals(): Promise<{
    success: boolean;
    data: GovernanceApprovalItem[];
    error?: string;
  }> {
    try {
      const { data, error } = await supabase
        .from('pending_governance_approvals')
        .select(`
          id,
          request_type,
          target_type,
          target_id,
          requested_by_user_id,
          payload,
          status,
          approved_by_user_id,
          decision_notes,
          created_at,
          decided_at,
          profiles:requested_by_user_id (
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        return { success: false, data: [], error: error.message };
      }

      const mapped: GovernanceApprovalItem[] = (data || []).map((item: any) => ({
        id: item.id,
        request_type: item.request_type,
        target_type: item.target_type,
        target_id: item.target_id,
        requested_by_user_id: item.requested_by_user_id,
        requested_by_name: item.profiles?.full_name || 'Administrator',
        requested_by_email: item.profiles?.email || '',
        payload: item.payload || {},
        status: item.status,
        approved_by_user_id: item.approved_by_user_id,
        decision_notes: item.decision_notes,
        created_at: item.created_at,
        decided_at: item.decided_at,
      }));

      return { success: true, data: mapped };
    } catch (err: any) {
      return { success: false, data: [], error: err.message };
    }
  }

  /**
   * Decide governance action with four-eyes verification
   */
  static async decideGovernanceAction(
    approvalId: string,
    decision: 'APPROVE' | 'REJECT',
    notes?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('admin_decide_governance_action', {
        p_approval_id: approvalId,
        p_decision: decision,
        p_notes: notes || null,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return data as { success: boolean; error?: string };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Retrieve sanitized staff activity audit log stream
   */
  static async getStaffActivity(
    staffId: string,
    limit: number = 20
  ): Promise<{ success: boolean; activity: StaffActivityItem[]; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('admin_get_staff_activity', {
        p_staff_id: staffId,
        p_limit: limit,
      });

      if (error) {
        return { success: false, activity: [], error: error.message };
      }

      const res = data as { success: boolean; activity: StaffActivityItem[]; error?: string };
      return { success: true, activity: res.activity || [] };
    } catch (err: any) {
      return { success: false, activity: [], error: err.message };
    }
  }
}
