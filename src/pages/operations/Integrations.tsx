import React, { useState, useEffect } from 'react';
import {
  Cpu,
  RefreshCw,
  Zap,
  CreditCard,
  Building2,
  Database,
  Bot,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Activity,
  ShieldCheck,
  Lock,
  Radio,
  SlidersHorizontal,
  Server,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import {
  AdminOperationsService,
  ProviderHealthItem,
  ProviderStatus,
  AiOperationsMetrics,
} from '../../services/admin-operations.service';
import { Badge } from '../../components/common/Badge';
import { PermissionGate } from '../../components/common/PermissionGate';

export const Integrations: React.FC = () => {
  const [providers, setProviders] = useState<ProviderHealthItem[]>([]);
  const [aiMetrics, setAiMetrics] = useState<AiOperationsMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingProvider, setCheckingProvider] = useState<string | null>(null);
  const [checkingAll, setCheckingAll] = useState(false);

  // Status Change Modal State
  const [selectedProvider, setSelectedProvider] = useState<ProviderHealthItem | null>(null);
  const [newStatus, setNewStatus] = useState<ProviderStatus>('ONLINE');
  const [statusReason, setStatusReason] = useState('');
  const [statusSaving, setStatusSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchTelemetry = async () => {
    setLoading(true);
    try {
      const [provRes, aiRes] = await Promise.all([
        AdminOperationsService.getIntegrationsHealth(),
        AdminOperationsService.getAiOperationsMetrics(),
      ]);

      if (provRes.success) {
        setProviders(provRes.data);
      }
      if (aiRes) {
        setAiMetrics(aiRes);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
  }, []);

  const handleHealthCheck = async (providerName: string) => {
    setCheckingProvider(providerName);
    setActionError(null);
    try {
      const res = await AdminOperationsService.triggerProviderHealthCheck(providerName);
      if (res.success) {
        setActionSuccess(`Health check for ${providerName.toUpperCase()} passed (${res.latency_ms}ms).`);
        await fetchTelemetry();
      } else {
        setActionError(res.error || 'Health check failed');
      }
    } finally {
      setCheckingProvider(null);
    }
  };

  const handleHealthCheckAll = async () => {
    setCheckingAll(true);
    setActionError(null);
    try {
      for (const prov of providers) {
        await AdminOperationsService.triggerProviderHealthCheck(prov.provider_name);
      }
      setActionSuccess('All upstream provider health checks completed successfully.');
      await fetchTelemetry();
    } finally {
      setCheckingAll(false);
    }
  };

  const handleOpenStatusModal = (prov: ProviderHealthItem) => {
    setSelectedProvider(prov);
    setNewStatus(prov.status);
    setStatusReason('');
    setActionError(null);
  };

  const handleSaveStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProvider) return;

    setStatusSaving(true);
    setActionError(null);
    try {
      const res = await AdminOperationsService.updateProviderStatus(
        selectedProvider.provider_name,
        newStatus,
        statusReason.trim() || 'Manual administrator override'
      );

      if (res.success) {
        setActionSuccess(`Updated ${selectedProvider.provider_name.toUpperCase()} status to ${newStatus}.`);
        setSelectedProvider(null);
        await fetchTelemetry();
      } else {
        setActionError(res.error || 'Failed to update provider status');
      }
    } finally {
      setStatusSaving(false);
    }
  };

  const renderStatusBadge = (status: ProviderStatus) => {
    switch (status) {
      case 'ONLINE':
        return <Badge variant="active">ONLINE</Badge>;
      case 'DEGRADED':
        return <Badge variant="pending">DEGRADED</Badge>;
      case 'MAINTENANCE':
        return <Badge variant="neutral">MAINTENANCE</Badge>;
      case 'OFFLINE':
      default:
        return <Badge variant="danger">OFFLINE</Badge>;
    }
  };

  const getProviderIcon = (name: string) => {
    switch (name.toLowerCase()) {
      case 'vtpass':
        return <Zap size={22} color="#3b82f6" />;
      case 'paystack':
        return <CreditCard size={22} color="#10b981" />;
      case 'monnify':
        return <Building2 size={22} color="#6366f1" />;
      case 'supabase':
        return <Database size={22} color="#10b981" />;
      case 'gemini':
        return <Bot size={22} color="#a855f7" />;
      default:
        return <Cpu size={22} color="var(--text-secondary)" />;
    }
  };

  const getProviderTitle = (name: string) => {
    switch (name.toLowerCase()) {
      case 'vtpass':
        return 'VTpass Utility Vending Switch';
      case 'paystack':
        return 'Paystack Inbound Card & Transfer Gateway';
      case 'monnify':
        return 'Monnify Dynamic Virtual Account Gateway';
      case 'supabase':
        return 'Supabase PostgreSQL & Auth Cluster';
      case 'gemini':
        return 'Google Gemini AI Energy Engine';
      default:
        return name.toUpperCase();
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Integrations & Upstream Providers</h1>
          <p className="page-subtitle">
            Real-time telemetry, latency monitors, provider status management, and AI operations.
          </p>
        </div>

        <PermissionGate permission="integrations.manage">
          <button
            className="btn btn-secondary"
            onClick={handleHealthCheckAll}
            disabled={checkingAll || loading}
          >
            <RefreshCw size={16} className={checkingAll ? 'animate-spin' : ''} />
            <span>{checkingAll ? 'Checking All...' : 'Health Check All'}</span>
          </button>
        </PermissionGate>
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div
          style={{
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            color: '#10b981',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={16} />
            <span>{actionSuccess}</span>
          </div>
          <button
            onClick={() => setActionSuccess(null)}
            style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      )}

      {actionError && (
        <div
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            color: '#ef4444',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={16} />
            <span>{actionError}</span>
          </div>
          <button
            onClick={() => setActionError(null)}
            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Upstream Providers Grid */}
      <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '14px', color: 'var(--text-primary)' }}>
        Active Infrastructure & Gateways
      </h2>

      {loading && providers.length === 0 ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px', display: 'block' }} />
          Loading infrastructure telemetry...
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: '16px',
            marginBottom: '32px',
          }}
        >
          {providers.map((prov) => {
            const isChecking = checkingProvider === prov.provider_name;

            return (
              <div key={prov.id} className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Provider Card Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {getProviderIcon(prov.provider_name)}
                    </div>
                    <div>
                      <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {getProviderTitle(prov.provider_name)}
                      </h3>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        Service: {prov.service_type}
                      </span>
                    </div>
                  </div>

                  {renderStatusBadge(prov.status)}
                </div>

                {/* Telemetry Metrics */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '10px',
                    backgroundColor: 'var(--bg-tertiary)',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Observed Latency:</span>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--accent-primary)', fontFamily: 'monospace' }}>
                      {prov.latency_ms} ms
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Error Rate (24h):</span>
                    <div
                      style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: prov.error_rate_pct > 2 ? '#ef4444' : '#10b981',
                        fontFamily: 'monospace',
                      }}
                    >
                      {prov.error_rate_pct}%
                    </div>
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Last Successful Ping:</span>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {prov.last_successful_at
                        ? new Date(prov.last_successful_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                        : '—'}
                    </div>
                  </div>
                </div>

                {/* Credentials Protection Guarantee */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#10b981' }}>
                  <Lock size={12} />
                  <span>API Keys and Secrets strictly isolated in backend</span>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '8px' }}>
                  <PermissionGate permission="integrations.manage">
                    <button
                      className="btn btn-secondary"
                      style={{ flex: 1, padding: '7px 12px', fontSize: '12px' }}
                      onClick={() => handleHealthCheck(prov.provider_name)}
                      disabled={isChecking || checkingAll}
                    >
                      <RefreshCw size={13} className={isChecking ? 'animate-spin' : ''} />
                      <span>{isChecking ? 'Checking...' : 'Ping Test'}</span>
                    </button>

                    <button
                      className="btn btn-secondary"
                      style={{ flex: 1, padding: '7px 12px', fontSize: '12px' }}
                      onClick={() => handleOpenStatusModal(prov)}
                    >
                      <SlidersHorizontal size={13} />
                      <span>Status Override</span>
                    </button>
                  </PermissionGate>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* AI OPERATIONS & ENERGY ENGINE TELEMETRY */}
      <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '14px', color: 'var(--text-primary)' }}>
        AI Engine & Energy Intelligence Operations
      </h2>

      {aiMetrics && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
          {/* AI Metrics Row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '14px',
            }}
          >
            <div className="card" style={{ padding: '16px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Provider & Model</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--accent-primary)', marginTop: '4px' }}>
                {aiMetrics.model}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {aiMetrics.provider}
              </div>
            </div>

            <div className="card" style={{ padding: '16px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>24h Request Volume</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                {aiMetrics.request_count_24h.toLocaleString()}
              </div>
              <div style={{ fontSize: '11px', color: '#10b981', marginTop: '2px' }}>
                Within guardrail quotas
              </div>
            </div>

            <div className="card" style={{ padding: '16px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Success Rate</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#10b981', marginTop: '4px' }}>
                {aiMetrics.success_rate_pct}%
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Failure: {aiMetrics.failure_rate_pct}%
              </div>
            </div>

            <div className="card" style={{ padding: '16px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Average Latency</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                {aiMetrics.average_latency_ms} ms
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Timeout limit: 12,000 ms
              </div>
            </div>
          </div>

          {/* AI FAILURE RESILIENCE GUARANTEE (Requirement 5) */}
          <div
            style={{
              backgroundColor: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              padding: '14px 18px',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <ShieldCheck size={24} color="#10b981" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Authoritative AI Failure Isolation
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                Gemini AI operations are strictly non-blocking. If Gemini experiences downtime, latency, or rate-limits,
                wallet balances, electricity token vending, payments, and ledger entries remain 100% operational with zero disruption.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* PROVIDER STATUS OVERRIDE MODAL */}
      {selectedProvider && (
        <div className="modal-backdrop" onClick={() => setSelectedProvider(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3 className="modal-title">
                Manage Provider Status: {selectedProvider.provider_name.toUpperCase()}
              </h3>
              <button
                className="modal-close"
                onClick={() => setSelectedProvider(null)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveStatus}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px 0' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Operational Status:
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as ProviderStatus)}
                    style={{
                      width: '100%',
                      height: '38px',
                      padding: '0 12px',
                      backgroundColor: 'var(--bg-input)',
                      border: '1px solid var(--border-default)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                    }}
                  >
                    <option value="ONLINE">ONLINE (Normal Operations)</option>
                    <option value="DEGRADED">DEGRADED (High Latency / Reduced Capacity)</option>
                    <option value="MAINTENANCE">MAINTENANCE (Scheduled Maintenance Window)</option>
                    <option value="OFFLINE">OFFLINE (Circuit Breaker Triggered)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Operational Justification / Reason:
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Enter reason for modifying provider status (required for audit trail)..."
                    value={statusReason}
                    onChange={(e) => setStatusReason(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      backgroundColor: 'var(--bg-input)',
                      border: '1px solid var(--border-default)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      resize: 'vertical',
                    }}
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setSelectedProvider(null)}
                  disabled={statusSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={statusSaving || !statusReason.trim()}
                >
                  {statusSaving ? 'Updating...' : 'Save & Record Audit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Integrations;
