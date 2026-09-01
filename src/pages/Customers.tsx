import React, { useState, useEffect, useCallback } from 'react';
import { Users, Search, RefreshCw, Eye, Smartphone, Mail, Calendar, Wallet, Gauge, ArrowLeftRight } from 'lucide-react';
import { AdminCustomersService, CustomerSummary } from '../services/admin-customers.service';
import { Pagination } from '../components/common/Pagination';
import { StatusBadge } from '../components/common/StatusBadge';
import { DetailDrawer } from '../components/common/DetailDrawer';
import { EmptyState } from '../components/common/EmptyState';
import { Badge } from '../components/common/Badge';

export const Customers: React.FC = () => {
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [accountType, setAccountType] = useState('ALL');
  const [offset, setOffset] = useState(0);
  const limit = 15;

  // Selected customer for detail inspection
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerDetails, setCustomerDetails] = useState<any | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'meters' | 'transactions' | 'wallet'>('profile');

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await AdminCustomersService.listCustomers({
        search: search.trim(),
        accountType,
        limit,
        offset,
      });

      if (res.success) {
        setCustomers(res.data);
        setTotal(res.total);
      }
    } finally {
      setLoading(false);
    }
  }, [search, accountType, offset]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Load customer details on drawer open
  useEffect(() => {
    if (!selectedCustomerId) {
      setCustomerDetails(null);
      return;
    }

    let isMounted = true;
    setDetailsLoading(true);
    AdminCustomersService.getCustomerDetails(selectedCustomerId).then((res) => {
      if (isMounted && res.success) {
        setCustomerDetails(res);
      }
      if (isMounted) setDetailsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [selectedCustomerId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setOffset(0);
    fetchCustomers();
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Customer Directory</h1>
          <p className="page-subtitle">Inspect registered customer accounts, energy setups, and profile records.</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchCustomers} disabled={loading}>
          <RefreshCw size={15} className={loading ? 'spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '20px',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
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
              placeholder="Search by name, email, or phone..."
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

        {/* Account Type Filter */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span style={{ fontSize: '11.5px', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', marginRight: '4px' }}>
            Type:
          </span>
          {['ALL', 'household', 'business', 'commercial'].map((t) => (
            <button
              key={t}
              onClick={() => {
                setAccountType(t);
                setOffset(0);
              }}
              style={{
                backgroundColor: accountType === t ? 'rgba(132, 204, 22, 0.15)' : '#1E293B',
                color: accountType === t ? '#84CC16' : '#94A3B8',
                border: `1px solid ${accountType === t ? 'rgba(132, 204, 22, 0.4)' : '#334155'}`,
                padding: '5px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Table Container */}
      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#94A3B8' }}>
            <p style={{ fontSize: '13.5px' }}>Loading customer records...</p>
          </div>
        ) : customers.length === 0 ? (
          <div style={{ padding: '24px' }}>
            <EmptyState
              icon={Users}
              title="No Customers Found"
              description={search ? `No customer records matched your query "${search}".` : 'There are no customer accounts registered yet.'}
            />
          </div>
        ) : (
          <>
            <div className="table-container" style={{ border: 'none' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Contact</th>
                    <th>Account Type</th>
                    <th>Meters</th>
                    <th>Transactions</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: '#F8FAFC' }}>{c.fullName}</div>
                        <div style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace' }}>
                          {c.id.slice(0, 8)}...
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '12.5px', color: '#CBD5E1' }}>{c.email}</div>
                        {c.phone && <div style={{ fontSize: '11px', color: '#64748B' }}>{c.phone}</div>}
                      </td>
                      <td>
                        <span style={{ textTransform: 'capitalize', fontSize: '12px' }}>{c.accountType}</span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: '#F8FAFC' }}>{c.metersCount}</span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: '#F8FAFC' }}>{c.transactionsCount}</span>
                      </td>
                      <td>
                        <StatusBadge status={String(c.isOnboarded)} type="customer" />
                      </td>
                      <td>
                        <div style={{ fontSize: '12px' }}>
                          {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '—'}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '5px 10px', fontSize: '12px' }}
                          onClick={() => {
                            setSelectedCustomerId(c.id);
                            setActiveTab('profile');
                          }}
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

      {/* Customer Detail Drawer */}
      <DetailDrawer
        isOpen={Boolean(selectedCustomerId)}
        onClose={() => setSelectedCustomerId(null)}
        title={customerDetails?.profile?.full_name || 'Customer Details'}
        subtitle={`ID: ${selectedCustomerId || ''}`}
        width="600px"
      >
        {detailsLoading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#94A3B8' }}>
            Loading customer profile & domain records...
          </div>
        ) : !customerDetails ? (
          <div style={{ padding: '24px', color: '#EF4444' }}>Failed to load customer profile details.</div>
        ) : (
          <div>
            {/* Tabs Header */}
            <div
              style={{
                display: 'flex',
                borderBottom: '1px solid #1E293B',
                marginBottom: '20px',
                gap: '8px',
              }}
            >
              {[
                { key: 'profile', label: 'Profile', icon: Users },
                { key: 'meters', label: `Meters (${customerDetails.meters?.length || 0})`, icon: Gauge },
                { key: 'transactions', label: `Transactions (${customerDetails.transactions?.length || 0})`, icon: ArrowLeftRight },
                { key: 'wallet', label: 'Wallet', icon: Wallet },
              ].map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as any)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 12px',
                      background: 'none',
                      border: 'none',
                      borderBottom: active ? '2px solid #84CC16' : '2px solid transparent',
                      color: active ? '#84CC16' : '#94A3B8',
                      fontSize: '12.5px',
                      fontWeight: active ? 600 : 500,
                      cursor: 'pointer',
                    }}
                  >
                    <Icon size={14} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab: Profile */}
            {activeTab === 'profile' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ backgroundColor: '#141C2B', padding: '12px', borderRadius: '8px', border: '1px solid #1E293B' }}>
                    <div style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase' }}>Full Name</div>
                    <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#F8FAFC', marginTop: '2px' }}>
                      {customerDetails.profile.full_name || 'Not Provided'}
                    </div>
                  </div>
                  <div style={{ backgroundColor: '#141C2B', padding: '12px', borderRadius: '8px', border: '1px solid #1E293B' }}>
                    <div style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase' }}>Account Type</div>
                    <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#F8FAFC', marginTop: '2px', textTransform: 'capitalize' }}>
                      {customerDetails.profile.account_type || 'Household'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ backgroundColor: '#141C2B', padding: '12px', borderRadius: '8px', border: '1px solid #1E293B' }}>
                    <div style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase' }}>Email</div>
                    <div style={{ fontSize: '13px', color: '#CBD5E1', marginTop: '2px' }}>
                      {customerDetails.profile.email || '—'}
                    </div>
                  </div>
                  <div style={{ backgroundColor: '#141C2B', padding: '12px', borderRadius: '8px', border: '1px solid #1E293B' }}>
                    <div style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase' }}>Phone</div>
                    <div style={{ fontSize: '13px', color: '#CBD5E1', marginTop: '2px' }}>
                      {customerDetails.profile.phone || customerDetails.profile.phone_number || '—'}
                    </div>
                  </div>
                </div>

                <div style={{ backgroundColor: '#141C2B', padding: '12px', borderRadius: '8px', border: '1px solid #1E293B' }}>
                  <div style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase' }}>Registration Date</div>
                  <div style={{ fontSize: '13px', color: '#CBD5E1', marginTop: '2px' }}>
                    {customerDetails.profile.created_at ? new Date(customerDetails.profile.created_at).toLocaleString() : '—'}
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Meters */}
            {activeTab === 'meters' && (
              <div>
                {customerDetails.meters?.length === 0 ? (
                  <EmptyState title="No Registered Meters" description="This customer has not registered any electricity meters." />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {customerDetails.meters.map((m: any) => (
                      <div
                        key={m.id}
                        style={{
                          backgroundColor: '#141C2B',
                          padding: '12px 16px',
                          borderRadius: '8px',
                          border: '1px solid #1E293B',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, color: '#F8FAFC', fontSize: '13.5px' }}>
                            {m.meter_number}
                          </div>
                          <div style={{ fontSize: '11.5px', color: '#94A3B8', marginTop: '2px' }}>
                            {m.disco_name || m.disco_code?.toUpperCase()} • {m.meter_type?.toUpperCase()}
                          </div>
                        </div>
                        <StatusBadge status={String(m.is_active)} type="meter" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab: Transactions */}
            {activeTab === 'transactions' && (
              <div>
                {customerDetails.transactions?.length === 0 ? (
                  <EmptyState title="No Transactions" description="No electricity purchase transactions recorded." />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {customerDetails.transactions.map((tx: any) => (
                      <div
                        key={tx.id}
                        style={{
                          backgroundColor: '#141C2B',
                          padding: '12px',
                          borderRadius: '8px',
                          border: '1px solid #1E293B',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 600, color: '#F8FAFC', fontSize: '13px' }}>
                            ₦{(Number(tx.amount_kobo) / 100).toLocaleString()}
                          </span>
                          <StatusBadge status={tx.status} type="transaction" />
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#94A3B8', marginTop: '4px' }}>
                          Ref: {tx.reference} • Meter: {tx.meter_number}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                          {new Date(tx.created_at).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab: Wallet */}
            {activeTab === 'wallet' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div
                  style={{
                    backgroundColor: 'rgba(132, 204, 22, 0.08)',
                    border: '1px solid rgba(132, 204, 22, 0.3)',
                    borderRadius: '12px',
                    padding: '20px',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#84CC16', textTransform: 'uppercase' }}>
                    Current Wallet Balance
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: '#F8FAFC', marginTop: '4px' }}>
                    ₦{((Number(customerDetails.wallet?.balance_kobo) || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>
                    Wallet ID: {customerDetails.wallet?.id || 'Uninitialized'}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </DetailDrawer>
    </div>
  );
};
