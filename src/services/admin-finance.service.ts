import { supabase } from './supabase';

export interface WalletSummary {
  id: string;
  userId: string;
  balanceNaira: number;
  currency: string;
  isLocked: boolean;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  totalPurchasesCount: number;
  totalFundingsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentSummary {
  id: string;
  userId: string;
  amountNaira: number;
  currency: string;
  provider: string;
  status: string;
  reference: string;
  idempotencyKey?: string;
  customerName?: string;
  customerEmail?: string;
  createdAt: string;
  verifiedAt?: string;
}

export interface FinanceOverview {
  totalFundingNaira: number;
  totalVendingNaira: number;
  walletLiabilityNaira: number;
  successfulPayments: number;
  pendingPayments: number;
  failedPayments: number;
  pendingVendingExceptions: number;
}

export interface WalletAdjustmentPayload {
  walletId: string;
  adjustmentType: 'CREDIT' | 'DEBIT';
  amountNaira: number;
  reason: string;
  reference: string;
  supportingNote?: string;
  idempotencyKey: string;
}

export class AdminFinanceService {
  /**
   * Fetches paginated wallet directory with authoritative balances
   */
  static async listWallets(params: { search?: string; limit?: number; offset?: number } = {}) {
    const { search = '', limit = 15, offset = 0 } = params;

    // 1. Attempt RPC call to admin_list_wallets
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('admin_list_wallets', {
        p_search: search || null,
        p_limit: limit,
        p_offset: offset,
      });

      if (!rpcError && rpcData) {
        const raw = rpcData as any;
        const wallets: WalletSummary[] = (raw.data || []).map((row: any) => ({
          id: row.id,
          userId: row.user_id,
          balanceNaira: (Number(row.balance_kobo) || 0) / 100,
          currency: row.currency || 'NGN',
          isLocked: Boolean(row.is_locked),
          customerName: row.customer_name || 'Verified Customer',
          customerEmail: row.customer_email || '—',
          customerPhone: row.customer_phone,
          totalPurchasesCount: Number(row.total_purchases_count) || 0,
          totalFundingsCount: Number(row.total_fundings_count) || 0,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }));

        return {
          success: true,
          total: Number(raw.total) || 0,
          data: wallets,
        };
      }
    } catch (err) {
      console.warn('[AdminFinanceService] RPC admin_list_wallets failed, falling back to direct table query:', err);
    }

    // 2. Direct Supabase Query Fallback
    try {
      let query = supabase.from('wallet_accounts').select('*', { count: 'exact' });

      if (search) {
        query = query.or(`id.ilike.%${search}%`);
      }

      const { data, count, error } = await query
        .order('updated_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      const wallets: WalletSummary[] = (data || []).map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        balanceNaira: (Number(row.balance_kobo) || 0) / 100,
        currency: row.currency || 'NGN',
        isLocked: Boolean(row.is_locked),
        totalPurchasesCount: 0,
        totalFundingsCount: 0,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      return {
        success: true,
        total: count || 0,
        data: wallets,
      };
    } catch (fallbackErr: any) {
      console.error('[AdminFinanceService] List wallets error:', fallbackErr);
      return {
        success: false,
        total: 0,
        data: [],
        error: fallbackErr?.message || 'Failed to retrieve wallet records',
      };
    }
  }

  /**
   * Fetches paginated inbound payment attempts
   */
  static async listPayments(params: { search?: string; status?: string; provider?: string; limit?: number; offset?: number } = {}) {
    const { search = '', status = 'ALL', provider = 'ALL', limit = 15, offset = 0 } = params;

    // 1. Attempt RPC call to admin_list_payments
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('admin_list_payments', {
        p_search: search || null,
        p_status: status === 'ALL' ? null : status,
        p_provider: provider === 'ALL' ? null : provider,
        p_limit: limit,
        p_offset: offset,
      });

      if (!rpcError && rpcData) {
        const raw = rpcData as any;
        const payments: PaymentSummary[] = (raw.data || []).map((row: any) => ({
          id: row.id,
          userId: row.user_id,
          amountNaira: (Number(row.amount_kobo) || 0) / 100,
          currency: row.currency || 'NGN',
          provider: row.provider || 'paystack',
          status: row.status || 'unknown',
          reference: row.reference,
          idempotencyKey: row.idempotency_key,
          customerName: row.customer_name || 'Verified Customer',
          customerEmail: row.customer_email || '—',
          createdAt: row.created_at,
          verifiedAt: row.verified_at,
        }));

        return {
          success: true,
          total: Number(raw.total) || 0,
          data: payments,
        };
      }
    } catch (err) {
      console.warn('[AdminFinanceService] RPC admin_list_payments failed, falling back:', err);
    }

    // 2. Direct Supabase Query Fallback
    try {
      let query = supabase.from('payment_attempts').select('*', { count: 'exact' });

      if (status && status !== 'ALL') {
        query = query.eq('status', status);
      }

      if (search) {
        query = query.ilike('reference', `%${search}%`);
      }

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      const payments: PaymentSummary[] = (data || []).map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        amountNaira: (Number(row.amount_kobo) || 0) / 100,
        currency: row.currency || 'NGN',
        provider: row.provider || 'paystack',
        status: row.status || 'unknown',
        reference: row.reference,
        idempotencyKey: row.idempotency_key,
        createdAt: row.created_at,
        verifiedAt: row.verified_at,
      }));

      return {
        success: true,
        total: count || 0,
        data: payments,
      };
    } catch (fallbackErr: any) {
      return {
        success: false,
        total: 0,
        data: [],
        error: fallbackErr?.message || 'Failed to retrieve payment records',
      };
    }
  }

  /**
   * Fetches real platform finance summary metrics
   */
  static async getFinanceSummary(): Promise<{ success: boolean; data?: FinanceOverview; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('admin_get_finance_summary');
      if (error) throw error;

      return {
        success: true,
        data: {
          totalFundingNaira: Number(data.total_funding_naira) || 0,
          totalVendingNaira: Number(data.total_vending_naira) || 0,
          walletLiabilityNaira: Number(data.wallet_liability_naira) || 0,
          successfulPayments: Number(data.successful_payments) || 0,
          pendingPayments: Number(data.pending_payments) || 0,
          failedPayments: Number(data.failed_payments) || 0,
          pendingVendingExceptions: Number(data.pending_vending_exceptions) || 0,
        },
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Failed to calculate finance summary',
      };
    }
  }

  /**
   * Controlled Administrative Wallet Adjustment.
   * Enforces server-side permission checks, row-level locks, and creates an immutable audit record.
   */
  static async adjustWalletBalance(payload: WalletAdjustmentPayload) {
    try {
      const amountKobo = Math.round(payload.amountNaira * 100);

      const { data, error } = await supabase.rpc('admin_adjust_wallet_balance', {
        p_wallet_id: payload.walletId,
        p_adjustment_type: payload.adjustmentType,
        p_amount_kobo: amountKobo,
        p_reason: payload.reason.trim(),
        p_reference: payload.reference.trim(),
        p_supporting_note: payload.supportingNote?.trim() || null,
        p_idempotency_key: payload.idempotencyKey.trim(),
      });

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        data,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Adjustment failed due to an unexpected exception.',
      };
    }
  }
}
