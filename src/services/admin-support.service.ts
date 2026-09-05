import { supabase } from './supabase';

export type CaseStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING' | 'RESOLVED' | 'CLOSED';
export type CasePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type CaseCategory =
  | 'WALLET'
  | 'PAYMENT'
  | 'ELECTRICITY_PURCHASE'
  | 'METER'
  | 'ACCOUNT'
  | 'TECHNICAL'
  | 'OTHER';
export type EscalationDepartment = 'OPERATIONS' | 'FINANCE' | 'MANAGER' | 'NONE';

export interface SupportCaseListItem {
  id: string;
  case_number: string;
  customer_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  category: CaseCategory;
  priority: CasePriority;
  status: CaseStatus;
  assigned_staff_id?: string;
  assigned_staff_name?: string;
  assigned_staff_email?: string;
  assigned_staff_role?: string;
  escalated_to_department?: EscalationDepartment;
  subject: string;
  description: string;
  related_meter_id?: string;
  related_wallet_tx_id?: string;
  related_electricity_tx_id?: string;
  internal_reference?: string;
  provider_reference?: string;
  resolution_notes?: string;
  resolved_at?: string;
  closed_at?: string;
  reopened_at?: string;
  created_at: string;
  updated_at: string;
  notes_count: number;
  internal_notes_count: number;
}

export interface CustomerContextProfile {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  account_type?: string;
  is_onboarded?: boolean;
  created_at: string;
}

export interface CustomerContextMeter {
  id: string;
  meter_number: string;
  disco_code: string;
  disco_name: string;
  meter_type: string;
  customer_name?: string;
  address?: string;
  is_primary?: boolean;
  created_at: string;
}

export interface CustomerContextTransaction {
  id: string;
  meter_number: string;
  disco_code: string;
  disco_name: string;
  amount_kobo: number;
  units_kwh: number;
  token?: string;
  status: string;
  reference: string;
  created_at: string;
}

export interface CustomerContextWalletEntry {
  id: string;
  type: string;
  amount_kobo: number;
  balance_after_kobo: number;
  reference: string;
  description?: string;
  created_at: string;
}

export interface CustomerContextWallet {
  wallet_id: string;
  balance_kobo: number;
  currency: string;
  is_locked: boolean;
  recent_entries: CustomerContextWalletEntry[];
}

export interface CustomerContextPayment {
  id: string;
  amount_kobo: number;
  provider: string;
  status: string;
  reference: string;
  created_at: string;
  verified_at?: string;
}

export interface SupportCaseNoteItem {
  id: string;
  case_id: string;
  author_user_id: string;
  author_name?: string;
  author_email?: string;
  author_role?: string;
  is_internal: boolean;
  note: string;
  created_at: string;
}

export interface SupportCaseDetailsResponse {
  success: boolean;
  error?: string;
  case: SupportCaseListItem;
  customer: CustomerContextProfile;
  meters: CustomerContextMeter[];
  transactions: CustomerContextTransaction[];
  wallet: CustomerContextWallet;
  payments: CustomerContextPayment[];
  notes: SupportCaseNoteItem[];
}

export interface ListCasesFilter {
  search?: string;
  status?: string;
  priority?: string;
  category?: string;
  assignedTo?: string;
  escalatedDept?: string;
  limit?: number;
  offset?: number;
}

export interface CreateCasePayload {
  customerId: string;
  category: CaseCategory;
  priority: CasePriority;
  subject: string;
  description: string;
  assignedStaffId?: string;
}

export interface StaffOption {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  role_display_name: string;
  status: string;
}

export class AdminSupportService {
  /**
   * List support cases with server-side filtering, search, and pagination
   */
  static async listCases(filters: ListCasesFilter = {}): Promise<{
    success: boolean;
    data: SupportCaseListItem[];
    total: number;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase.rpc('admin_list_support_cases', {
        p_search: filters.search || null,
        p_status: filters.status === 'ALL' ? null : filters.status || null,
        p_priority: filters.priority === 'ALL' ? null : filters.priority || null,
        p_category: filters.category === 'ALL' ? null : filters.category || null,
        p_assigned_to: filters.assignedTo || null,
        p_escalated_dept: filters.escalatedDept === 'ALL' ? null : filters.escalatedDept || null,
        p_limit: filters.limit || 20,
        p_offset: filters.offset || 0,
      });

      if (error) {
        console.error('Error fetching support cases:', error);
        return { success: false, data: [], total: 0, error: error.message };
      }

      const result = data as { total: number; data: SupportCaseListItem[] };
      return {
        success: true,
        data: result.data || [],
        total: result.total || 0,
      };
    } catch (err: any) {
      console.error('Unexpected error in listCases:', err);
      return { success: false, data: [], total: 0, error: err.message };
    }
  }

  /**
   * Fetch complete case details with linked non-duplicated customer context
   */
  static async getCaseDetails(caseId: string): Promise<SupportCaseDetailsResponse> {
    try {
      const { data, error } = await supabase.rpc('admin_get_support_case_details', {
        p_case_id: caseId,
      });

      if (error) {
        return {
          success: false,
          error: error.message,
          case: {} as any,
          customer: {} as any,
          meters: [],
          transactions: [],
          wallet: { wallet_id: '', balance_kobo: 0, currency: 'NGN', is_locked: false, recent_entries: [] },
          payments: [],
          notes: [],
        };
      }

      return data as SupportCaseDetailsResponse;
    } catch (err: any) {
      return {
        success: false,
        error: err.message,
        case: {} as any,
        customer: {} as any,
        meters: [],
        transactions: [],
        wallet: { wallet_id: '', balance_kobo: 0, currency: 'NGN', is_locked: false, recent_entries: [] },
        payments: [],
        notes: [],
      };
    }
  }

  /**
   * Create a new support case with audit trail
   */
  static async createCase(payload: CreateCasePayload): Promise<{
    success: boolean;
    case_id?: string;
    case_number?: string;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase.rpc('admin_create_support_case', {
        p_customer_id: payload.customerId,
        p_category: payload.category,
        p_priority: payload.priority,
        p_subject: payload.subject,
        p_description: payload.description,
        p_assigned_staff_id: payload.assignedStaffId || null,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return data as { success: boolean; case_id?: string; case_number?: string; error?: string };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Update support case status
   */
  static async updateStatus(
    caseId: string,
    status: CaseStatus,
    resolutionNotes?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('admin_update_support_case_status', {
        p_case_id: caseId,
        p_status: status,
        p_resolution_notes: resolutionNotes || null,
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
   * Assign or reassign case to staff member
   */
  static async assignCase(
    caseId: string,
    staffId: string | null,
    assignmentNote?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('admin_assign_support_case', {
        p_case_id: caseId,
        p_staff_id: staffId,
        p_assignment_note: assignmentNote || null,
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
   * Tiered Escalation of support case (Support -> Operations, Finance, Manager)
   */
  static async escalateCase(
    caseId: string,
    escalateTo: 'OPERATIONS' | 'FINANCE' | 'MANAGER',
    escalationReason: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('admin_escalate_support_case', {
        p_case_id: caseId,
        p_escalate_to: escalateTo,
        p_escalation_reason: escalationReason,
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
   * Post internal or customer-visible note to case
   */
  static async addNote(
    caseId: string,
    note: string,
    isInternal: boolean = true
  ): Promise<{ success: boolean; note_id?: string; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('admin_add_support_case_note', {
        p_case_id: caseId,
        p_note: note,
        p_is_internal: isInternal,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return data as { success: boolean; note_id?: string; error?: string };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Fetch active staff members for assignment dropdown
   */
  static async listActiveStaff(): Promise<StaffOption[]> {
    try {
      const { data, error } = await supabase
        .from('staff_members')
        .select(`
          id,
          user_id,
          status,
          roles (
            name,
            display_name
          ),
          profiles:user_id (
            full_name,
            email
          )
        `)
        .eq('status', 'ACTIVE');

      if (error || !data) {
        return [];
      }

      return data.map((item: any) => ({
        id: item.id,
        user_id: item.user_id,
        full_name: item.profiles?.full_name || 'Staff Member',
        email: item.profiles?.email || '',
        role: item.roles?.name || '',
        role_display_name: item.roles?.display_name || item.roles?.name || '',
        status: item.status,
      }));
    } catch (err) {
      console.error('Error fetching staff list:', err);
      return [];
    }
  }
}
