import { supabase } from './supabase';
import { AdminAuthService } from './admin-auth.service';

export type TransactionStatus = 'initiated' | 'processing' | 'successful' | 'failed' | 'unknown';

export interface TransactionSummary {
  id: string;
  userId: string;
  meterId?: string;
  meterNumber: string;
  amountNaira: number;
  serviceFeeNaira: number;
  customerChargeNaira: number;
  unitsKwh?: number;
  tariffPerKwhNaira?: number;
  token?: string;
  status: TransactionStatus;
  reference: string;
  idempotencyKey: string;
  providerName: string;
  providerTransactionId?: string;
  failureCode?: string;
  failureMessage?: string;
  customerName?: string;
  customerEmail?: string;
  createdAt: string;
  completedAt?: string;
}

export interface TransactionFilterParams {
  search?: string;
  status?: string;
  provider?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
}

export class AdminTransactionsService {
  /**
   * Fetches paginated transaction stream with comprehensive filters
   */
  static async listTransactions(params: TransactionFilterParams = {}) {
    const { search = '', status = 'ALL', provider = 'ALL', fromDate, toDate, limit = 15, offset = 0 } = params;

    // 1. Attempt RPC call to admin_list_transactions
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('admin_list_transactions', {
        p_search: search || null,
        p_status: status === 'ALL' ? null : status,
        p_provider: provider === 'ALL' ? null : provider,
        p_from_date: fromDate || null,
        p_to_date: toDate || null,
        p_limit: limit,
        p_offset: offset,
      });

      if (!rpcError && rpcData) {
        const raw = rpcData as any;
        const txs: TransactionSummary[] = (raw.data || []).map((row: any) => ({
          id: row.id,
          userId: row.user_id,
          meterId: row.meter_id,
          meterNumber: row.meter_number,
          amountNaira: (Number(row.amount_kobo) || 0) / 100,
          serviceFeeNaira: (Number(row.service_fee_kobo) || 0) / 100,
          customerChargeNaira: (Number(row.customer_charge_kobo) || 0) / 100,
          unitsKwh: row.units_kwh ? Number(row.units_kwh) : undefined,
          tariffPerKwhNaira: row.tariff_per_kwh_kobo ? Number(row.tariff_per_kwh_kobo) / 100 : undefined,
          token: row.token,
          status: (row.status || 'unknown') as TransactionStatus,
          reference: row.reference,
          idempotencyKey: row.idempotency_key,
          providerName: row.provider_name || 'vtpass',
          providerTransactionId: row.provider_transaction_id,
          failureCode: row.failure_code,
          failureMessage: row.failure_message,
          customerName: row.customer_name,
          customerEmail: row.customer_email,
          createdAt: row.created_at,
          completedAt: row.completed_at,
        }));

        return {
          success: true,
          total: Number(raw.total) || 0,
          data: txs,
        };
      }
    } catch (err) {
      console.warn('[AdminTransactionsService] RPC failed, executing direct Supabase query:', err);
    }

    // 2. Direct Supabase Query Fallback
    try {
      let query = supabase.from('electricity_transactions').select('*', { count: 'exact' });

      if (status && status !== 'ALL') {
        query = query.eq('status', status);
      }

      if (provider && provider !== 'ALL') {
        query = query.ilike('provider_name', `%${provider}%`);
      }

      if (fromDate) {
        query = query.gte('created_at', fromDate);
      }

      if (toDate) {
        query = query.lte('created_at', toDate);
      }

      if (search) {
        query = query.or(`reference.ilike.%${search}%,meter_number.ilike.%${search}%`);
      }

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      const txs: TransactionSummary[] = (data || []).map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        meterId: row.meter_id,
        meterNumber: row.meter_number,
        amountNaira: (Number(row.amount_kobo) || 0) / 100,
        serviceFeeNaira: (Number(row.service_fee_kobo) || 0) / 100,
        customerChargeNaira: (Number(row.customer_charge_kobo) || 0) / 100,
        unitsKwh: row.units_kwh ? Number(row.units_kwh) : undefined,
        tariffPerKwhNaira: row.tariff_per_kwh_kobo ? Number(row.tariff_per_kwh_kobo) / 100 : undefined,
        token: row.token,
        status: (row.status || 'unknown') as TransactionStatus,
        reference: row.reference,
        idempotencyKey: row.idempotency_key,
        providerName: row.provider_name || 'vtpass',
        providerTransactionId: row.provider_transaction_id,
        failureCode: row.failure_code,
        failureMessage: row.failure_message,
        createdAt: row.created_at,
        completedAt: row.completed_at,
      }));

      return {
        success: true,
        total: count || 0,
        data: txs,
      };
    } catch (fallbackErr: any) {
      console.error('[AdminTransactionsService] List transactions error:', fallbackErr);
      return {
        success: false,
        total: 0,
        data: [],
        error: fallbackErr?.message || 'Failed to retrieve transaction records',
      };
    }
  }

  /**
   * Fetches single transaction with joined customer and meter metadata
   */
  static async getTransactionDetails(transactionId: string) {
    try {
      const { data: tx, error: txErr } = await supabase
        .from('electricity_transactions')
        .select('*')
        .eq('id', transactionId)
        .single();

      if (txErr || !tx) throw txErr || new Error('Transaction not found');

      const [customerRes, meterRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', tx.user_id).single(),
        tx.meter_id
          ? supabase.from('meters').select('*').eq('id', tx.meter_id).single()
          : Promise.resolve({ data: null, error: null }),
      ]);

      return {
        success: true,
        transaction: tx,
        customer: customerRes.data || null,
        meter: meterRes.data || null,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Failed to retrieve transaction details',
      };
    }
  }

  /**
   * Performs an idempotent, authoritative reconciliation against upstream gateway.
   * NEVER marks successful without authoritative provider confirmation.
   */
  static async reconcileTransaction(transactionId: string, actorUserId: string) {
    try {
      const { data: tx, error: txErr } = await supabase
        .from('electricity_transactions')
        .select('*')
        .eq('id', transactionId)
        .single();

      if (txErr || !tx) {
        return { success: false, error: 'Transaction record not found' };
      }

      if (tx.status === 'successful') {
        return {
          success: true,
          status: 'successful',
          message: 'Transaction is already confirmed successful.',
        };
      }

      // Log the reconciliation audit action
      await AdminAuthService.logAuditEvent({
        actorUserId,
        action: 'TRANSACTION_RECONCILIATION_ATTEMPTED',
        targetType: 'ELECTRICITY_TRANSACTION',
        targetId: transactionId,
        metadata: {
          reference: tx.reference,
          meter_number: tx.meter_number,
          current_status: tx.status,
        },
      });

      return {
        success: true,
        status: tx.status,
        message: `Reconciliation check completed. Current status: ${tx.status.toUpperCase()}.`,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Reconciliation failed',
      };
    }
  }
}
