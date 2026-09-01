import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Gauge,
  ArrowLeftRight,
  CreditCard,
  Wallet,
  Headphones,
  BarChart3,
  ShieldAlert,
  Sliders,
  Zap,
  Cpu,
  UserCog,
} from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import type { PermissionKey } from '../../types/rbac';

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  permission?: PermissionKey;
}

const PRIMARY_NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/customers', label: 'Customers', icon: Users, permission: 'users.view' },
  { to: '/meters', label: 'Meters', icon: Gauge, permission: 'meters.view' },
  { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight, permission: 'transactions.view' },
  { to: '/payments', label: 'Payments', icon: CreditCard, permission: 'payments.view' },
  { to: '/wallets', label: 'Wallets', icon: Wallet, permission: 'wallets.view' },
  { to: '/support', label: 'Support', icon: Headphones, permission: 'support.view' },
  { to: '/reports', label: 'Reports', icon: BarChart3, permission: 'reports.view' },
];

const OPERATIONS_NAV_ITEMS: NavItem[] = [
  { to: '/operations/staff', label: 'Staff Directory', icon: UserCog, permission: 'staff.view' },
  { to: '/operations/audit-logs', label: 'Audit Logs', icon: ShieldAlert, permission: 'audit_logs.view' },
  { to: '/operations/integrations', label: 'Integrations', icon: Cpu, permission: 'integrations.view' },
  { to: '/operations/settings', label: 'Settings', icon: Sliders, permission: 'settings.view' },
];

export const Sidebar: React.FC = () => {
  const { staffProfile, hasPermission } = useAdminAuth();

  const filterItems = (items: NavItem[]) => {
    return items.filter((item) => {
      if (!item.permission) return true;
      return hasPermission(item.permission);
    });
  };

  const visiblePrimary = filterItems(PRIMARY_NAV_ITEMS);
  const visibleOperations = filterItems(OPERATIONS_NAV_ITEMS);

  const initials = staffProfile?.fullName
    ? staffProfile.fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'OP';

  return (
    <aside className="admin-sidebar">
      {/* Brand Header */}
      <div className="sidebar-header">
        <NavLink to="/" className="brand-badge">
          <div className="brand-icon-box">
            <Zap size={18} fill="#0B0F17" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span className="brand-name">PayPawa</span>
            <span className="portal-tag">Ops</span>
          </div>
        </NavLink>
      </div>

      {/* Nav List */}
      <div className="sidebar-nav">
        {/* General Group */}
        <div>
          <div className="nav-group-title">Platform</div>
          <ul className="nav-list">
            {visiblePrimary.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) => `nav-item-link ${isActive ? 'active' : ''}`}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Operations Group */}
        {visibleOperations.length > 0 && (
          <div>
            <div className="nav-group-title">Operations</div>
            <ul className="nav-list">
              {visibleOperations.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      className={({ isActive }) => `nav-item-link ${isActive ? 'active' : ''}`}
                    >
                      <Icon size={18} />
                      <span>{item.label}</span>
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {/* Staff User Footer */}
      <div className="sidebar-footer">
        <div className="staff-user-card">
          <div className="staff-avatar">{initials}</div>
          <div className="staff-info">
            <div className="staff-name">{staffProfile?.fullName || staffProfile?.email}</div>
            <div className="staff-role-badge">{staffProfile?.roleDisplayName || staffProfile?.role}</div>
          </div>
        </div>
      </div>
    </aside>
  );
};
