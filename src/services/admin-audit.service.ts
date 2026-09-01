import { supabase } from './supabase';

export type AuditResult = 'SUCCESS' | 'FAILED' | 'PENDING' | 'WARNING';

export interface AuditLogItem {
  id: string;
  staff_id?: string;
  actor_user_id?: string;
  actor_name: string;
  actor_email: string;
  actor_role: string;
  action: string;
  target_type: string;
  target_id?: string;
  result: AuditResult;
  correlation_id?: string;
  error_message?: string;
  metadata: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface CorrelatedEventItem {
  id: string;
  action: string;
  target_type: string;
  target_id?: string;
  result: AuditResult;
  actor_name: string;
  created_at: string;
}

export interface AuditLogDetailsResponse {
  success: boolean;
  log?: AuditLogItem;
  correlated_events: CorrelatedEventItem[];
  error?: string;
}

export interface SystemActivitySummary {
  total_24h: number;
  financial_mutations_24h: number;
  security_changes_24h: number;
  failed_events_24h: number;
  active_actors_24h: number;
}

export interface ListAuditFilter {
  search?: string;
  actorId?: string;
  action?: string;
  targetType?: string;
  result?: string;
  correlationId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export class AdminAuditService {
  /**
   * List audit logs with multi-filter search, date ranges, and pagination
   */
  static async listAuditLogs(filters: ListAuditFilter = {}): Promise<{
    success: boolean;
    data: AuditLogItem[];
    total: number;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase.rpc('admin_list_audit_logs', {
        p_search: filters.search || null,
        p_actor_id: filters.actorId || null,
        p_action: filters.action === 'ALL' ? null : filters.action || null,
        p_target_type: filters.targetType === 'ALL' ? null : filters.targetType || null,
        p_result: filters.result === 'ALL' ? null : filters.result || null,
        p_correlation_id: filters.correlationId || null,
        p_start_date: filters.startDate || null,
        p_end_date: filters.endDate || null,
        p_limit: filters.limit || 20,
        p_offset: filters.offset || 0,
      });

      if (error) {
        console.error('Error in admin_list_audit_logs:', error);
        return { success: false, data: [], total: 0, error: error.message };
      }

      const result = data as { total: number; data: AuditLogItem[] };
      return {
        success: true,
        data: result.data || [],
        total: result.total || 0,
      };
    } catch (err: any) {
      console.error('Unexpected error in listAuditLogs:', err);
      return { success: false, data: [], total: 0, error: err.message };
    }
  }

  /**
   * Retrieve full audit record details and correlated events trace chain
   */
  static async getAuditLogDetails(auditId: string): Promise<AuditLogDetailsResponse> {
    try {
      const { data, error } = await supabase.rpc('admin_get_audit_log_details', {
        p_audit_id: auditId,
      });

      if (error) {
        return { success: false, correlated_events: [], error: error.message };
      }

      return data as AuditLogDetailsResponse;
    } catch (err: any) {
      return { success: false, correlated_events: [], error: err.message };
    }
  }

  /**
   * Retrieve 24h operational KPIs and system activity breakdown
   */
  static async getSystemActivitySummary(): Promise<SystemActivitySummary> {
    try {
      const { data, error } = await supabase.rpc('admin_get_system_activity_summary');

      if (error || !data) {
        return {
          total_24h: 0,
          financial_mutations_24h: 0,
          security_changes_24h: 0,
          failed_events_24h: 0,
          active_actors_24h: 0,
        };
      }

      return data as SystemActivitySummary;
    } catch {
      return {
        total_24h: 0,
        financial_mutations_24h: 0,
        security_changes_24h: 0,
        failed_events_24h: 0,
        active_actors_24h: 0,
      };
    }
  }
}
