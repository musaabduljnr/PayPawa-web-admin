import { supabase } from './supabase';
import type { StaffProfile, PermissionKey, StaffRole, StaffStatus } from '../types/rbac';

export class AdminAuthService {
  /**
   * Signs in staff member with credentials
   */
  static async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      return {
        success: false,
        error: error?.message || 'Invalid staff credentials',
      };
    }

    // Verify staff membership & retrieve RBAC context immediately
    const staffContext = await this.getStaffContext(data.user.id);
    if (!staffContext.isStaff) {
      // Not a staff member - sign out immediately
      await supabase.auth.signOut();
      return {
        success: false,
        error: 'Access Denied: This account is not authorized as PayPawa operational staff.',
      };
    }

    if (staffContext.status !== 'ACTIVE') {
      await supabase.auth.signOut();
      return {
        success: false,
        error: `Access Denied: Your staff account is ${staffContext.status.toLowerCase()}. Please contact a Super Administrator.`,
      };
    }

    // Log successful staff login event
    await this.logAuditEvent({
      actorUserId: data.user.id,
      action: 'STAFF_LOGIN',
      targetType: 'STAFF_SESSION',
      targetId: data.user.id,
      metadata: { role: staffContext.role, email: data.user.email },
    }).catch(() => {});

    return {
      success: true,
      user: data.user,
      session: data.session,
      staffProfile: staffContext,
    };
  }

  /**
   * Signs out current staff user
   */
  static async signOut() {
    try {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        await this.logAuditEvent({
          actorUserId: data.user.id,
          action: 'STAFF_LOGOUT',
          targetType: 'STAFF_SESSION',
          targetId: data.user.id,
        }).catch(() => {});
      }
    } catch {
      // ignore
    }
    return supabase.auth.signOut();
  }

  /**
   * Retrieves active session
   */
  static async getSession() {
    const { data } = await supabase.auth.getSession();
    return data.session;
  }

  /**
   * Subscribes to auth state changes
   */
  static onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }

  /**
   * Authoritative server-side staff context query.
   * Retrieves staff record, role, and granted permissions via PostgreSQL RPC.
   */
  static async getStaffContext(userId: string): Promise<StaffProfile> {
    try {
      // 1. Attempt RPC call to get_staff_context
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_staff_context', {
        p_user_id: userId,
      });

      if (!rpcError && rpcData && typeof rpcData === 'object') {
        const raw = rpcData as any;
        if (raw.is_staff) {
          return {
            isStaff: true,
            staffId: raw.staff_id,
            userId: raw.user_id || userId,
            email: raw.email || '',
            fullName: raw.full_name || 'Staff Member',
            role: raw.role as StaffRole,
            roleDisplayName: raw.role_display_name || raw.role,
            status: raw.status as StaffStatus,
            permissions: (raw.permissions || []) as PermissionKey[],
            lastLoginAt: raw.last_login_at,
          };
        }
        return {
          isStaff: false,
          userId,
          email: '',
          role: 'ANALYST',
          roleDisplayName: 'Unassigned',
          status: 'DISABLED',
          permissions: [],
        };
      }
    } catch (err) {
      console.warn('[AdminAuthService] RPC get_staff_context failed, falling back to direct table join:', err);
    }

    // 2. Direct Table Query Fallback
    try {
      const { data: staffMember, error: staffErr } = await supabase
        .from('staff_members')
        .select(`
          id,
          user_id,
          status,
          last_login_at,
          roles (
            id,
            name,
            display_name,
            role_permissions (
              permissions (
                key
              )
            )
          )
        `)
        .eq('user_id', userId)
        .single();

      if (staffErr || !staffMember) {
        return {
          isStaff: false,
          userId,
          email: '',
          role: 'ANALYST',
          roleDisplayName: 'Unassigned',
          status: 'DISABLED',
          permissions: [],
        };
      }

      const roleObj = (staffMember as any).roles;
      const rawPerms = roleObj?.role_permissions || [];
      const permissions: PermissionKey[] = rawPerms
        .map((rp: any) => rp.permissions?.key)
        .filter(Boolean);

      const { data: profile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', userId)
        .single();

      return {
        isStaff: true,
        staffId: staffMember.id,
        userId: staffMember.user_id,
        email: profile?.email || '',
        fullName: profile?.full_name || 'Staff Member',
        role: roleObj?.name as StaffRole,
        roleDisplayName: roleObj?.display_name || roleObj?.name,
        status: staffMember.status as StaffStatus,
        permissions,
        lastLoginAt: staffMember.last_login_at || undefined,
      };
    } catch (fallbackErr) {
      console.error('[AdminAuthService] Staff lookup failed:', fallbackErr);
      return {
        isStaff: false,
        userId,
        email: '',
        role: 'ANALYST',
        roleDisplayName: 'Unassigned',
        status: 'DISABLED',
        permissions: [],
      };
    }
  }

  /**
   * Authoritative server-side permission check.
   */
  static async checkServerPermission(userId: string, permissionKey: PermissionKey): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('has_permission', {
        p_user_id: userId,
        p_permission_key: permissionKey,
      });

      if (!error && typeof data === 'boolean') {
        return data;
      }
    } catch (err) {
      console.warn('[AdminAuthService] has_permission RPC error:', err);
    }
    return false;
  }

  /**
   * Logs a compliance audit log entry.
   */
  static async logAuditEvent(payload: {
    actorUserId: string;
    action: string;
    targetType: string;
    targetId?: string;
    metadata?: Record<string, any>;
  }) {
    try {
      await supabase.rpc('log_audit_event', {
        p_actor_user_id: payload.actorUserId,
        p_action: payload.action,
        p_target_type: payload.targetType,
        p_target_id: payload.targetId || null,
        p_metadata: payload.metadata || {},
      });
    } catch (err) {
      console.warn('[AdminAuthService] Non-fatal audit log warning:', err);
    }
  }
}
