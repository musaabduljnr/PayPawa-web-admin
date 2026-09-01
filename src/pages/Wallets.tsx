import React, { useState, useEffect, useCallback } from 'react';
import { Wallet, Search, RefreshCw, Eye, SlidersHorizontal, AlertCircle, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { AdminFinanceService, WalletSummary } from '../services/admin-finance.service';
import { Pagination } from '../components/common/Pagination';
import { DetailDrawer } from '../components/common/DetailDrawer';
import { EmptyState } from '../components/common/EmptyState';
import { Badge } from '../components/common/Badge';
import { PermissionGate } from '../components/common/PermissionGate';

export const Wallets: React.FC = () => {
  const [wallets, setWallets] = useState<WalletSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const limit = 15;

  // Selected Wallet for inspection
  const [selectedWallet, setSelectedWallet] = useState<WalletSummary | null>(null);

  // Controlled Adjustment Modal State
  const [adjustModalWallet, setAdjustModalWallet] = useState<WalletSummary | null>(null);
  const [adjustType, setAdjustType] = useState<'CREDIT' | 'DEBIT'>('CREDIT');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustRef, setAdjustRef] = useState('');
  const [adjustNote, setAdjustNote] = useState('');
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);
  const [adjustError, setAdjustError] = useState<string | null>(null);
  const [adjustSuccess, setAdjustSuccess] = useState<string | null>(null);

  const fetchWallets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await AdminFinanceService.listWallets({
        search: search.trim(),
        limit,
        offset,
      });

      if (res.success) {
        setWallets(res.data);
        setTotal(res.total);
      }
    } finally {
      setLoading(false);
    }
  }, [search, offset]);

  useEffect(() => {
    fetchWallets();
  }, [fetchWallets]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setOffset(0);
    fetchWallets();
  };

  const handleOpenAdjustModal = (w: WalletSummary) => {
    setAdjustModalWallet(w);
    setAdjustType('CREDIT');
    setAdjustAmount('');
    setAdjustReason('');
    setAdjustRef(`ADJ-${Date.now().toString().slice(-6)}`);
    setAdjustNote('');
    setAdjustError(null);
    setAdjustSuccess(null);
  };

  const handleExecuteAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustModalWallet) return;

    const numAmount = parseFloat(adjustAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setAdjustError('Please enter a valid positive adjustment amount.');
      return;
    }

    if (adjustType === 'DEBIT' && numAmount > adjustModalWallet.balanceNaira) {
      setAdjustError(`Insufficient funds: Cannot debit ₦${numAmount.toLocaleString()} from balance of ₦${adjustModalWallet.balanceNaira.toLocaleString()}.`);
      return;
    }

    if (!adjustReason || adjustReason.trim().length < 5) {
      setAdjustError('A detailed operational reason (min 5 characters) is required.');
      return;
    }

    if (!adjustRef || !adjustRef.trim()) {
      setAdjustError('An external audit reference is required.');
      return;
    }

    setAdjustError(null);
    setAdjustSubmitting(true);

    try {
      const idempotencyKey = `adj-idemp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const res = await AdminFinanceService.adjustWalletBalance({
        walletId: adjustModalWallet.id,
        adjustmentType: adjustType,
        amountNaira: numAmount,
        reason: adjustReason,
        reference: adjustRef,
        supportingNote: adjustNote,
        idempotencyKey,
      });

      if (res.success) {
        setAdjustSuccess(`Successfully executed ${adjustType} of ₦${numAmount.toLocaleString()}.`);
        fetchWallets();
        setTimeout(() => {
          setAdjustModalWallet(null);
        }, 1500);
      } else {
        setAdjustError(res.error || 'Adjustment failed on server.');
      }
    } catch (err: any) {
      setAdjustError(err?.message || 'Unexpected exception during adjustment.');
    } finally {
      setAdjustSubmitting(false);
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Wallet & Ledger Registry</h1>
          <p className="page-subtitle">Authoritative customer wallet balances, double-entry ledgers, and controlled manual adjustments.</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchWallets} disabled={loading}>
          <RefreshCw size={15} className={loading ? 'spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Search Toolbar */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'center' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px', flex: '1', maxWidth: '420px' }}>
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
              placeholder="Search by customer name or email..."
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
      </div>

      {/* Table Container */}
      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#94A3B8' }}>
            <p style={{ fontSize: '13.5px' }}>Loading customer wallets...</p>
          </div>
        ) : wallets.length === 0 ? (
          <div style={{ padding: '24px' }}>
            <EmptyState
              icon={Wallet}
              title="No Wallets Found"
              description={search ? `No wallet records matched query "${search}".` : 'There are no wallet accounts created yet.'}
            />
          </div>
        ) : (
          <>
            <div className="table-container" style={{ border: 'none' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Wallet ID</th>
                    <th>Authoritative Balance</th>
                    <th>Lock Status</th>
                    <th>Fundings</th>
                    <th>Purchases</th>
                    <th>Updated Time</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {wallets.map((w) => (
                    <tr key={w.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: '#F8FAFC', fontSize: '13px' }}>
                          {w.customerName || 'Verified Customer'}
                        </div>
                        {w.customerEmail && (
                          <div style={{ fontSize: '11px', color: '#64748B' }}>{w.customerEmail}</div>
                        )}
                      </td>
                      <td>
                        <div style={{ fontSize: '11.5px', color: '#CBD5E1', fontFamily: 'monospace' }}>
                          {w.id.slice(0, 10)}...
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 800, color: '#84CC16', fontSize: '14px' }}>
                          ₦{w.balanceNaira.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                      </td>
                      <td>
                        <Badge variant={w.isLocked ? 'danger' : 'active'}>
                          {w.isLocked ? 'LOCKED' : 'ACTIVE'}
                        </Badge>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: '#F8FAFC' }}>{w.totalFundingsCount}</span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: '#F8FAFC' }}>{w.totalPurchasesCount}</span>
                      </td>
                      <td>
                        <div style={{ fontSize: '11.5px', color: '#CBD5E1' }}>
                          {w.updatedAt ? new Date(w.updatedAt).toLocaleDateString() : '—'}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '5px 8px', fontSize: '11.5px' }}
                            onClick={() => setSelectedWallet(w)}
                          >
                            <Eye size={13} />
                            <span>Inspect</span>
                          </button>

                          <PermissionGate permission="wallets.adjust">
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '5px 8px', fontSize: '11.5px', color: '#84CC16', borderColor: 'rgba(132, 204, 22, 0.4)' }}
                              onClick={() => handleOpenAdjustModal(w)}
                            >
                              <SlidersHorizontal size={13} />
                              <span>Adjust</span>
                            </button>
                          </PermissionGate>
                        </div>
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

      {/* Wallet Detail Drawer */}
      <DetailDrawer
        isOpen={Boolean(selectedWallet)}
        onClose={() => setSelectedWallet(null)}
        title="Wallet Ledger Details"
        subtitle={`ID: ${selectedWallet?.id || ''}`}
        width="540px"
      >
        {selectedWallet && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Balance Box */}
            <div style={{ backgroundColor: '#141C2B', borderRadius: '12px', border: '1px solid #1E293B', padding: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '11px', color: '#84CC16', textTransform: 'uppercase', fontWeight: 700 }}>
                  Live Ledger Balance
                </span>
                <Badge variant={selectedWallet.isLocked ? 'danger' : 'active'}>
                  {selectedWallet.isLocked ? 'LOCKED' : 'ACTIVE'}
                </Badge>
              </div>

              <div style={{ fontSize: '32px', fontWeight: 800, color: '#F8FAFC' }}>
                ₦{selectedWallet.balanceNaira.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>

              <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '6px' }}>
                Customer: <strong style={{ color: '#F8FAFC' }}>{selectedWallet.customerName}</strong>
              </div>
            </div>

            {/* Account Specs */}
            <div style={{ backgroundColor: '#141C2B', borderRadius: '12px', border: '1px solid #1E293B', padding: '16px' }}>
              <div style={{ fontSize: '11.5px', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '12px' }}>
                Account Invariants
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12.5px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Currency:</span>
                  <span style={{ color: '#F8FAFC', fontWeight: 600 }}>{selectedWallet.currency}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>User UUID:</span>
                  <span style={{ color: '#CBD5E1', fontFamily: 'monospace', fontSize: '11.5px' }}>
                    {selectedWallet.userId}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Created Date:</span>
                  <span style={{ color: '#CBD5E1' }}>{new Date(selectedWallet.createdAt).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </DetailDrawer>

      {/* Controlled Wallet Adjustment Modal */}
      {adjustModalWallet && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(3px)',
            zIndex: 110,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '480px',
              backgroundColor: '#111827',
              border: '1px solid #334155',
              borderRadius: '16px',
              padding: '28px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.7)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(132, 204, 22, 0.15)',
                  border: '1px solid rgba(132, 204, 22, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#84CC16',
                }}
              >
                <SlidersHorizontal size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#F8FAFC' }}>Controlled Wallet Adjustment</h3>
                <p style={{ fontSize: '12px', color: '#94A3B8' }}>
                  Target: {adjustModalWallet.customerName} (Bal: ₦{adjustModalWallet.balanceNaira.toLocaleString()})
                </p>
              </div>
            </div>

            {adjustError && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 12px',
                  backgroundColor: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '8px',
                  fontSize: '12.5px',
                  color: '#FCA5A5',
                  marginBottom: '16px',
                }}
              >
                <AlertCircle size={16} />
                <span>{adjustError}</span>
              </div>
            )}

            {adjustSuccess && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 12px',
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '8px',
                  fontSize: '12.5px',
                  color: '#6EE7B7',
                  marginBottom: '16px',
                }}
              >
                <CheckCircle2 size={16} />
                <span>{adjustSuccess}</span>
              </div>
            )}

            <form onSubmit={handleExecuteAdjustment} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Type Switcher */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Adjustment Type
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setAdjustType('CREDIT')}
                    style={{
                      padding: '8px',
                      borderRadius: '6px',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      border: `1px solid ${adjustType === 'CREDIT' ? '#84CC16' : '#334155'}`,
                      backgroundColor: adjustType === 'CREDIT' ? 'rgba(132, 204, 22, 0.15)' : '#0F172A',
                      color: adjustType === 'CREDIT' ? '#84CC16' : '#94A3B8',
                      cursor: 'pointer',
                    }}
                  >
                    + Credit Wallet
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('DEBIT')}
                    style={{
                      padding: '8px',
                      borderRadius: '6px',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      border: `1px solid ${adjustType === 'DEBIT' ? '#EF4444' : '#334155'}`,
                      backgroundColor: adjustType === 'DEBIT' ? 'rgba(239, 68, 68, 0.15)' : '#0F172A',
                      color: adjustType === 'DEBIT' ? '#EF4444' : '#94A3B8',
                      cursor: 'pointer',
                    }}
                  >
                    - Debit Wallet
                  </button>
                </div>
              </div>

              {/* Amount */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Amount (₦)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 5000.00"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: '#0F172A',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: '#F8FAFC',
                    fontSize: '13.5px',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Reason */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Operational Reason (Required)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Disputed failed vending refund compensation"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: '#0F172A',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: '#F8FAFC',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Audit Reference */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', marginBottom: '6px' }}>
                  External Audit Reference
                </label>
                <input
                  type="text"
                  required
                  value={adjustRef}
                  onChange={(e) => setAdjustRef(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: '#0F172A',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: '#F8FAFC',
                    fontSize: '13px',
                    fontFamily: 'monospace',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={adjustSubmitting}
                  onClick={() => setAdjustModalWallet(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={adjustSubmitting}
                >
                  {adjustSubmitting ? 'Mutating Ledger...' : `Confirm ${adjustType}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
