import { supabase } from './supabase';

export interface CustomerSummary {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  accountType: 'household' | 'business' | 'commercial';
  isOnboarded: boolean;
  metersCount: number;
  transactionsCount: number;
  walletBalanceNaira: number;
  createdAt: string;
  updatedAt?: string;
}

export interface CustomerFilterParams {
  search?: string;
  accountType?: string;
  limit?: number;
  offset?: number;
}

export class AdminCustomersService {
  /**
   * Fetches paginated customer directory with search and filtering
   */
  static async listCustomers(params: CustomerFilterParams = {}) {
    const { search = '', accountType = 'ALL', limit = 15, offset = 0 } = params;

    // 1. Attempt RPC call to admin_list_customers
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('admin_list_customers', {
        p_search: search || null,
        p_account_type: accountType === 'ALL' ? null : accountType,
        p_limit: limit,
        p_offset: offset,
      });

      if (!rpcError && rpcData) {
        const raw = rpcData as any;
        const customers: CustomerSummary[] = (raw.data || []).map((row: any) => ({
          id: row.id,
          fullName: row.full_name || 'Anonymous Customer',
          email: row.email || 'No email registered',
          phone: row.phone,
          accountType: row.account_type || 'household',
          isOnboarded: Boolean(row.is_onboarded),
          metersCount: Number(row.meters_count) || 0,
          transactionsCount: Number(row.transactions_count) || 0,
          walletBalanceNaira: (Number(row.wallet_balance_kobo) || 0) / 100,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }));

        return {
          success: true,
          total: Number(raw.total) || 0,
          data: customers,
        };
      }
    } catch (err) {
      console.warn('[AdminCustomersService] RPC failed, executing direct Supabase query:', err);
    }

    // 2. Direct Supabase Query Fallback
    try {
      let query = supabase
        .from('profiles')
        .select('*', { count: 'exact' });

      if (accountType && accountType !== 'ALL') {
        query = query.eq('account_type', accountType);
      }

      if (search) {
        query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
      }

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      const customers: CustomerSummary[] = (data || []).map((row: any) => ({
        id: row.id,
        fullName: row.full_name || 'Anonymous Customer',
        email: row.email || 'No email registered',
        phone: row.phone || row.phone_number,
        accountType: row.account_type || 'household',
        isOnboarded: Boolean(row.is_onboarded || row.onboarding_completed),
        metersCount: 0,
        transactionsCount: 0,
        walletBalanceNaira: 0,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      return {
        success: true,
        total: count || 0,
        data: customers,
      };
    } catch (fallbackErr: any) {
      console.error('[AdminCustomersService] List customers error:', fallbackErr);
      return {
        success: false,
        total: 0,
        data: [],
        error: fallbackErr?.message || 'Failed to retrieve customer records',
      };
    }
  }

  /**
   * Fetches detailed customer profile, registered meters, transactions, and wallet
   */
  static async getCustomerDetails(customerId: string) {
    try {
      const [profileRes, metersRes, txsRes, walletRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', customerId).single(),
        supabase.from('meters').select('*').eq('user_id', customerId).order('created_at', { ascending: false }),
        supabase.from('electricity_transactions').select('*').eq('user_id', customerId).order('created_at', { ascending: false }).limit(20),
        supabase.from('wallet_accounts').select('*').eq('user_id', customerId).maybeSingle(),
      ]);

      if (profileRes.error) throw profileRes.error;

      return {
        success: true,
        profile: profileRes.data,
        meters: metersRes.data || [],
        transactions: txsRes.data || [],
        wallet: walletRes.data || null,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Failed to retrieve customer details',
      };
    }
  }
}
