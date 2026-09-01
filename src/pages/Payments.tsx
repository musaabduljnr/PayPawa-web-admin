import React, { useState, useEffect, useCallback } from 'react';
import { CreditCard, Search, RefreshCw, Eye, CheckCircle2, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';
import { AdminFinanceService, PaymentSummary } from '../services/admin-finance.service';
import { Pagination } from '../components/common/Pagination';
import { StatusBadge } from '../components/common/StatusBadge';
import { DetailDrawer } from '../components/common/DetailDrawer';
import { EmptyState } from '../components/common/EmptyState';
import { Badge } from '../components/common/Badge';

const STATUS_FILTERS = ['ALL', 'successful', 'pending', 'failed'];

export const Payments: React.FC = () => {
  const [payments, setPayments] = useState<PaymentSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [offset, setOffset] = useState(0);
  const limit = 15;

  // Selected payment for inspection
  const [selectedPayment, setSelectedPayment] = useState<PaymentSummary | null>(null);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await AdminFinanceService.listPayments({
        search: search.trim(),
        status,
        limit,
        offset,
      });

      if (res.success) {
        setPayments(res.data);
        setTotal(res.total);
      }
    } finally {
      setLoading(false);
    }
  }, [search, status, offset]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setOffset(0);
    fetchPayments();
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Inbound Payment Gateways</h1>
          <p className="page-subtitle">Paystack charge history, webhook verification, and payment reconciliation logs.</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchPayments} disabled={loading}>
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
              placeholder="Search reference or customer..."
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
            <p style={{ fontSize: '13.5px' }}>Loading payment attempts...</p>
          </div>
        ) : payments.length === 0 ? (
          <div style={{ padding: '24px' }}>
            <EmptyState
              icon={CreditCard}
              title="No Payments Found"
              description={search ? `No payment records matched query "${search}".` : 'There are no inbound payments recorded under this filter.'}
            />
          </div>
        ) : (
          <>
            <div className="table-container" style={{ border: 'none' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Payment Reference</th>
                    <th>Customer</th>
                    <th>Amount (₦)</th>
                    <th>Gateway Provider</th>
                    <th>Status</th>
                    <th>Initiated Time</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: '#F8FAFC', fontFamily: 'monospace', fontSize: '12.5px' }}>
                          {p.reference}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '12.5px', color: '#CBD5E1', fontWeight: 500 }}>
                          {p.customerName || 'Verified Customer'}
                        </div>
                        {p.customerEmail && (
                          <div style={{ fontSize: '11px', color: '#64748B' }}>{p.customerEmail}</div>
                        )}
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: '#F8FAFC', fontSize: '13.5px' }}>
                          ₦{p.amountNaira.toLocaleString()}
                        </div>
                      </td>
                      <td>
                        <Badge variant="neutral">{p.provider.toUpperCase()}</Badge>
                      </td>
                      <td>
                        <StatusBadge status={p.status} type="transaction" />
                      </td>
                      <td>
                        <div style={{ fontSize: '12px' }}>
                          {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '—'}
                        </div>
                        <div style={{ fontSize: '10.5px', color: '#64748B' }}>
                          {p.createdAt ? new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '5px 10px', fontSize: '12px' }}
                          onClick={() => setSelectedPayment(p)}
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

      {/* Payment Detail Drawer */}
      <DetailDrawer
        isOpen={Boolean(selectedPayment)}
        onClose={() => setSelectedPayment(null)}
        title="Payment Record"
        subtitle={`Ref: ${selectedPayment?.reference || ''}`}
        width="540px"
      >
        {selectedPayment && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Amount Box */}
            <div style={{ backgroundColor: '#141C2B', borderRadius: '12px', border: '1px solid #1E293B', padding: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>
                  Inbound Payment Charge
                </span>
                <StatusBadge status={selectedPayment.status} type="transaction" />
              </div>

              <div style={{ fontSize: '32px', fontWeight: 800, color: '#F8FAFC' }}>
                ₦{selectedPayment.amountNaira.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>

              <div style={{ fontSize: '11.5px', color: '#94A3B8', marginTop: '6px' }}>
                Provider: <strong style={{ color: '#F8FAFC', textTransform: 'uppercase' }}>{selectedPayment.provider}</strong>
              </div>
            </div>

            {/* Details Grid */}
            <div style={{ backgroundColor: '#141C2B', borderRadius: '12px', border: '1px solid #1E293B', padding: '16px' }}>
              <div style={{ fontSize: '11.5px', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '12px' }}>
                Payment Audit Metadata
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12.5px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Customer:</span>
                  <span style={{ color: '#F8FAFC', fontWeight: 600 }}>{selectedPayment.customerName || 'Customer'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Payment Reference:</span>
                  <span style={{ color: '#CBD5E1', fontFamily: 'monospace' }}>{selectedPayment.reference}</span>
                </div>
                {selectedPayment.idempotencyKey && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Idempotency Key:</span>
                    <span style={{ color: '#CBD5E1', fontFamily: 'monospace', fontSize: '11px' }}>
                      {selectedPayment.idempotencyKey}
                    </span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Initiated Time:</span>
                  <span style={{ color: '#CBD5E1' }}>{new Date(selectedPayment.createdAt).toLocaleString()}</span>
                </div>
                {selectedPayment.verifiedAt && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Verified At:</span>
                    <span style={{ color: '#84CC16' }}>{new Date(selectedPayment.verifiedAt).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </DetailDrawer>
    </div>
  );
};
