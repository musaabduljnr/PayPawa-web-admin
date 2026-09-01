import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Bot,
  Bell,
  Shield,
  Flag,
  Globe,
  Lock,
  RotateCcw,
  Info,
} from 'lucide-react';
import {
  AdminOperationsService,
  SettingCategory,
  SystemSettingItem,
} from '../../services/admin-operations.service';
import { PermissionGate } from '../../components/common/PermissionGate';

export const Settings: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<SettingCategory>('GENERAL');
  const [settings, setSettings] = useState<SystemSettingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state tracking
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [dirtyKeys, setDirtyKeys] = useState<Set<string>>(new Set());
  const [saveReason, setSaveReason] = useState('');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await AdminOperationsService.getSystemSettings('ALL');
      if (res.success) {
        setSettings(res.data);
        const initialForm: Record<string, any> = {};
        res.data.forEach((s) => {
          initialForm[s.key] = s.value;
        });
        setFormValues(initialForm);
        setDirtyKeys(new Set());
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleFieldChange = (key: string, value: any) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
    setDirtyKeys((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (dirtyKeys.size === 0) return;

    setSaving(true);
    setActionError(null);
    setActionSuccess(null);

    const batchToSave: Record<string, any> = {};
    dirtyKeys.forEach((key) => {
      batchToSave[key] = formValues[key];
    });

    try {
      const res = await AdminOperationsService.updateSystemSettings(
        batchToSave,
        saveReason.trim() || 'Administrator settings update'
      );

      if (res.success) {
        setActionSuccess(`Successfully saved and audited ${res.updated_count} system configuration parameters.`);
        setDirtyKeys(new Set());
        setSaveReason('');
        await fetchSettings();
      } else {
        setActionError(res.error || 'Failed to save system settings');
      }
    } finally {
      setSaving(false);
    }
  };

  const currentCategorySettings = settings.filter((s) => s.category === activeCategory);

  const getCategoryIcon = (cat: SettingCategory) => {
    switch (cat) {
      case 'GENERAL':
        return <Globe size={16} />;
      case 'PROVIDERS':
        return <Zap size={16} />;
      case 'AI':
        return <Bot size={16} />;
      case 'NOTIFICATIONS':
        return <Bell size={16} />;
      case 'SECURITY':
        return <Shield size={16} />;
      case 'FEATURE_FLAGS':
        return <Flag size={16} />;
    }
  };

  const renderFieldInput = (s: SystemSettingItem) => {
    const currentValue = formValues[s.key] !== undefined ? formValues[s.key] : s.value;
    const isDirty = dirtyKeys.has(s.key);

    // 1. Boolean Toggle Fields
    if (typeof s.value === 'boolean' || s.key.includes('ENABLE') || s.key.includes('MODE') || s.key.includes('2FA') || s.key.includes('REQUIRE')) {
      const boolVal = Boolean(currentValue);

      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            onClick={() => handleFieldChange(s.key, !boolVal)}
            style={{
              width: '44px',
              height: '24px',
              borderRadius: '12px',
              backgroundColor: boolVal ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
              border: '1px solid var(--border-default)',
              position: 'relative',
              cursor: 'pointer',
              transition: 'background-color 0.2s ease',
              padding: 0,
            }}
          >
            <div
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                backgroundColor: '#ffffff',
                position: 'absolute',
                top: '2px',
                left: boolVal ? '22px' : '2px',
                transition: 'left 0.2s ease',
              }}
            />
          </button>
          <span style={{ fontSize: '13px', fontWeight: 600, color: boolVal ? '#10b981' : 'var(--text-muted)' }}>
            {boolVal ? 'ENABLED' : 'DISABLED'}
          </span>
          {isDirty && (
            <span style={{ fontSize: '11px', color: '#eab308', fontWeight: 600 }}>• Modified</span>
          )}
        </div>
      );
    }

    // 2. Select Fields
    if (s.key === 'GEMINI_MODEL') {
      return (
        <select
          value={String(currentValue)}
          onChange={(e) => handleFieldChange(s.key, e.target.value)}
          style={{
            width: '100%',
            maxWidth: '360px',
            height: '38px',
            padding: '0 12px',
            backgroundColor: 'var(--bg-input)',
            border: isDirty ? '1px solid #eab308' : '1px solid var(--border-default)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-primary)',
            fontSize: '13px',
          }}
        >
          <option value="gemini-3.5-flash">gemini-3.5-flash (Fast, Default)</option>
          <option value="gemini-1.5-pro">gemini-1.5-pro (High Reasoning)</option>
          <option value="gemini-1.5-flash">gemini-1.5-flash (Standard)</option>
        </select>
      );
    }

    if (s.key === 'DEFAULT_VENDING_PROVIDER') {
      return (
        <select
          value={String(currentValue)}
          onChange={(e) => handleFieldChange(s.key, e.target.value)}
          style={{
            width: '100%',
            maxWidth: '360px',
            height: '38px',
            padding: '0 12px',
            backgroundColor: 'var(--bg-input)',
            border: isDirty ? '1px solid #eab308' : '1px solid var(--border-default)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-primary)',
            fontSize: '13px',
          }}
        >
          <option value="vtpass">VTpass Utility Switch (Live/Sandbox)</option>
        </select>
      );
    }

    if (s.key === 'DEFAULT_PAYMENT_GATEWAY') {
      return (
        <select
          value={String(currentValue)}
          onChange={(e) => handleFieldChange(s.key, e.target.value)}
          style={{
            width: '100%',
            maxWidth: '360px',
            height: '38px',
            padding: '0 12px',
            backgroundColor: 'var(--bg-input)',
            border: isDirty ? '1px solid #eab308' : '1px solid var(--border-default)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-primary)',
            fontSize: '13px',
          }}
        >
          <option value="paystack">Paystack (Cards & Bank Transfers)</option>
          <option value="monnify">Monnify (Dynamic Accounts)</option>
        </select>
      );
    }

    // 3. Number Input Fields
    if (typeof s.value === 'number' || s.key.includes('TIMEOUT') || s.key.includes('LIMIT') || s.key.includes('RETRIES') || s.key.includes('TEMPERATURE')) {
      return (
        <input
          type="number"
          step={s.key.includes('TEMPERATURE') ? '0.1' : '1'}
          value={currentValue !== undefined ? currentValue : ''}
          onChange={(e) => handleFieldChange(s.key, Number(e.target.value))}
          style={{
            width: '100%',
            maxWidth: '360px',
            height: '38px',
            padding: '0 12px',
            backgroundColor: 'var(--bg-input)',
            border: isDirty ? '1px solid #eab308' : '1px solid var(--border-default)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-primary)',
            fontSize: '13px',
          }}
        />
      );
    }

    // 4. Default String Input
    return (
      <input
        type="text"
        value={String(currentValue || '')}
        onChange={(e) => handleFieldChange(s.key, e.target.value)}
        style={{
          width: '100%',
          maxWidth: '460px',
          height: '38px',
          padding: '0 12px',
          backgroundColor: 'var(--bg-input)',
          border: isDirty ? '1px solid #eab308' : '1px solid var(--border-default)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--text-primary)',
          fontSize: '13px',
        }}
      />
    );
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Platform Configuration & System Settings</h1>
          <p className="page-subtitle">
            Global parameters, provider timeouts, AI engine guardrails, notifications, security, and feature flags.
          </p>
        </div>

        <PermissionGate permission="settings.manage">
          <div style={{ display: 'flex', gap: '10px' }}>
            {dirtyKeys.size > 0 && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  const initial: Record<string, any> = {};
                  settings.forEach((s) => {
                    initial[s.key] = s.value;
                  });
                  setFormValues(initial);
                  setDirtyKeys(new Set());
                }}
              >
                <RotateCcw size={14} />
                <span>Discard Changes</span>
              </button>
            )}

            <button
              className="btn btn-primary"
              onClick={handleSaveSettings}
              disabled={saving || dirtyKeys.size === 0}
            >
              <Save size={16} className={saving ? 'animate-spin' : ''} />
              <span>{saving ? 'Saving...' : `Save ${dirtyKeys.size > 0 ? `(${dirtyKeys.size})` : ''}`}</span>
            </button>
          </div>
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

      {/* CATEGORY TABS */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid var(--border-subtle)',
          marginBottom: '24px',
          overflowX: 'auto',
          paddingBottom: '8px',
        }}
      >
        {(['GENERAL', 'PROVIDERS', 'AI', 'NOTIFICATIONS', 'SECURITY', 'FEATURE_FLAGS'] as SettingCategory[]).map((cat) => {
          const isActive = activeCategory === cat;
          const catDirtyCount = settings.filter((s) => s.category === cat && dirtyKeys.has(s.key)).length;

          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: isActive ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                color: isActive ? '#ffffff' : 'var(--text-secondary)',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '13px',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              {getCategoryIcon(cat)}
              <span>{cat.replace('_', ' ')}</span>
              {catDirtyCount > 0 && (
                <span
                  style={{
                    backgroundColor: isActive ? '#ffffff' : '#eab308',
                    color: isActive ? 'var(--accent-primary)' : '#000000',
                    fontSize: '10px',
                    padding: '1px 5px',
                    borderRadius: '10px',
                    fontWeight: 700,
                  }}
                >
                  {catDirtyCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* SETTINGS CARD */}
      <div className="card" style={{ padding: '24px' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px', display: 'block' }} />
            Loading settings...
          </div>
        ) : (
          <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {currentCategorySettings.map((s) => (
                <div
                  key={s.key}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    paddingBottom: '16px',
                    borderBottom: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <label style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                      {s.key}
                    </label>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Updated: {new Date(s.updated_at).toLocaleDateString()}
                    </span>
                  </div>

                  {s.description && (
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 6px' }}>
                      {s.description}
                    </p>
                  )}

                  <div>{renderFieldInput(s)}</div>
                </div>
              ))}
            </div>

            {/* Change Justification / Reason */}
            {dirtyKeys.size > 0 && (
              <div
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                  Operational Justification (Mandatory for Immutable Audit Trail):
                </label>
                <input
                  type="text"
                  placeholder="Explain why this configuration is being changed..."
                  value={saveReason}
                  onChange={(e) => setSaveReason(e.target.value)}
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
                />
              </div>
            )}

            {/* Save Button */}
            <PermissionGate permission="settings.manage">
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '10px' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving || dirtyKeys.size === 0}
                  style={{ minWidth: '140px' }}
                >
                  <Save size={16} />
                  <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
                </button>
              </div>
            </PermissionGate>
          </form>
        )}
      </div>
    </div>
  );
};

export default Settings;
