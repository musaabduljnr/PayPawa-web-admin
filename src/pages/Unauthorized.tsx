import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, LogOut } from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';

export const Unauthorized: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, staffProfile, isAuthenticated } = useAdminAuth();

  const state = (location.state as any) || {};
  const reason = state.reason || 'UNAUTHORIZED';
  const permission = state.permission;

  let title = 'Access Denied';
  let message = 'You do not have administrative authorization to access this section of the PayPawa operations platform.';

  if (reason === 'NOT_STAFF') {
    title = 'Customer Account Detected';
    message = 'Your authenticated account is a customer account. The PayPawa Operations Portal is strictly reserved for verified internal personnel.';
  } else if (reason === 'SUSPENDED' || reason === 'DISABLED') {
    title = `Staff Account ${reason === 'SUSPENDED' ? 'Suspended' : 'Disabled'}`;
    message = `Your staff profile status is currently marked as ${reason}. All privileged operations have been automatically restricted. Please contact a Super Administrator.`;
  } else if (reason === 'PERMISSION_DENIED') {
    title = 'Restricted Permission';
    message = `Your assigned role (${staffProfile?.roleDisplayName || staffProfile?.role}) lacks the required platform capability: "${permission}".`;
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0B0F17',
        padding: '24px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          backgroundColor: '#111827',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '16px',
          padding: '36px 32px',
          textAlign: 'center',
          boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
        }}
      >
        <div
          style={{
            width: '56px',
            height: '56px',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px auto',
            color: '#EF4444',
          }}
        >
          <ShieldAlert size={32} />
        </div>

        <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#F8FAFC', letterSpacing: '-0.02em', marginBottom: '8px' }}>
          {title}
        </h1>

        <p style={{ fontSize: '13.5px', color: '#94A3B8', lineHeight: 1.5, marginBottom: '28px' }}>
          {message}
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          {isAuthenticated && (
            <button
              onClick={() => navigate('/')}
              className="btn btn-secondary"
            >
              <ArrowLeft size={16} />
              <span>Return to Dashboard</span>
            </button>
          )}

          <button
            onClick={() => signOut().then(() => navigate('/login'))}
            className="btn btn-danger"
          >
            <LogOut size={16} />
            <span>Switch Account</span>
          </button>
        </div>
      </div>
    </div>
  );
};
