import { supabase } from './supabase';

export interface MeterSummary {
  id: string;
  userId: string;
  meterNumber: string;
  discoCode: string;
  discoName: string;
  meterType: 'prepaid' | 'postpaid';
  nickname?: string;
  customerName?: string;
  address?: string;
  isActive: boolean;
  ownerName?: string;
  ownerEmail?: string;
  totalPurchases: number;
  createdAt: string;
}

export interface MeterFilterParams {
  search?: string;
  disco?: string;
  meterType?: string;
  limit?: number;
  offset?: number;
}

export class AdminMetersService {
  /**
   * Fetches paginated meters directory with search and DisCo filtering
   */
  static async listMeters(params: MeterFilterParams = {}) {
    const { search = '', disco = 'ALL', meterType = 'ALL', limit = 15, offset = 0 } = params;

    // 1. Attempt RPC call to admin_list_meters
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('admin_list_meters', {
        p_search: search || null,
        p_disco: disco === 'ALL' ? null : disco,
        p_meter_type: meterType === 'ALL' ? null : meterType,
        p_limit: limit,
        p_offset: offset,
      });

      if (!rpcError && rpcData) {
        const raw = rpcData as any;
        const meters: MeterSummary[] = (raw.data || []).map((row: any) => ({
          id: row.id,
          userId: row.user_id,
          meterNumber: row.meter_number,
          discoCode: (row.disco_code || '').toUpperCase(),
          discoName: row.disco_name || row.disco_code?.toUpperCase() || 'DisCo',
          meterType: row.meter_type === 'postpaid' ? 'postpaid' : 'prepaid',
          nickname: row.nickname,
          customerName: row.customer_name || 'Verified Customer',
          address: row.address || 'Service Address',
          isActive: Boolean(row.is_active),
          ownerName: row.owner_name,
          ownerEmail: row.owner_email,
          totalPurchases: Number(row.total_purchases) || 0,
          createdAt: row.created_at,
        }));

        return {
          success: true,
          total: Number(raw.total) || 0,
          data: meters,
        };
      }
    } catch (err) {
      console.warn('[AdminMetersService] RPC failed, executing direct Supabase query:', err);
    }

    // 2. Direct Supabase Query Fallback
    try {
      let query = supabase.from('meters').select('*', { count: 'exact' });

      if (disco && disco !== 'ALL') {
        query = query.ilike('disco_code', `%${disco}%`);
      }

      if (meterType && meterType !== 'ALL') {
        query = query.eq('meter_type', meterType);
      }

      if (search) {
        query = query.or(`meter_number.ilike.%${search}%,customer_name.ilike.%${search}%,nickname.ilike.%${search}%`);
      }

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      const meters: MeterSummary[] = (data || []).map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        meterNumber: row.meter_number,
        discoCode: (row.disco_code || '').toUpperCase(),
        discoName: row.disco_name || row.disco_code?.toUpperCase() || 'DisCo',
        meterType: row.meter_type === 'postpaid' ? 'postpaid' : 'prepaid',
        nickname: row.nickname,
        customerName: row.customer_name || 'Verified Customer',
        address: row.address || 'Service Address',
        isActive: Boolean(row.is_active),
        totalPurchases: 0,
        createdAt: row.created_at,
      }));

      return {
        success: true,
        total: count || 0,
        data: meters,
      };
    } catch (fallbackErr: any) {
      console.error('[AdminMetersService] List meters error:', fallbackErr);
      return {
        success: false,
        total: 0,
        data: [],
        error: fallbackErr?.message || 'Failed to retrieve meter records',
      };
    }
  }

  /**
   * Fetches detailed meter record with owner profile and transaction history
   */
  static async getMeterDetails(meterId: string) {
    try {
      const { data: meter, error: meterErr } = await supabase
        .from('meters')
        .select('*')
        .eq('id', meterId)
        .single();

      if (meterErr || !meter) throw meterErr || new Error('Meter not found');

      const [ownerRes, txsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', meter.user_id).single(),
        supabase
          .from('electricity_transactions')
          .select('*')
          .or(`meter_id.eq.${meter.id},meter_number.eq.${meter.meter_number}`)
          .order('created_at', { ascending: false })
          .limit(25),
      ]);

      return {
        success: true,
        meter,
        owner: ownerRes.data || null,
        transactions: txsRes.data || [],
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Failed to retrieve meter details',
      };
    }
  }
}
