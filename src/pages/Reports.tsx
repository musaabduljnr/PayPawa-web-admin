import React, { useState, useEffect } from 'react';
import { BarChart3, RefreshCw, Wallet, Zap, CreditCard, AlertCircle, ShieldAlert, ArrowRight, Download } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { AdminFinanceService, FinanceOverview } from '../services/admin-finance.service';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { PermissionGate } from '../components/common/PermissionGate';

export const Reports: React.FC = () => {
  const [summary, setSummary] = useState<FinanceOverview | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchFinanceSummary = async () => {
    setLoading(true);
    try {
      const res = await AdminFinanceService.getFinanceSummary();
      if (res.success && res.data) {
        setSummary(res.data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinanceSummary();
  }, []);

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Finance & Reconciliation Center</h1>
          <p className="page-subtitle">Real-time financial reconciliation, wallet liability, and gateway settlement metrics.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <PermissionGate permission="reports.export">
            <button className="btn btn-secondary" onClick={() => alert('Exporting statement CSV will be available in Phase 10D.')}>
              <Download size={14} />
              <span>Export Ledger</span>
            </button>
          </PermissionGate>
          <button className="btn btn-secondary" onClick={fetchFinanceSummary} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Main KPI Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '20px',
          marginBottom: '28px',
        }}
      >
        {/* Total Inbound Funding */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>
              Inbound Funding
            </span>
            <CreditCard size={18} color="#84CC16" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#F8FAFC' }}>
            {summary ? `₦${summary.totalFundingNaira.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
          </div>
          <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '4px' }}>
            {summary ? `${summary.successfulPayments} verified payments` : 'Calculating...'}
          </div>
        </div>

        {/* Electricity Sales */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>
              Electricity Vended
            </span>
            <Zap size={18} color="#84CC16" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#F8FAFC' }}>
            {summary ? `₦${summary.totalVendingNaira.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
          </div>
          <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '4px' }}>
            VTpass authoritative delivered volume
          </div>
        </div>

        {/* Platform Wallet Liability */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>
              Wallet Liability
            </span>
            <Wallet size={18} color="#84CC16" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#F8FAFC' }}>
            {summary ? `₦${summary.walletLiabilityNaira.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
          </div>
          <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '4px' }}>
            Total live customer balances held
          </div>
        </div>

        {/* Discrepancy / Exception Queue */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>
              Reconciliation Flags
            </span>
            <ShieldAlert size={18} color={summary?.pendingVendingExceptions ? '#EF4444' : '#10B981'} />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: summary?.pendingVendingExceptions ? '#EF4444' : '#10B981' }}>
            {summary ? summary.pendingVendingExceptions : '0'}
          </div>
          <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '4px' }}>
            {summary?.pendingVendingExceptions ? 'In-flight or unresolved vends' : 'Zero unsettled transactions'}
          </div>
        </div>
      </div>

      {/* Reconciliation Queue & Audit Sections */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
        {/* Payment Inbound Breakdown */}
        <div className="card">
          <h2 className="card-title">Payment Settlement Health</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: '#141C2B', borderRadius: '8px', border: '1px solid #1E293B' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#F8FAFC' }}>Successful Paystack Charges</div>
                <div style={{ fontSize: '11px', color: '#64748B' }}>Webhook verified & wallet credited</div>
              </div>
              <Badge variant="active">{summary?.successfulPayments || 0}</Badge>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: '#141C2B', borderRadius: '8px', border: '1px solid #1E293B' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#F8FAFC' }}>Pending Gateway Callbacks</div>
                <div style={{ fontSize: '11px', color: '#64748B' }}>Awaiting terminal webhook verification</div>
              </div>
              <Badge variant="pending">{summary?.pendingPayments || 0}</Badge>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: '#141C2B', borderRadius: '8px', border: '1px solid #1E293B' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#F8FAFC' }}>Failed Gateway Charges</div>
                <div style={{ fontSize: '11px', color: '#64748B' }}>Abandoned or declined by customer bank</div>
              </div>
              <Badge variant="danger">{summary?.failedPayments || 0}</Badge>
            </div>
          </div>
        </div>

        {/* Discrepancy Resolution Center */}
        <div className="card">
          <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={18} color="#F59E0B" />
            <span>Discrepancy Resolution Center</span>
          </h2>
          <p style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '16px' }}>
            Detects state mismatches between PayPawa internal ledgers and upstream switch gateways (VTpass / Paystack).
          </p>

          {summary && summary.pendingVendingExceptions > 0 ? (
            <div
              style={{
                padding: '16px',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: '8px',
                marginBottom: '16px',
              }}
            >
              <div style={{ fontWeight: 700, color: '#F59E0B', fontSize: '13px' }}>
                {summary.pendingVendingExceptions} In-Flight Exception(s) Detected
              </div>
              <p style={{ fontSize: '12px', color: '#CBD5E1', marginTop: '4px' }}>
                Some transactions experienced delayed provider responses. Inspect the transaction ledger to requery switch status.
              </p>
              <NavLink to="/transactions" className="btn btn-secondary" style={{ marginTop: '12px', display: 'inline-flex' }}>
                <span>Open Transaction Explorer</span>
                <ArrowRight size={14} />
              </NavLink>
            </div>
          ) : (
            <EmptyState
              title="Ledger Balanced"
              description="No discrepancies found between PayPawa double-entry ledger records and upstream provider states."
            />
          )}
        </div>
      </div>
    </div>
  );
};
