import { supabase } from './supabase';

export type ProviderStatus = 'ONLINE' | 'DEGRADED' | 'OFFLINE' | 'MAINTENANCE';

export interface ProviderHealthItem {
  id: string;
  provider_name: string;
  service_type: string;
  status: ProviderStatus;
  last_successful_at?: string;
  last_failure_at?: string;
  last_error_message?: string;
  latency_ms: number;
  error_rate_pct: number;
  metadata: Record<string, any>;
  updated_at: string;
}

export interface AiOperationsMetrics {
  provider: string;
  model: string;
  enabled: boolean;
  status: ProviderStatus;
  request_count_24h: number;
  success_rate_pct: number;
  failure_rate_pct: number;
  average_latency_ms: number;
  quota_warnings_24h: number;
  last_successful_at?: string;
  fallback_mode: string;
}

export type SettingCategory = 'GENERAL' | 'PROVIDERS' | 'AI' | 'NOTIFICATIONS' | 'SECURITY' | 'FEATURE_FLAGS';

export interface SystemSettingItem {
  id: string;
  category: SettingCategory;
  key: string;
  value: any;
  description?: string;
  is_secret: boolean;
  updated_at: string;
}

export class AdminOperationsService {
  /**
   * Fetches real health telemetry for all upstream providers
   */
  static async getIntegrationsHealth(): Promise<{
    success: boolean;
    data: ProviderHealthItem[];
    error?: string;
  }> {
    try {
      const { data, error } = await supabase.rpc('admin_get_integrations_health');
      if (error) {
        return { success: false, data: [], error: error.message };
      }
      return { success: true, data: (data as ProviderHealthItem[]) || [] };
    } catch (err: any) {
      return { success: false, data: [], error: err.message };
    }
  }

  /**
   * Triggers an authorized live health ping against a provider
   */
  static async triggerProviderHealthCheck(providerName: string): Promise<{
    success: boolean;
    status?: ProviderStatus;
    latency_ms?: number;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase.rpc('admin_trigger_provider_health_check', {
        p_provider_name: providerName,
      });
      if (error) {
        return { success: false, error: error.message };
      }
      return data as { success: boolean; status: ProviderStatus; latency_ms: number };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Updates operational status of a provider (e.g. set maintenance or degraded)
   */
  static async updateProviderStatus(
    providerName: string,
    status: ProviderStatus,
    reason?: string
  ): Promise<{
    success: boolean;
    status?: ProviderStatus;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase.rpc('admin_update_provider_status', {
        p_provider_name: providerName,
        p_status: status,
        p_reason: reason || null,
      });
      if (error) {
        return { success: false, error: error.message };
      }
      return data as { success: boolean; status: ProviderStatus };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Retrieves AI engine performance metrics & configuration
   */
  static async getAiOperationsMetrics(): Promise<AiOperationsMetrics | null> {
    try {
      const { data, error } = await supabase.rpc('admin_get_ai_operations_metrics');
      if (error || !data) {
        return null;
      }
      return data as AiOperationsMetrics;
    } catch {
      return null;
    }
  }

  /**
   * Retrieves system settings filtered by category
   */
  static async getSystemSettings(category?: SettingCategory | 'ALL'): Promise<{
    success: boolean;
    data: SystemSettingItem[];
    error?: string;
  }> {
    try {
      const { data, error } = await supabase.rpc('admin_get_system_settings', {
        p_category: category === 'ALL' ? null : category || null,
      });
      if (error) {
        return { success: false, data: [], error: error.message };
      }
      return { success: true, data: (data as SystemSettingItem[]) || [] };
    } catch (err: any) {
      return { success: false, data: [], error: err.message };
    }
  }

  /**
   * Updates a batch of key-value system settings with operational audit
   */
  static async updateSystemSettings(
    settingsBatch: Record<string, any>,
    reason?: string
  ): Promise<{
    success: boolean;
    updated_count?: number;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase.rpc('admin_update_system_settings', {
        p_settings_batch: settingsBatch,
        p_reason: reason || null,
      });
      if (error) {
        return { success: false, error: error.message };
      }
      return data as { success: boolean; updated_count: number };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}
