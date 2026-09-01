import React, { useState } from 'react';
import { Search, Bell, LogOut, ShieldCheck, User } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { Badge } from '../common/Badge';

export const Topbar: React.FC = () => {
  const { staffProfile, signOut } = useAdminAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="admin-topbar">
      {/* Search Placeholder */}
      <div className="topbar-search-box">
        <Search size={16} color="#64748B" />
        <input
          type="text"
          className="topbar-search-input"
          placeholder="Global search (Meters, Txs, Customers)..."
          disabled
        />
      </div>

      {/* Topbar Actions */}
      <div className="topbar-actions">
        {/* Environment Pill */}
        <Badge variant="active" className="hidden sm:inline-flex">
          <ShieldCheck size={12} style={{ marginRight: '4px' }} />
          Operations Portal
        </Badge>

        {/* Notifications Icon Placeholder */}
        <button
          className="icon-button"
          title="Notifications"
          onClick={() => alert('Notifications drawer will be available in Phase 10B.')}
        >
          <Bell size={18} />
          <span className="notification-dot" />
        </button>

        {/* Staff Quick Menu */}
        <div style={{ position: 'relative' }}>
          <button
            className="icon-button"
            style={{ width: 'auto', padding: '0 12px', gap: '8px' }}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <User size={16} />
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#F8FAFC' }}>
              {staffProfile?.roleDisplayName || staffProfile?.role}
            </span>
          </button>

          {menuOpen && (
            <div
              style={{
                position: 'absolute',
                top: '46px',
                right: 0,
                width: '220px',
                backgroundColor: '#141C2B',
                border: '1px solid #334155',
                borderRadius: '10px',
                padding: '8px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                zIndex: 50,
              }}
            >
              <div style={{ padding: '8px 10px', borderBottom: '1px solid #1E293B', marginBottom: '6px' }}>
                <p style={{ fontSize: '13px', fontWeight: 600, color: '#F8FAFC' }}>
                  {staffProfile?.fullName || 'Staff User'}
                </p>
                <p style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>{staffProfile?.email}</p>
              </div>

              <button
                onClick={() => {
                  setMenuOpen(false);
                  signOut();
                }}
                className="btn btn-danger"
                style={{ width: '100%', padding: '7px 10px', fontSize: '12px', justifyContent: 'flex-start' }}
              >
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
