import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  Search,
  RefreshCw,
  Download,
  Filter,
  Eye,
  Link as LinkIcon,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  User,
  Shield,
  Layers,
  FileText,
  Activity,
  ArrowRight,
  Database,
  Lock,
  Calendar,
  AlertCircle
} from 'lucide-react';
import {
  AdminAuditService,
  AuditLogItem,
  AuditResult,
  AuditLogDetailsResponse,
  SystemActivitySummary,
} from '../../services/admin-audit.service';
import { Pagination } from '../../components/common/Pagination';
import { DetailDrawer } from '../../components/common/DetailDrawer';
import { EmptyState } from '../../components/common/EmptyState';
import { Badge } from '../../components/common/Badge';

export const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const limit = 15;

  // Filters
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [targetTypeFilter, setTargetTypeFilter] = useState<string>('ALL');
  const [resultFilter, setResultFilter] = useState<string>('ALL');
  const [correlationIdFilter, setCorrelationIdFilter] = useState<string>('');
  const [datePreset, setDatePreset] = useState<string>('ALL');

  // Summary Metrics
  const [summary, setSummary] = useState<SystemActivitySummary>({
    total_24h: 0,
    financial_mutations_24h: 0,
    security_changes_24h: 0,
    failed_events_24h: 0,
    active_actors_24h: 0,
  });

  // Selected Log Detail
  const [selectedAuditId, setSelectedAuditId] = useState<string | null>(null);
  const [logDetails, setLogDetails] = useState<AuditLogDetailsResponse | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Compute date range from preset
  const getDateRange = (preset: string) => {
    const now = new Date();
    if (preset === 'TODAY') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return { startDate: start.toISOString(), endDate: now.toISOString() };
    }
    if (preset === 'LAST_7_DAYS') {
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { startDate: start.toISOString(), endDate: now.toISOString() };
    }
    if (preset === 'LAST_30_DAYS') {
      const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return { startDate: start.toISOString(), endDate: now.toISOString() };
    }
    return { startDate: undefined, endDate: undefined };
  };

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const { startDate, endDate } = getDateRange(datePreset);
      const res = await AdminAuditService.listAuditLogs({
        search: search.trim(),
        action: actionFilter,
        targetType: targetTypeFilter,
        result: resultFilter,
        correlationId: correlationIdFilter.trim() || undefined,
        startDate,
        endDate,
        limit,
        offset,
      });

      if (res.success) {
        setLogs(res.data);
        setTotalLogs(res.total);
      }
    } finally {
      setLoading(false);
    }
  }, [search, actionFilter, targetTypeFilter, resultFilter, correlationIdFilter, datePreset, offset]);

  const fetchSummary = async () => {
    const data = await AdminAuditService.getSystemActivitySummary();
    setSummary(data);
  };

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    fetchSummary();
  }, []);

  const handleOpenDetail = async (auditId: string) => {
    setSelectedAuditId(auditId);
    setDetailsLoading(true);
    try {
      const res = await AdminAuditService.getAuditLogDetails(auditId);
      if (res.success) {
        setLogDetails(res);
      }
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleFilterByCorrelationId = (corrId: string) => {
    setCorrelationIdFilter(corrId);
    setOffset(0);
    if (selectedAuditId) {
      setSelectedAuditId(null);
      setLogDetails(null);
    }
  };

  const handleExportLogs = () => {
    const jsonStr = JSON.stringify(logs, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `paypawa-audit-log-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderResultBadge = (res: AuditResult) => {
    switch (res) {
      case 'SUCCESS':
        return <Badge variant="active">SUCCESS</Badge>;
      case 'FAILED':
        return <Badge variant="danger">FAILED</Badge>;
      case 'WARNING':
        return <Badge variant="pending">WARNING</Badge>;
      case 'PENDING':
      default:
        return <Badge variant="neutral">PENDING</Badge>;
    }
  };

  const renderActionBadge = (action: string) => {
    let colorBg = 'var(--bg-tertiary)';
    let colorText = 'var(--text-primary)';
    let borderColor = 'var(--border-subtle)';

    if (action.includes('WALLET') || action.includes('PAYMENT')) {
      colorBg = 'rgba(16, 185, 129, 0.15)';
      colorText = '#10b981';
      borderColor = 'rgba(16, 185, 129, 0.3)';
    } else if (action.includes('STAFF') || action.includes('ROLE') || action.includes('GOVERNANCE')) {
      colorBg = 'rgba(168, 85, 247, 0.15)';
      colorText = '#a855f7';
      borderColor = 'rgba(168, 85, 247, 0.3)';
    } else if (action.includes('TRANSACTION') || action.includes('METER')) {
      colorBg = 'rgba(59, 130, 246, 0.15)';
      colorText = '#3b82f6';
      borderColor = 'rgba(59, 130, 246, 0.3)';
    } else if (action.includes('SUPPORT')) {
      colorBg = 'rgba(234, 179, 8, 0.15)';
      colorText = '#eab308';
      borderColor = 'rgba(234, 179, 8, 0.3)';
    }

    return (
      <span
        style={{
          display: 'inline-block',
          padding: '2px 8px',
          borderRadius: '4px',
          backgroundColor: colorBg,
          color: colorText,
          border: `1px solid ${borderColor}`,
          fontSize: '11px',
          fontWeight: 700,
          fontFamily: 'monospace',
          letterSpacing: '0.02em',
        }}
      >
        {action}
      </span>
    );
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Immutable Audit Trail & System Activity</h1>
          <p className="page-subtitle">
            Authoritative append-only logs, sensitive mutations, correlation trace chains, and governance records.
          </p>
        </div>

        <button className="btn btn-secondary" onClick={handleExportLogs}>
          <Download size={16} />
          Export Audit Trail
        </button>
      </div>

      {/* KPI Activity Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '8px',
              backgroundColor: 'rgba(59, 130, 246, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#3b82f6',
            }}
          >
            <Activity size={20} />
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {summary.total_24h}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>24h Total Events</div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '8px',
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#10b981',
            }}
          >
            <Database size={20} />
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#10b981' }}>
              {summary.financial_mutations_24h}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Financial Mutations</div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '8px',
              backgroundColor: 'rgba(168, 85, 247, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#a855f7',
            }}
          >
            <Shield size={20} />
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#a855f7' }}>
              {summary.security_changes_24h}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Security & RBAC Changes</div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '8px',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ef4444',
            }}
          >
            <AlertTriangle size={20} />
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: summary.failed_events_24h > 0 ? '#ef4444' : 'var(--text-primary)' }}>
              {summary.failed_events_24h}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Failed / Warnings (24h)</div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '8px',
              backgroundColor: 'rgba(234, 179, 8, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#eab308',
            }}
          >
            <User size={20} />
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {summary.active_actors_24h}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Active Actors (24h)</div>
          </div>
        </div>
      </div>

      {/* Multi-Filter & Search Bar */}
      <div className="card" style={{ marginBottom: '20px', padding: '16px 20px' }}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setOffset(0);
            fetchLogs();
          }}
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Search Input */}
          <div style={{ position: 'relative', flex: '1 1 240px', minWidth: '220px' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              placeholder="Search actor, action, target ID, trace..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                paddingLeft: '36px',
                paddingRight: '12px',
                height: '38px',
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontSize: '13px',
              }}
            />
          </div>

          {/* Action Filter */}
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setOffset(0);
            }}
            style={{
              height: '38px',
              padding: '0 12px',
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              fontSize: '13px',
            }}
          >
            <option value="ALL">All Actions</option>
            <option value="WALLET_ADJUSTMENT">WALLET_ADJUSTMENT</option>
            <option value="PAYMENT_RECONCILED">PAYMENT_RECONCILED</option>
            <option value="TRANSACTION_RETRY">TRANSACTION_RETRY</option>
            <option value="TRANSACTION_RECONCILED">TRANSACTION_RECONCILED</option>
            <option value="METER_CREATED">METER_CREATED</option>
            <option value="METER_UPDATED">METER_UPDATED</option>
            <option value="STAFF_MEMBER_CREATED">STAFF_MEMBER_CREATED</option>
            <option value="STAFF_ROLE_UPDATED">STAFF_ROLE_UPDATED</option>
            <option value="STAFF_STATUS_UPDATED">STAFF_STATUS_UPDATED</option>
            <option value="ROLE_PERMISSIONS_UPDATED">ROLE_PERMISSIONS_UPDATED</option>
            <option value="GOVERNANCE_ACTION_APPROVED">GOVERNANCE_ACTION_APPROVED</option>
            <option value="SUPPORT_CASE_CREATED">SUPPORT_CASE_CREATED</option>
            <option value="SUPPORT_CASE_STATUS_CHANGED">SUPPORT_CASE_STATUS_CHANGED</option>
            <option value="SUPPORT_CASE_ESCALATED">SUPPORT_CASE_ESCALATED</option>
            <option value="SETTINGS_CHANGED">SETTINGS_CHANGED</option>
            <option value="INTEGRATION_CHANGED">INTEGRATION_CHANGED</option>
          </select>

          {/* Target Type Filter */}
          <select
            value={targetTypeFilter}
            onChange={(e) => {
              setTargetTypeFilter(e.target.value);
              setOffset(0);
            }}
            style={{
              height: '38px',
              padding: '0 12px',
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              fontSize: '13px',
            }}
          >
            <option value="ALL">All Target Types</option>
            <option value="WALLET">WALLET</option>
            <option value="PAYMENT_ATTEMPT">PAYMENT_ATTEMPT</option>
            <option value="ELECTRICITY_TRANSACTION">ELECTRICITY_TRANSACTION</option>
            <option value="METER">METER</option>
            <option value="STAFF_MEMBER">STAFF_MEMBER</option>
            <option value="ROLE">ROLE</option>
            <option value="SUPPORT_CASE">SUPPORT_CASE</option>
            <option value="GOVERNANCE_REQUEST">GOVERNANCE_REQUEST</option>
            <option value="SYSTEM_SETTING">SYSTEM_SETTING</option>
            <option value="INTEGRATION_CONFIG">INTEGRATION_CONFIG</option>
          </select>

          {/* Result Filter */}
          <select
            value={resultFilter}
            onChange={(e) => {
              setResultFilter(e.target.value);
              setOffset(0);
            }}
            style={{
              height: '38px',
              padding: '0 12px',
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              fontSize: '13px',
            }}
          >
            <option value="ALL">All Results</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="FAILED">FAILED</option>
            <option value="WARNING">WARNING</option>
          </select>

          {/* Date Preset Filter */}
          <select
            value={datePreset}
            onChange={(e) => {
              setDatePreset(e.target.value);
              setOffset(0);
            }}
            style={{
              height: '38px',
              padding: '0 12px',
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              fontSize: '13px',
            }}
          >
            <option value="ALL">All Time</option>
            <option value="TODAY">Today</option>
            <option value="LAST_7_DAYS">Last 7 Days</option>
            <option value="LAST_30_DAYS">Last 30 Days</option>
          </select>

          {/* Correlation ID Quick Filter Indicator */}
          {correlationIdFilter && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                padding: '4px 10px',
                borderRadius: 'var(--radius-md)',
                fontSize: '12px',
                color: '#3b82f6',
              }}
            >
              <LinkIcon size={12} />
              <span>Trace: {correlationIdFilter.slice(0, 12)}...</span>
              <button
                type="button"
                onClick={() => {
                  setCorrelationIdFilter('');
                  setOffset(0);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#3b82f6',
                  cursor: 'pointer',
                  fontWeight: 700,
                  marginLeft: '4px',
                }}
              >
                ✕
              </button>
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="submit" className="btn btn-secondary" style={{ height: '38px' }}>
              Filter
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ height: '38px', padding: '0 12px' }}
              onClick={() => {
                setSearch('');
                setActionFilter('ALL');
                setTargetTypeFilter('ALL');
                setResultFilter('ALL');
                setCorrelationIdFilter('');
                setDatePreset('ALL');
                setOffset(0);
                fetchLogs();
              }}
              title="Reset Filters"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </form>
      </div>

      {/* Audit Logs Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading && logs.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px', display: 'block' }} />
            Loading audit records...
          </div>
        ) : logs.length === 0 ? (
          <div style={{ padding: '40px 20px' }}>
            <EmptyState
              icon={ShieldAlert}
              title="No Audit Records Found"
              description="No audit logs matched the specified search and filter criteria."
            />
          </div>
        ) : (
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Target Entity</th>
                  <th>Result</th>
                  <th>Correlation Trace</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <div style={{ fontSize: '12.5px', color: 'var(--text-primary)', fontWeight: 500 }}>
                        {new Date(log.created_at).toLocaleDateString()}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{log.actor_name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {log.actor_role} • {log.actor_email}
                      </div>
                    </td>
                    <td>{renderActionBadge(log.action)}</td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '12.5px' }}>
                        {log.target_type}
                      </div>
                      {log.target_id && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                          ID: {log.target_id.slice(0, 16)}...
                        </div>
                      )}
                    </td>
                    <td>{renderResultBadge(log.result)}</td>
                    <td>
                      {log.correlation_id ? (
                        <button
                          type="button"
                          onClick={() => handleFilterByCorrelationId(log.correlation_id!)}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: 'var(--accent-primary)',
                            fontSize: '11px',
                            fontFamily: 'monospace',
                            cursor: 'pointer',
                          }}
                          title="Filter all events in this correlation trace chain"
                        >
                          <LinkIcon size={11} />
                          {log.correlation_id.slice(0, 14)}...
                        </button>
                      ) : (
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '5px 10px', fontSize: '11.5px' }}
                        onClick={() => handleOpenDetail(log.id)}
                      >
                        <Eye size={13} />
                        View Event & Trace
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalLogs > limit && (
          <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-subtle)' }}>
            <Pagination
              total={totalLogs}
              limit={limit}
              offset={offset}
              onPageChange={(newOffset) => setOffset(newOffset)}
            />
          </div>
        )}
      </div>

      {/* DETAIL DRAWER: AUDIT RECORD & CORRELATION TRACE CHAIN */}
      <DetailDrawer
        isOpen={Boolean(selectedAuditId)}
        onClose={() => {
          setSelectedAuditId(null);
          setLogDetails(null);
        }}
        title={
          logDetails?.log
            ? `Audit Event: ${logDetails.log.action}`
            : 'Audit Log Details'
        }
      >
        {detailsLoading || !logDetails?.log ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px', display: 'block' }} />
            Loading audit details and correlation chain...
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Header info */}
            <div
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                padding: '16px 18px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {renderActionBadge(logDetails.log.action)}
                  {renderResultBadge(logDetails.log.result)}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
                  Recorded on {new Date(logDetails.log.created_at).toLocaleString()}
                </div>
              </div>

              {logDetails.log.correlation_id && (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Correlation Trace ID
                  </div>
                  <div style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--accent-primary)', fontWeight: 600 }}>
                    {logDetails.log.correlation_id}
                  </div>
                </div>
              )}
            </div>

            {/* Actor & Entity Context */}
            <div className="card" style={{ padding: '16px' }}>
              <h4 style={{ fontSize: '13.5px', fontWeight: 600, marginBottom: '12px', color: 'var(--text-primary)' }}>
                Actor & Target Entity
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Actor Name:</span>
                  <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{logDetails.log.actor_name}</p>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{logDetails.log.actor_email}</p>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Actor Role:</span>
                  <p style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{logDetails.log.actor_role}</p>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Target Entity:</span>
                  <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{logDetails.log.target_type}</p>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Target ID:</span>
                  <p style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                    {logDetails.log.target_id || '—'}
                  </p>
                </div>
              </div>
            </div>

            {/* Error Message Alert (if failed) */}
            {logDetails.log.error_message && (
              <div
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  color: '#ef4444',
                  fontSize: '13px',
                }}
              >
                <strong>Error Diagnostic:</strong> {logDetails.log.error_message}
              </div>
            )}

            {/* CORRELATED EVENTS TRACE CHAIN */}
            {logDetails.correlated_events && logDetails.correlated_events.length > 0 && (
              <div className="card" style={{ padding: '16px' }}>
                <h4
                  style={{
                    fontSize: '13.5px',
                    fontWeight: 600,
                    marginBottom: '12px',
                    color: 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <LinkIcon size={15} color="var(--accent-primary)" />
                  Correlated Event Trace Chain ({logDetails.correlated_events.length})
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {logDetails.correlated_events.map((corr) => (
                    <div
                      key={corr.id}
                      onClick={() => handleOpenDetail(corr.id)}
                      style={{
                        padding: '10px 12px',
                        backgroundColor: 'var(--bg-primary)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {renderActionBadge(corr.action)}
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {corr.target_type} {corr.target_id ? `(#${corr.target_id.slice(0, 8)})` : ''}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {renderResultBadge(corr.result)}
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {new Date(corr.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <ArrowRight size={13} color="var(--text-muted)" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sanitized Metadata Payload (Zero secrets/passwords exposed) */}
            <div className="card" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h4 style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileText size={15} />
                  Sanitized Metadata Payload
                </h4>
                <span
                  style={{
                    fontSize: '11px',
                    color: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.12)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontWeight: 600,
                  }}
                >
                  <Lock size={10} style={{ display: 'inline', marginRight: '3px' }} />
                  CREDENTIALS REDACTED
                </span>
              </div>

              <pre
                style={{
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '12px',
                  color: 'var(--accent-primary)',
                  fontFamily: 'monospace',
                  overflowX: 'auto',
                  lineHeight: 1.5,
                  maxHeight: '260px',
                }}
              >
                {JSON.stringify(logDetails.log.metadata || {}, null, 2)}
              </pre>
            </div>

            {/* Security & Immutability Notice */}
            <div
              style={{
                backgroundColor: 'rgba(234, 179, 8, 0.08)',
                border: '1px solid rgba(234, 179, 8, 0.25)',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                fontSize: '12px',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <ShieldAlert size={16} color="#eab308" />
              <span>
                <strong>Immutable Audit Guarantee:</strong> This audit event is permanently recorded in append-only PostgreSQL storage and cannot be altered or deleted.
              </span>
            </div>
          </div>
        )}
      </DetailDrawer>
    </div>
  );
};

export default AuditLogs;
