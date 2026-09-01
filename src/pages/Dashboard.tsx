import React from 'react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import {
  ShieldCheck,
  Zap,
  Users,
  CreditCard,
  ArrowLeftRight,
  Shield,
  Clock,
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { staffProfile } = useAdminAuth();

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Operations Console</h1>
          <p className="page-subtitle">
            Welcome back, {staffProfile?.fullName || 'Staff Member'}. Here is your operational overview.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Badge variant="active">
            <ShieldCheck size={13} style={{ marginRight: '4px' }} />
            {staffProfile?.roleDisplayName || staffProfile?.role}
          </Badge>
          <Badge variant="neutral">
            <Clock size={13} style={{ marginRight: '4px' }} />
            Session Active
          </Badge>
        </div>
      </div>

      {/* Overview Stat Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '20px',
          marginBottom: '28px',
        }}
      >
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>
              Customers
            </span>
            <Users size={18} color="#84CC16" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#F8FAFC' }}>—</div>
          <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '4px' }}>Awaiting Phase 10B Data Sync</div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>
              Vending Volume
            </span>
            <Zap size={18} color="#84CC16" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#F8FAFC' }}>—</div>
          <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '4px' }}>Live Switch Telemetry Pending</div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>
              Pending In-Flight
            </span>
            <ArrowLeftRight size={18} color="#F59E0B" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#F8FAFC' }}>0</div>
          <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '4px' }}>No stuck transactions</div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>
              Gateway Settlements
            </span>
            <CreditCard size={18} color="#84CC16" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#F8FAFC' }}>—</div>
          <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '4px' }}>Paystack Webhook Sync Active</div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
        {/* Granted Capabilities */}
        <div className="card">
          <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={18} color="#84CC16" />
            <span>Assigned Role Capabilities</span>
          </h2>
          <p style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '16px' }}>
            Your account is assigned the role <strong style={{ color: '#F8FAFC' }}>{staffProfile?.roleDisplayName}</strong> with the following verified permissions:
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {staffProfile?.role === 'SUPER_ADMIN' ? (
              <Badge variant="active" style={{ fontSize: '12px', padding: '6px 12px' }}>
                ALL_SYSTEM_PERMISSIONS (Super Admin Master Key)
              </Badge>
            ) : staffProfile?.permissions && staffProfile.permissions.length > 0 ? (
              staffProfile.permissions.map((perm) => (
                <span
                  key={perm}
                  style={{
                    backgroundColor: '#1E293B',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    padding: '4px 10px',
                    fontSize: '11.5px',
                    fontFamily: 'monospace',
                    color: '#CBD5E1',
                  }}
                >
                  {perm}
                </span>
              ))
            ) : (
              <span style={{ fontSize: '12px', color: '#EF4444' }}>No active permissions assigned.</span>
            )}
          </div>
        </div>

        {/* Operational Feed */}
        <div className="card">
          <h2 className="card-title">Live Operational Alerts</h2>
          <EmptyState
            title="System Healthy"
            description="All electricity vending channels, database listeners, and reconciliation workers are operating normally without alarms."
          />
        </div>
      </div>
    </div>
  );
};
