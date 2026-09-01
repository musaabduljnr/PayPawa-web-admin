import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeftRight, Search, RefreshCw, Eye, Key, CheckCircle, Clock, AlertTriangle, ShieldCheck, Copy, Check } from 'lucide-react';
import { AdminTransactionsService, TransactionSummary, TransactionStatus } from '../services/admin-transactions.service';
import { Pagination } from '../components/common/Pagination';
import { StatusBadge } from '../components/common/StatusBadge';
import { DetailDrawer } from '../components/common/DetailDrawer';
import { EmptyState } from '../components/common/EmptyState';
import { Badge } from '../components/common/Badge';
import { useAdminAuth } from '../context/AdminAuthContext';
import { PermissionGate } from '../components/common/PermissionGate';

const STATUS_FILTERS = ['ALL', 'successful', 'processing', 'failed', 'unknown'];

export const Transactions: React.FC = () => {
  const { user, hasPermission } = useAdminAuth();
  const [transactions, setTransactions] = useState<TransactionSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [provider, setProvider] = useState('ALL');
  const [offset, setOffset] = useState(0);
  const limit = 15;

  // Selected Transaction for Detail Inspection
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);
  const [txDetails, setTxDetails] = useState<any | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [reconcileResult, setReconcileResult] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await AdminTransactionsService.listTransactions({
        search: search.trim(),
        status,
        provider,
        limit,
        offset,
      });

      if (res.success) {
        setTransactions(res.data);
        setTotal(res.total);
      }
    } finally {
      setLoading(false);
    }
  }, [search, status, provider, offset]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Load transaction details on drawer open
  useEffect(() => {
    if (!selectedTxId) {
      setTxDetails(null);
      setReconcileResult(null);
      return;
    }

    let isMounted = true;
    setDetailsLoading(true);
    AdminTransactionsService.getTransactionDetails(selectedTxId).then((res) => {
      if (isMounted && res.success) {
        setTxDetails(res);
      }
      if (isMounted) setDetailsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [selectedTxId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setOffset(0);
    fetchTransactions();
  };

  const handleReconcile = async () => {
    if (!selectedTxId || !user?.id) return;
    setReconciling(true);
    setReconcileResult(null);
    try {
      const res = await AdminTransactionsService.reconcileTransaction(selectedTxId, user.id);
      if (res.success) {
        setReconcileResult(res.message || 'Reconciliation completed.');
        // Refresh transaction list and current detail
        fetchTransactions();
        const updated = await AdminTransactionsService.getTransactionDetails(selectedTxId);
        if (updated.success) setTxDetails(updated);
      } else {
        setReconcileResult(`Error: ${res.error || 'Reconciliation failed.'}`);
      }
    } finally {
      setReconciling(false);
    }
  };

  const handleCopyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Transaction Explorer</h1>
          <p className="page-subtitle">Electricity vending stream, switch reconciliation, and token dispatch logs.</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchTransactions} disabled={loading}>
          <RefreshCw size={15} className={loading ? 'spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '20px', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Search Form */}
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px', flex: '1', minWidth: '280px', maxWidth: '420px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#0F172A',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '7px 12px',
              flex: 1,
            }}
          >
            <Search size={16} color="#64748B" />
            <input
              type="text"
              placeholder="Search reference, meter, customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                background: 'none',
                border: 'none',
                outline: 'none',
                color: '#F8FAFC',
                fontSize: '13px',
                width: '100%',
              }}
            />
          </div>
          <button type="submit" className="btn btn-secondary">
            Search
          </button>
        </form>

        {/* Status Filter Pills */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span style={{ fontSize: '11.5px', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', marginRight: '4px' }}>
            Status:
          </span>
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => {
                setStatus(s);
                setOffset(0);
              }}
              style={{
                backgroundColor: status === s ? 'rgba(132, 204, 22, 0.15)' : '#1E293B',
                color: status === s ? '#84CC16' : '#94A3B8',
                border: `1px solid ${status === s ? 'rgba(132, 204, 22, 0.4)' : '#334155'}`,
                padding: '5px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table Container */}
      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#94A3B8' }}>
            <p style={{ fontSize: '13.5px' }}>Loading electricity transactions...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div style={{ padding: '24px' }}>
            <EmptyState
              icon={ArrowLeftRight}
              title="No Transactions Found"
              description={search ? `No transactions matched your query "${search}".` : 'There are no electricity transactions recorded under this filter.'}
            />
          </div>
        ) : (
          <>
            <div className="table-container" style={{ border: 'none' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Customer</th>
                    <th>Meter</th>
                    <th>Amount (₦)</th>
                    <th>Units (kWh)</th>
                    <th>Provider</th>
                    <th>Status</th>
                    <th>Time</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: '#F8FAFC', fontFamily: 'monospace', fontSize: '12.5px' }}>
                          {tx.reference}
                        </div>
                        <div style={{ fontSize: '10.5px', color: '#64748B' }}>
                          {tx.id.slice(0, 8)}...
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '12.5px', color: '#CBD5E1', fontWeight: 500 }}>
                          {tx.customerName || 'Verified Customer'}
                        </div>
                        {tx.customerEmail && (
                          <div style={{ fontSize: '11px', color: '#64748B' }}>{tx.customerEmail}</div>
                        )}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#F8FAFC', fontSize: '12.5px' }}>
                          {tx.meterNumber}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: '#F8FAFC', fontSize: '13.5px' }}>
                          ₦{tx.amountNaira.toLocaleString()}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: '12.5px', color: tx.unitsKwh ? '#A3E635' : '#94A3B8' }}>
                          {tx.unitsKwh !== undefined ? `${tx.unitsKwh} kWh` : '—'}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '11.5px', color: '#94A3B8', textTransform: 'uppercase' }}>
                          {tx.providerName}
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={tx.status} type="transaction" />
                      </td>
                      <td>
                        <div style={{ fontSize: '11.5px', color: '#CBD5E1' }}>
                          {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : '—'}
                        </div>
                        <div style={{ fontSize: '10.5px', color: '#64748B' }}>
                          {tx.createdAt ? new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '5px 10px', fontSize: '12px' }}
                          onClick={() => setSelectedTxId(tx.id)}
                        >
                          <Eye size={13} />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <Pagination
              total={total}
              limit={limit}
              offset={offset}
              onPageChange={(newOffset) => setOffset(newOffset)}
            />
          </>
        )}
      </div>

      {/* Transaction Detail Drawer */}
      <DetailDrawer
        isOpen={Boolean(selectedTxId)}
        onClose={() => setSelectedTxId(null)}
        title="Transaction Details"
        subtitle={`Ref: ${txDetails?.transaction?.reference || selectedTxId || ''}`}
        width="600px"
        actions={
          <PermissionGate permission="transactions.reconcile">
            <button
              className="btn btn-primary"
              disabled={reconciling}
              onClick={handleReconcile}
            >
              <RefreshCw size={14} className={reconciling ? 'spin' : ''} />
              <span>{reconciling ? 'Reconciling...' : 'Reconcile Status'}</span>
            </button>
          </PermissionGate>
        }
      >
        {detailsLoading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#94A3B8' }}>
            Loading complete transaction lifecycle records...
          </div>
        ) : !txDetails ? (
          <div style={{ padding: '24px', color: '#EF4444' }}>Failed to load transaction data.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Status Notification */}
            {reconcileResult && (
              <div
                style={{
                  padding: '12px',
                  backgroundColor: 'rgba(132, 204, 22, 0.12)',
                  border: '1px solid rgba(132, 204, 22, 0.3)',
                  borderRadius: '8px',
                  fontSize: '12.5px',
                  color: '#CBD5E1',
                }}
              >
                {reconcileResult}
              </div>
            )}

            {/* Top Status & Amount Card */}
            <div style={{ backgroundColor: '#141C2B', borderRadius: '12px', border: '1px solid #1E293B', padding: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{ fontSize: '11.5px', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>
                  Vending Settlement
                </span>
                <StatusBadge status={txDetails.transaction.status} type="transaction" />
              </div>

              <div style={{ fontSize: '30px', fontWeight: 800, color: '#F8FAFC' }}>
                ₦{((Number(txDetails.transaction.amount_kobo) || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '14px', borderTop: '1px solid #1E293B', paddingTop: '12px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase' }}>Service Fee</div>
                  <div style={{ fontSize: '13px', color: '#CBD5E1', marginTop: '2px' }}>
                    ₦{((Number(txDetails.transaction.service_fee_kobo) || 0) / 100).toFixed(2)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase' }}>Delivered Energy</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: txDetails.transaction.units_kwh ? '#84CC16' : '#94A3B8', marginTop: '2px' }}>
                    {txDetails.transaction.units_kwh ? `${txDetails.transaction.units_kwh} kWh` : 'Pending / None'}
                  </div>
                </div>
              </div>
            </div>

            {/* Token Card (for delivered tokens) */}
            {txDetails.transaction.token && (
              <div
                style={{
                  backgroundColor: 'rgba(132, 204, 22, 0.08)',
                  border: '1px solid rgba(132, 204, 22, 0.3)',
                  borderRadius: '12px',
                  padding: '16px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', fontWeight: 700, color: '#84CC16', textTransform: 'uppercase' }}>
                    <Key size={14} />
                    <span>Electricity Token</span>
                  </div>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '4px 8px', fontSize: '11px' }}
                    onClick={() => handleCopyToken(txDetails.transaction.token)}
                  >
                    {copiedToken ? <Check size={12} color="#84CC16" /> : <Copy size={12} />}
                    <span>{copiedToken ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#F8FAFC', letterSpacing: '0.08em', marginTop: '8px', fontFamily: 'monospace' }}>
                  {txDetails.transaction.token}
                </div>
              </div>
            )}

            {/* Technical Metadata */}
            <div style={{ backgroundColor: '#141C2B', borderRadius: '12px', border: '1px solid #1E293B', padding: '16px' }}>
              <div style={{ fontSize: '11.5px', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '12px' }}>
                Operational & Gateway Context
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12.5px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Target Meter:</span>
                  <span style={{ color: '#F8FAFC', fontWeight: 600 }}>{txDetails.transaction.meter_number}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Idempotency Key:</span>
                  <span style={{ color: '#CBD5E1', fontFamily: 'monospace', fontSize: '11px' }}>
                    {txDetails.transaction.idempotency_key}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Provider:</span>
                  <span style={{ color: '#CBD5E1', textTransform: 'uppercase' }}>
                    {txDetails.transaction.provider_name || 'vtpass'}
                  </span>
                </div>
                {txDetails.transaction.provider_transaction_id && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Provider Tx ID:</span>
                    <span style={{ color: '#CBD5E1', fontFamily: 'monospace' }}>
                      {txDetails.transaction.provider_transaction_id}
                    </span>
                  </div>
                )}
                {txDetails.transaction.failure_message && (
                  <div style={{ borderTop: '1px solid #1E293B', paddingTop: '10px', color: '#EF4444' }}>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700 }}>Gateway Diagnostic:</div>
                    <div style={{ marginTop: '2px', fontSize: '12px' }}>{txDetails.transaction.failure_message}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Lifecycle Timeline */}
            <div style={{ backgroundColor: '#141C2B', borderRadius: '12px', border: '1px solid #1E293B', padding: '16px' }}>
              <div style={{ fontSize: '11.5px', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '14px' }}>
                Lifecycle Timeline
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', paddingLeft: '24px' }}>
                {/* Step 1: Initiated */}
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '-24px', top: '2px', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#84CC16' }} />
                  <div style={{ fontWeight: 600, color: '#F8FAFC', fontSize: '12.5px' }}>Purchase Initiated</div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>
                    {new Date(txDetails.transaction.created_at).toLocaleString()}
                  </div>
                </div>

                {/* Step 2: Processing */}
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '-24px', top: '2px', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: txDetails.transaction.status !== 'initiated' ? '#84CC16' : '#334155' }} />
                  <div style={{ fontWeight: 600, color: '#F8FAFC', fontSize: '12.5px' }}>Switch Gateway Dispatched (VTpass)</div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>
                    Atomic row-level wallet debit locked
                  </div>
                </div>

                {/* Step 3: Terminal Resolution */}
                <div style={{ position: 'relative' }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: '-24px',
                      top: '2px',
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      backgroundColor:
                        txDetails.transaction.status === 'successful'
                          ? '#84CC16'
                          : txDetails.transaction.status === 'failed'
                          ? '#EF4444'
                          : '#F59E0B',
                    }}
                  />
                  <div style={{ fontWeight: 600, color: '#F8FAFC', fontSize: '12.5px' }}>
                    {txDetails.transaction.status === 'successful'
                      ? 'Token Generated & Delivered'
                      : txDetails.transaction.status === 'failed'
                      ? 'Vending Failed (Auto-Refund Executed)'
                      : 'Awaiting Switch Confirmation'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>
                    {txDetails.transaction.completed_at
                      ? new Date(txDetails.transaction.completed_at).toLocaleString()
                      : 'In-Flight State'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </DetailDrawer>
    </div>
  );
};
