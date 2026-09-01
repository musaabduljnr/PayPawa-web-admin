import React, { useState, useEffect, useCallback } from 'react';
import { Gauge, Search, RefreshCw, Eye, User, Zap, MapPin, Calendar, Tag } from 'lucide-react';
import { AdminMetersService, MeterSummary } from '../services/admin-meters.service';
import { Pagination } from '../components/common/Pagination';
import { StatusBadge } from '../components/common/StatusBadge';
import { DetailDrawer } from '../components/common/DetailDrawer';
import { EmptyState } from '../components/common/EmptyState';
import { Badge } from '../components/common/Badge';

const DISCOS = ['ALL', 'AEDC', 'EKEDC', 'IBEDC', 'IKEDC', 'JED', 'KAEDCO', 'KEDCO', 'PHED', 'EEDC', 'BEDC', 'YEDC'];

export const Meters: React.FC = () => {
  const [meters, setMeters] = useState<MeterSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [disco, setDisco] = useState('ALL');
  const [meterType, setMeterType] = useState('ALL');
  const [offset, setOffset] = useState(0);
  const limit = 15;

  // Detail inspection drawer state
  const [selectedMeterId, setSelectedMeterId] = useState<string | null>(null);
  const [meterDetails, setMeterDetails] = useState<any | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const fetchMeters = useCallback(async () => {
    setLoading(true);
    try {
      const res = await AdminMetersService.listMeters({
        search: search.trim(),
        disco,
        meterType,
        limit,
        offset,
      });

      if (res.success) {
        setMeters(res.data);
        setTotal(res.total);
      }
    } finally {
      setLoading(false);
    }
  }, [search, disco, meterType, offset]);

  useEffect(() => {
    fetchMeters();
  }, [fetchMeters]);

  // Load meter details on drawer open
  useEffect(() => {
    if (!selectedMeterId) {
      setMeterDetails(null);
      return;
    }

    let isMounted = true;
    setDetailsLoading(true);
    AdminMetersService.getMeterDetails(selectedMeterId).then((res) => {
      if (isMounted && res.success) {
        setMeterDetails(res);
      }
      if (isMounted) setDetailsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [selectedMeterId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setOffset(0);
    fetchMeters();
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Meters Operations</h1>
          <p className="page-subtitle">DisCo routing, verification registry, and registered meter lookup.</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchMeters} disabled={loading}>
          <RefreshCw size={15} className={loading ? 'spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
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
                placeholder="Search meter number or customer..."
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

          {/* Meter Type Filter */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <span style={{ fontSize: '11.5px', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', marginRight: '4px' }}>
              Type:
            </span>
            {['ALL', 'prepaid', 'postpaid'].map((t) => (
              <button
                key={t}
                onClick={() => {
                  setMeterType(t);
                  setOffset(0);
                }}
                style={{
                  backgroundColor: meterType === t ? 'rgba(132, 204, 22, 0.15)' : '#1E293B',
                  color: meterType === t ? '#84CC16' : '#94A3B8',
                  border: `1px solid ${meterType === t ? 'rgba(132, 204, 22, 0.4)' : '#334155'}`,
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

        {/* DisCo Pills Bar */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', marginRight: '4px' }}>
            DisCo:
          </span>
          {DISCOS.map((d) => (
            <button
              key={d}
              onClick={() => {
                setDisco(d);
                setOffset(0);
              }}
              style={{
                backgroundColor: disco === d ? '#84CC16' : '#1E293B',
                color: disco === d ? '#0B0F17' : '#94A3B8',
                border: 'none',
                padding: '3px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Table Container */}
      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#94A3B8' }}>
            <p style={{ fontSize: '13.5px' }}>Loading registered meters...</p>
          </div>
        ) : meters.length === 0 ? (
          <div style={{ padding: '24px' }}>
            <EmptyState
              icon={Gauge}
              title="No Meters Found"
              description={search ? `No meter records matched your search query "${search}".` : 'There are no meters registered under this filter.'}
            />
          </div>
        ) : (
          <>
            <div className="table-container" style={{ border: 'none' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Meter Number</th>
                    <th>DisCo</th>
                    <th>Type</th>
                    <th>Owner / Customer</th>
                    <th>Address</th>
                    <th>Status</th>
                    <th>Registered</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {meters.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: '#F8FAFC', letterSpacing: '0.04em' }}>
                          {m.meterNumber}
                        </div>
                        {m.nickname && (
                          <div style={{ fontSize: '11px', color: '#64748B' }}>{m.nickname}</div>
                        )}
                      </td>
                      <td>
                        <Badge variant="neutral">{m.discoCode || m.discoName}</Badge>
                      </td>
                      <td>
                        <span style={{ textTransform: 'capitalize', fontSize: '12.5px' }}>{m.meterType}</span>
                      </td>
                      <td>
                        <div style={{ fontSize: '12.5px', color: '#CBD5E1', fontWeight: 500 }}>
                          {m.ownerName || m.customerName || 'Verified Customer'}
                        </div>
                        {m.ownerEmail && (
                          <div style={{ fontSize: '11px', color: '#64748B' }}>{m.ownerEmail}</div>
                        )}
                      </td>
                      <td>
                        <div style={{ fontSize: '12px', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {m.address || '—'}
                        </div>
                      </td>
                      <td>
                        <StatusBadge status={String(m.isActive)} type="meter" />
                      </td>
                      <td>
                        <div style={{ fontSize: '12px' }}>
                          {m.createdAt ? new Date(m.createdAt).toLocaleDateString() : '—'}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '5px 10px', fontSize: '12px' }}
                          onClick={() => setSelectedMeterId(m.id)}
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

      {/* Meter Detail Drawer */}
      <DetailDrawer
        isOpen={Boolean(selectedMeterId)}
        onClose={() => setSelectedMeterId(null)}
        title={meterDetails?.meter?.meter_number || 'Meter Details'}
        subtitle={`ID: ${selectedMeterId || ''}`}
        width="560px"
      >
        {detailsLoading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#94A3B8' }}>
            Loading meter specifications and historical transactions...
          </div>
        ) : !meterDetails ? (
          <div style={{ padding: '24px', color: '#EF4444' }}>Failed to load meter records.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Meter Specs Box */}
            <div style={{ backgroundColor: '#141C2B', borderRadius: '12px', border: '1px solid #1E293B', padding: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{ fontSize: '11.5px', color: '#84CC16', fontWeight: 700, textTransform: 'uppercase' }}>
                  Technical Specifications
                </span>
                <StatusBadge status={String(meterDetails.meter.is_active)} type="meter" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase' }}>Meter Number</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#F8FAFC', letterSpacing: '0.04em', marginTop: '2px' }}>
                    {meterDetails.meter.meter_number}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase' }}>DisCo Code</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#F8FAFC', marginTop: '2px' }}>
                    {(meterDetails.meter.disco_code || meterDetails.meter.disco_name)?.toUpperCase()}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase' }}>Meter Type</div>
                  <div style={{ fontSize: '13px', color: '#CBD5E1', marginTop: '2px', textTransform: 'uppercase' }}>
                    {meterDetails.meter.meter_type}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase' }}>Nickname</div>
                  <div style={{ fontSize: '13px', color: '#CBD5E1', marginTop: '2px' }}>
                    {meterDetails.meter.nickname || 'None'}
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid #1E293B', marginTop: '12px', paddingTop: '12px' }}>
                <div style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase' }}>Service Address</div>
                <div style={{ fontSize: '12.5px', color: '#CBD5E1', marginTop: '2px' }}>
                  {meterDetails.meter.address || 'No service address provided.'}
                </div>
              </div>
            </div>

            {/* Owner Details */}
            {meterDetails.owner && (
              <div style={{ backgroundColor: '#141C2B', borderRadius: '12px', border: '1px solid #1E293B', padding: '16px' }}>
                <div style={{ fontSize: '11.5px', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '10px' }}>
                  Registered Account Owner
                </div>
                <div style={{ fontWeight: 600, color: '#F8FAFC', fontSize: '13.5px' }}>
                  {meterDetails.owner.full_name}
                </div>
                <div style={{ fontSize: '12.5px', color: '#94A3B8', marginTop: '2px' }}>
                  {meterDetails.owner.email} • {meterDetails.owner.phone || 'No phone'}
                </div>
              </div>
            )}

            {/* Recent Vending Transactions */}
            <div>
              <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#F8FAFC', marginBottom: '12px' }}>
                Meter Vending History ({meterDetails.transactions?.length || 0})
              </div>
              {meterDetails.transactions?.length === 0 ? (
                <div style={{ backgroundColor: '#141C2B', padding: '16px', borderRadius: '8px', textAlign: 'center', color: '#94A3B8', fontSize: '12.5px' }}>
                  No transaction history recorded for this meter.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {meterDetails.transactions.map((tx: any) => (
                    <div
                      key={tx.id}
                      style={{
                        backgroundColor: '#141C2B',
                        padding: '12px',
                        borderRadius: '8px',
                        border: '1px solid #1E293B',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, color: '#F8FAFC', fontSize: '13px' }}>
                          ₦{(Number(tx.amount_kobo) / 100).toLocaleString()} • {tx.units_kwh || '—'} kWh
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                          Ref: {tx.reference} • {new Date(tx.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <StatusBadge status={tx.status} type="transaction" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DetailDrawer>
    </div>
  );
};
