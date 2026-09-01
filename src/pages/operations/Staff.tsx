import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Search,
  RefreshCw,
  Plus,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserX,
  Lock,
  Activity,
  CheckCircle2,
  AlertTriangle,
  SlidersHorizontal,
  ArrowRight,
  Eye,
  KeyRound,
  FileCheck,
  Clock,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import {
  AdminStaffService,
  StaffListItem,
  RoleWithPermissions,
  PermissionItem,
  GovernanceApprovalItem,
  StaffActivityItem,
} from '../../services/admin-staff.service';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { Pagination } from '../../components/common/Pagination';
import { DetailDrawer } from '../../components/common/DetailDrawer';
import { EmptyState } from '../../components/common/EmptyState';
import { Badge } from '../../components/common/Badge';
import { PermissionGate } from '../../components/common/PermissionGate';
import type { StaffRole, StaffStatus, PermissionKey } from '../../types/rbac';

export const Staff: React.FC = () => {
  const { staffProfile } = useAdminAuth();

  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'directory' | 'roles' | 'dualControl'>('directory');

  // Staff Directory State
  const [staffList, setStaffList] = useState<StaffListItem[]>([]);
  const [totalStaff, setTotalStaff] = useState(0);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [offset, setOffset] = useState(0);
  const limit = 15;

  // Roles & Permissions State
  const [roles, setRoles] = useState<RoleWithPermissions[]>([]);
  const [allPermissions, setAllPermissions] = useState<PermissionItem[]>([]);
  const [selectedRole, setSelectedRole] = useState<RoleWithPermissions | null>(null);
  const [selectedRolePerms, setSelectedRolePerms] = useState<Set<PermissionKey>>(new Set());
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [roleSaveSuccess, setRoleSaveSuccess] = useState<string | null>(null);
  const [roleSaveError, setRoleSaveError] = useState<string | null>(null);

  // Dual-Control Governance Queue State
  const [approvals, setApprovals] = useState<GovernanceApprovalItem[]>([]);
  const [loadingApprovals, setLoadingApprovals] = useState(false);
  const [decisionModalApproval, setDecisionModalApproval] = useState<GovernanceApprovalItem | null>(null);
  const [decisionType, setDecisionType] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [decisionNotes, setDecisionNotes] = useState('');
  const [submittingDecision, setSubmittingDecision] = useState(false);
  const [decisionError, setDecisionError] = useState<string | null>(null);

  // Create / Invite Staff Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createRoleId, setCreateRoleId] = useState('');
  const [createStatus, setCreateStatus] = useState<StaffStatus>('ACTIVE');
  const [creatingStaff, setCreatingStaff] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit Role Modal State
  const [editRoleModalStaff, setEditRoleModalStaff] = useState<StaffListItem | null>(null);
  const [newRoleId, setNewRoleId] = useState('');
  const [roleChangeReason, setRoleChangeReason] = useState('');
  const [updatingRole, setUpdatingRole] = useState(false);
  const [roleUpdateError, setRoleUpdateError] = useState<string | null>(null);
  const [roleUpdateNotice, setRoleUpdateNotice] = useState<string | null>(null);

  // Change Status Modal State
  const [statusModalStaff, setStatusModalStaff] = useState<StaffListItem | null>(null);
  const [targetStatus, setTargetStatus] = useState<StaffStatus>('ACTIVE');
  const [statusChangeReason, setStatusChangeReason] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusUpdateError, setStatusUpdateError] = useState<string | null>(null);

  // Staff Activity Drawer State
  const [activityStaff, setActivityStaff] = useState<StaffListItem | null>(null);
  const [staffActivity, setStaffActivity] = useState<StaffActivityItem[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);

  // 1. Fetch Staff Directory
  const fetchStaff = useCallback(async () => {
    setLoadingStaff(true);
    try {
      const res = await AdminStaffService.listStaff({
        search: search.trim(),
        role: roleFilter,
        status: statusFilter,
        limit,
        offset,
      });
      if (res.success) {
        setStaffList(res.data);
        setTotalStaff(res.total);
      }
    } finally {
      setLoadingStaff(false);
    }
  }, [search, roleFilter, statusFilter, offset]);

  // 2. Fetch Roles & Permissions
  const fetchRolesAndPermissions = useCallback(async () => {
    setLoadingRoles(true);
    try {
      const res = await AdminStaffService.listRolesAndPermissions();
      if (res.success) {
        setRoles(res.roles);
        setAllPermissions(res.permissions);
        if (res.roles.length > 0 && !selectedRole) {
          setSelectedRole(res.roles[0]);
          setSelectedRolePerms(new Set(res.roles[0].permission_keys));
        }
      }
    } finally {
      setLoadingRoles(false);
    }
  }, [selectedRole]);

  // 3. Fetch Dual-Control Approvals
  const fetchGovernanceApprovals = useCallback(async () => {
    setLoadingApprovals(true);
    try {
      const res = await AdminStaffService.listGovernanceApprovals();
      if (res.success) {
        setApprovals(res.data);
      }
    } finally {
      setLoadingApprovals(false);
    }
  }, []);

  useEffect(() => {
    fetchStaff();
    fetchRolesAndPermissions();
    fetchGovernanceApprovals();
  }, [fetchStaff, fetchRolesAndPermissions, fetchGovernanceApprovals]);

  // Handle Select Role for Permission Matrix
  const handleSelectRole = (role: RoleWithPermissions) => {
    setSelectedRole(role);
    setSelectedRolePerms(new Set(role.permission_keys));
    setRoleSaveSuccess(null);
    setRoleSaveError(null);
  };

  // Toggle permission in local state
  const handleTogglePermission = (key: PermissionKey) => {
    if (!selectedRole || selectedRole.name === 'SUPER_ADMIN') return;
    const next = new Set(selectedRolePerms);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setSelectedRolePerms(next);
  };

  // Save updated permissions for selected role
  const handleSaveRolePermissions = async () => {
    if (!selectedRole) return;
    setSavingPermissions(true);
    setRoleSaveError(null);
    setRoleSaveSuccess(null);
    try {
      const res = await AdminStaffService.updateRolePermissions(
        selectedRole.id,
        Array.from(selectedRolePerms)
      );
      if (res.success) {
        setRoleSaveSuccess(`Permissions for ${selectedRole.display_name} updated successfully.`);
        fetchRolesAndPermissions();
        fetchStaff();
      } else {
        setRoleSaveError(res.error || 'Failed to update permissions.');
      }
    } finally {
      setSavingPermissions(false);
    }
  };

  // Open Activity Drawer
  const handleOpenActivity = async (staff: StaffListItem) => {
    setActivityStaff(staff);
    setLoadingActivity(true);
    try {
      const res = await AdminStaffService.getStaffActivity(staff.id, 25);
      if (res.success) {
        setStaffActivity(res.activity);
      }
    } finally {
      setLoadingActivity(false);
    }
  };

  // Handle Create Staff Submit
  const handleCreateStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim()) {
      setCreateError('Please enter the full name.');
      return;
    }
    if (!createEmail.trim()) {
      setCreateError('Please enter a valid work email.');
      return;
    }
    if (!createRoleId) {
      setCreateError('Please assign a platform role.');
      return;
    }

    setCreateError(null);
    setCreatingStaff(true);
    try {
      const res = await AdminStaffService.createStaff({
        name: createName.trim(),
        email: createEmail.trim(),
        roleId: createRoleId,
        initialStatus: createStatus,
      });

      if (res.success) {
        setCreateModalOpen(false);
        setCreateName('');
        setCreateEmail('');
        setCreateRoleId('');
        fetchStaff();
        fetchRolesAndPermissions();
      } else {
        setCreateError(res.error || 'Failed to create staff account.');
      }
    } finally {
      setCreatingStaff(false);
    }
  };

  // Handle Edit Role Submit (with Dual Control Check)
  const handleUpdateRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRoleModalStaff || !newRoleId) return;

    setUpdatingRole(true);
    setRoleUpdateError(null);
    setRoleUpdateNotice(null);

    try {
      const res = await AdminStaffService.updateStaffRole(
        editRoleModalStaff.id,
        newRoleId,
        roleChangeReason.trim() || undefined
      );

      if (res.success) {
        if (res.requires_dual_control) {
          setRoleUpdateNotice(
            res.message ||
              'Super Admin elevation requires Dual-Control (Four-Eyes) approval from a second administrator.'
          );
          fetchGovernanceApprovals();
        } else {
          setEditRoleModalStaff(null);
          setNewRoleId('');
          setRoleChangeReason('');
          fetchStaff();
          fetchRolesAndPermissions();
        }
      } else {
        setRoleUpdateError(res.error || 'Failed to update staff role.');
      }
    } finally {
      setUpdatingRole(false);
    }
  };

  // Handle Update Status Submit
  const handleUpdateStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusModalStaff) return;

    setUpdatingStatus(true);
    setStatusUpdateError(null);
    try {
      const res = await AdminStaffService.updateStaffStatus(
        statusModalStaff.id,
        targetStatus,
        statusChangeReason.trim() || undefined
      );

      if (res.success) {
        setStatusModalStaff(null);
        setStatusChangeReason('');
        fetchStaff();
      } else {
        setStatusUpdateError(res.error || 'Failed to update staff status.');
      }
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Handle Dual Control Decision Submit
  const handleDecisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!decisionModalApproval) return;

    setSubmittingDecision(true);
    setDecisionError(null);
    try {
      const res = await AdminStaffService.decideGovernanceAction(
        decisionModalApproval.id,
        decisionType,
        decisionNotes.trim() || undefined
      );

      if (res.success) {
        setDecisionModalApproval(null);
        setDecisionNotes('');
        fetchGovernanceApprovals();
        fetchStaff();
        fetchRolesAndPermissions();
      } else {
        setDecisionError(res.error || 'Failed to process governance decision.');
      }
    } finally {
      setSubmittingDecision(false);
    }
  };

  // Group permissions cleanly by module
  const permissionModules = Array.from(new Set(allPermissions.map((p) => p.module)));

  const renderStatusBadge = (status: StaffStatus) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="active">ACTIVE</Badge>;
      case 'SUSPENDED':
        return <Badge variant="pending">SUSPENDED</Badge>;
      case 'DISABLED':
      default:
        return <Badge variant="danger">DISABLED</Badge>;
    }
  };

  const renderRoleBadge = (roleName: StaffRole, displayName: string) => {
    if (roleName === 'SUPER_ADMIN') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 8px',
            borderRadius: '4px',
            backgroundColor: 'rgba(234, 179, 8, 0.15)',
            color: '#eab308',
            border: '1px solid rgba(234, 179, 8, 0.3)',
            fontSize: '11px',
            fontWeight: 700,
          }}
        >
          <Shield size={11} />
          {displayName}
        </span>
      );
    }
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '2px 8px',
          borderRadius: '4px',
          backgroundColor: 'var(--bg-tertiary)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-subtle)',
          fontSize: '11px',
          fontWeight: 600,
        }}
      >
        {displayName}
      </span>
    );
  };

  const pendingApprovalsCount = approvals.filter((a) => a.status === 'PENDING').length;

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Staff Management & RBAC Governance</h1>
          <p className="page-subtitle">
            Directory, role assignments, modular permission controls, and dual-control approvals.
          </p>
        </div>

        <PermissionGate permission="staff.manage">
          <button className="btn btn-primary" onClick={() => setCreateModalOpen(true)}>
            <Plus size={16} />
            Invite Staff Member
          </button>
        </PermissionGate>
      </div>

      {/* Main Tab Navigation */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-subtle)',
          marginBottom: '20px',
          gap: '8px',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('directory')}
          style={{
            padding: '10px 18px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'directory' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            color: activeTab === 'directory' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'directory' ? 600 : 400,
            fontSize: '13.5px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Users size={16} />
          Staff Directory ({totalStaff})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('roles')}
          style={{
            padding: '10px 18px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'roles' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            color: activeTab === 'roles' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'roles' ? 600 : 400,
            fontSize: '13.5px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <KeyRound size={16} />
          Roles & Permissions ({roles.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('dualControl')}
          style={{
            padding: '10px 18px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'dualControl' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            color: activeTab === 'dualControl' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'dualControl' ? 600 : 400,
            fontSize: '13.5px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <FileCheck size={16} />
          Dual-Control Approvals
          {pendingApprovalsCount > 0 && (
            <span
              style={{
                backgroundColor: '#ef4444',
                color: '#fff',
                fontSize: '10px',
                fontWeight: 700,
                padding: '1px 6px',
                borderRadius: '10px',
              }}
            >
              {pendingApprovalsCount}
            </span>
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: STAFF DIRECTORY */}
      {/* ========================================================================= */}
      {activeTab === 'directory' && (
        <div>
          {/* Filters & Search */}
          <div className="card" style={{ marginBottom: '20px', padding: '16px 20px' }}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setOffset(0);
                fetchStaff();
              }}
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '12px',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ position: 'relative', flex: '1 1 260px', minWidth: '220px' }}>
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
                  placeholder="Search staff name or email..."
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

              {/* Role Filter */}
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
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
                <option value="ALL">All Roles</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.name}>
                    {r.display_name}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
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
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="SUSPENDED">SUSPENDED</option>
                <option value="DISABLED">DISABLED</option>
              </select>

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
                    setRoleFilter('ALL');
                    setStatusFilter('ALL');
                    setOffset(0);
                    fetchStaff();
                  }}
                  title="Reset Filters"
                >
                  <RefreshCw size={14} className={loadingStaff ? 'animate-spin' : ''} />
                </button>
              </div>
            </form>
          </div>

          {/* Staff Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {loadingStaff && staffList.length === 0 ? (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px', display: 'block' }} />
                Loading staff directory...
              </div>
            ) : staffList.length === 0 ? (
              <div style={{ padding: '40px 20px' }}>
                <EmptyState
                  icon={Users}
                  title="No Staff Members Found"
                  description="No staff records matched the specified search and filter criteria."
                />
              </div>
            ) : (
              <div className="table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Staff Member</th>
                      <th>Email</th>
                      <th>Assigned Role</th>
                      <th>Status</th>
                      <th>Last Login</th>
                      <th>Created</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffList.map((s) => {
                      const isSelf = staffProfile?.userId === s.user_id;
                      return (
                        <tr key={s.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '50%',
                                  backgroundColor: 'var(--bg-tertiary)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: 'var(--accent-primary)',
                                  fontWeight: 700,
                                  fontSize: '12px',
                                }}
                              >
                                {s.full_name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                  {s.full_name}
                                  {isSelf && (
                                    <span
                                      style={{
                                        marginLeft: '6px',
                                        fontSize: '10px',
                                        padding: '1px 6px',
                                        borderRadius: '4px',
                                        backgroundColor: 'var(--accent-soft)',
                                        color: 'var(--accent-primary)',
                                      }}
                                    >
                                      YOU
                                    </span>
                                  )}
                                </div>
                                {s.phone && (
                                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{s.phone}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td style={{ color: 'var(--text-secondary)' }}>{s.email}</td>
                          <td>{renderRoleBadge(s.role, s.role_display_name)}</td>
                          <td>{renderStatusBadge(s.status)}</td>
                          <td>
                            {s.last_login_at ? (
                              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                {new Date(s.last_login_at).toLocaleDateString()}
                              </div>
                            ) : (
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                Never
                              </span>
                            )}
                          </td>
                          <td>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                              {new Date(s.created_at).toLocaleDateString()}
                            </div>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                              {/* Activity button */}
                              <button
                                className="btn btn-secondary"
                                style={{ padding: '5px 10px', fontSize: '11.5px' }}
                                onClick={() => handleOpenActivity(s)}
                                title="View staff activity & audit trail"
                              >
                                <Activity size={13} />
                                Activity
                              </button>

                              {/* Edit Role (with Self-Escalation protection) */}
                              <PermissionGate permission="staff.manage">
                                {isSelf ? (
                                  <button
                                    className="btn btn-secondary"
                                    style={{
                                      padding: '5px 10px',
                                      fontSize: '11.5px',
                                      opacity: 0.5,
                                      cursor: 'not-allowed',
                                    }}
                                    disabled
                                    title="Self-escalation protection: You cannot modify your own role."
                                  >
                                    <Lock size={12} />
                                    Role
                                  </button>
                                ) : (
                                  <button
                                    className="btn btn-secondary"
                                    style={{ padding: '5px 10px', fontSize: '11.5px' }}
                                    onClick={() => {
                                      setEditRoleModalStaff(s);
                                      setNewRoleId(s.role_id);
                                      setRoleChangeReason('');
                                      setRoleUpdateError(null);
                                      setRoleUpdateNotice(null);
                                    }}
                                    title="Change role assignment"
                                  >
                                    Role
                                  </button>
                                )}

                                {/* Status button */}
                                {isSelf ? (
                                  <button
                                    className="btn btn-secondary"
                                    style={{
                                      padding: '5px 10px',
                                      fontSize: '11.5px',
                                      opacity: 0.5,
                                      cursor: 'not-allowed',
                                    }}
                                    disabled
                                    title="Self-modification protection: You cannot modify your own status."
                                  >
                                    <Lock size={12} />
                                    Status
                                  </button>
                                ) : (
                                  <button
                                    className="btn btn-secondary"
                                    style={{ padding: '5px 10px', fontSize: '11.5px' }}
                                    onClick={() => {
                                      setStatusModalStaff(s);
                                      setTargetStatus(s.status);
                                      setStatusChangeReason('');
                                      setStatusUpdateError(null);
                                    }}
                                  >
                                    Status
                                  </button>
                                )}
                              </PermissionGate>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {totalStaff > limit && (
              <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-subtle)' }}>
                <Pagination
                  total={totalStaff}
                  limit={limit}
                  offset={offset}
                  onPageChange={(newOffset) => setOffset(newOffset)}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ROLES & PERMISSIONS MATRIX */}
      {/* ========================================================================= */}
      {activeTab === 'roles' && (
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '20px' }}>
          {/* Roles Selector Column */}
          <div className="card" style={{ padding: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '14px', color: 'var(--text-primary)' }}>
              System Roles
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {roles.map((r) => {
                const isSelected = selectedRole?.id === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleSelectRole(r)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: isSelected ? 'var(--bg-tertiary)' : 'transparent',
                      border: isSelected ? '1px solid var(--accent-primary)' : '1px solid transparent',
                      color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '13px', color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                        {r.display_name}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {r.member_count} staff {r.member_count === 1 ? 'member' : 'members'}
                      </div>
                    </div>
                    <ChevronRight size={14} color={isSelected ? 'var(--accent-primary)' : 'var(--text-muted)'} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Modular Permissions Column */}
          <div className="card" style={{ padding: '20px' }}>
            {selectedRole ? (
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingBottom: '16px',
                    borderBottom: '1px solid var(--border-subtle)',
                    marginBottom: '20px',
                  }}
                >
                  <div>
                    <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {selectedRole.display_name} Permissions
                    </h2>
                    <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {selectedRole.description}
                    </p>
                  </div>

                  {selectedRole.name === 'SUPER_ADMIN' ? (
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(234, 179, 8, 0.15)',
                        color: '#eab308',
                        border: '1px solid rgba(234, 179, 8, 0.3)',
                        fontSize: '11px',
                        fontWeight: 700,
                      }}
                    >
                      ALL PERMISSIONS (IMMUTABLE)
                    </span>
                  ) : (
                    <PermissionGate permission="staff.manage">
                      <button
                        className="btn btn-primary"
                        onClick={handleSaveRolePermissions}
                        disabled={savingPermissions}
                      >
                        {savingPermissions ? 'Saving...' : 'Save Permission Set'}
                      </button>
                    </PermissionGate>
                  )}
                </div>

                {/* Notifications */}
                {roleSaveSuccess && (
                  <div
                    style={{
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'rgba(16, 185, 129, 0.15)',
                      color: '#10b981',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      fontSize: '13px',
                      marginBottom: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <CheckCircle2 size={16} />
                    {roleSaveSuccess}
                  </div>
                )}
                {roleSaveError && (
                  <div
                    style={{
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'rgba(239, 68, 68, 0.15)',
                      color: '#ef4444',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      fontSize: '13px',
                      marginBottom: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <AlertCircle size={16} />
                    {roleSaveError}
                  </div>
                )}

                {/* Modular Permission Checkboxes Grouped by Domain */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                  {permissionModules.map((mod) => {
                    const modPermissions = allPermissions.filter((p) => p.module === mod);
                    return (
                      <div
                        key={mod}
                        style={{
                          backgroundColor: 'var(--bg-primary)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-md)',
                          padding: '14px 16px',
                        }}
                      >
                        <div
                          style={{
                            fontSize: '12.5px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                            color: 'var(--accent-primary)',
                            marginBottom: '10px',
                            borderBottom: '1px solid var(--border-subtle)',
                            paddingBottom: '6px',
                          }}
                        >
                          {mod}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {modPermissions.map((perm) => {
                            const isChecked =
                              selectedRole.name === 'SUPER_ADMIN' || selectedRolePerms.has(perm.key);
                            const isReadOnly = selectedRole.name === 'SUPER_ADMIN';
                            return (
                              <label
                                key={perm.key}
                                style={{
                                  display: 'flex',
                                  alignItems: 'flex-start',
                                  gap: '10px',
                                  fontSize: '12.5px',
                                  cursor: isReadOnly ? 'default' : 'pointer',
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  disabled={isReadOnly}
                                  onChange={() => handleTogglePermission(perm.key)}
                                  style={{ marginTop: '2px', accentColor: 'var(--accent-primary)' }}
                                />
                                <div>
                                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                    {perm.key}
                                  </div>
                                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                    {perm.description}
                                  </div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                Select a role from the left menu to view and configure its permissions.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: DUAL-CONTROL GOVERNANCE QUEUE (FOUR-EYES PRINCIPLE) */}
      {/* ========================================================================= */}
      {activeTab === 'dualControl' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-subtle)',
              backgroundColor: 'rgba(234, 179, 8, 0.05)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <ShieldCheck size={18} color="#eab308" />
            <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
              <strong>Dual-Control Principle (Four-Eyes Verification):</strong> High-risk operations (such as Super Admin elevation or critical system security changes) cannot be executed by a single user. A second administrator must review and approve.
            </div>
          </div>

          {loadingApprovals ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px', display: 'block' }} />
              Loading governance queue...
            </div>
          ) : approvals.length === 0 ? (
            <div style={{ padding: '40px 20px' }}>
              <EmptyState
                icon={FileCheck}
                title="No Governance Approvals"
                description="The dual-control queue is empty. High-risk administrative actions requiring four-eyes review will appear here."
              />
            </div>
          ) : (
            <div className="table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Request Type</th>
                    <th>Requested By</th>
                    <th>Target / Reason</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {approvals.map((req) => {
                    const isRequester = staffProfile?.userId === req.requested_by_user_id;
                    return (
                      <tr key={req.id}>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '13px' }}>
                            {req.request_type}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ID: {req.id.slice(0, 8)}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                            {req.requested_by_name}
                            {isRequester && (
                              <span
                                style={{
                                  marginLeft: '6px',
                                  fontSize: '10px',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: 'var(--accent-soft)',
                                  color: 'var(--accent-primary)',
                                }}
                              >
                                YOU (REQUESTER)
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {req.requested_by_email}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: '12.5px', color: 'var(--text-primary)' }}>
                            {req.payload?.reason || 'Standard operational request'}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--accent-primary)' }}>
                            Target: {req.target_type} ({req.target_id.slice(0, 8)}...)
                          </div>
                        </td>
                        <td>
                          <span
                            className="badge"
                            style={{
                              backgroundColor:
                                req.status === 'PENDING'
                                  ? 'rgba(234, 179, 8, 0.15)'
                                  : req.status === 'APPROVED'
                                  ? 'rgba(16, 185, 129, 0.15)'
                                  : 'rgba(239, 68, 68, 0.15)',
                              color:
                                req.status === 'PENDING'
                                  ? '#eab308'
                                  : req.status === 'APPROVED'
                                  ? '#10b981'
                                  : '#ef4444',
                            }}
                          >
                            {req.status}
                          </span>
                        </td>
                        <td>{new Date(req.created_at).toLocaleString()}</td>
                        <td style={{ textAlign: 'right' }}>
                          {req.status === 'PENDING' ? (
                            isRequester ? (
                              <span
                                style={{
                                  fontSize: '11.5px',
                                  color: 'var(--text-muted)',
                                  fontStyle: 'italic',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <Lock size={12} />
                                Awaiting 2nd Admin
                              </span>
                            ) : (
                              <PermissionGate permission="staff.manage">
                                <div style={{ display: 'inline-flex', gap: '6px' }}>
                                  <button
                                    className="btn btn-primary"
                                    style={{ padding: '4px 10px', fontSize: '11.5px' }}
                                    onClick={() => {
                                      setDecisionModalApproval(req);
                                      setDecisionType('APPROVE');
                                      setDecisionNotes('');
                                      setDecisionError(null);
                                    }}
                                  >
                                    Approve
                                  </button>
                                  <button
                                    className="btn btn-secondary"
                                    style={{ padding: '4px 10px', fontSize: '11.5px', color: '#ef4444' }}
                                    onClick={() => {
                                      setDecisionModalApproval(req);
                                      setDecisionType('REJECT');
                                      setDecisionNotes('');
                                      setDecisionError(null);
                                    }}
                                  >
                                    Reject
                                  </button>
                                </div>
                              </PermissionGate>
                            )
                          ) : (
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                              Decided on {req.decided_at ? new Date(req.decided_at).toLocaleDateString() : '—'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: INVITE / CREATE STAFF */}
      {/* ========================================================================= */}
      {createModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '460px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-default)',
              boxShadow: 'var(--shadow-lg)',
              padding: '24px',
            }}
          >
            <h2 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
              Invite Staff Member
            </h2>

            {createError && (
              <div
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  color: '#ef4444',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '13px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <AlertCircle size={16} />
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateStaffSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Email Address *
                </label>
                <input
                  type="email"
                  placeholder="e.g. j.doe@paypawa.ng"
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Assigned Role *
                </label>
                <select
                  value={createRoleId}
                  onChange={(e) => setCreateRoleId(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                  }}
                >
                  <option value="">Select a role...</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.display_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Initial Account Status
                </label>
                <select
                  value={createStatus}
                  onChange={(e) => setCreateStatus(e.target.value as StaffStatus)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                  }}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                  <option value="DISABLED">DISABLED</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setCreateModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={creatingStaff}
                >
                  {creatingStaff ? 'Creating...' : 'Invite Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EDIT ROLE (WITH DUAL CONTROL NOTICES) */}
      {/* ========================================================================= */}
      {editRoleModalStaff && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '460px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-default)',
              boxShadow: 'var(--shadow-lg)',
              padding: '24px',
            }}
          >
            <h2 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}>
              Change Staff Role Assignment
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Updating role for <strong>{editRoleModalStaff.full_name}</strong>
            </p>

            {roleUpdateError && (
              <div
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  color: '#ef4444',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '13px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <AlertCircle size={16} />
                {roleUpdateError}
              </div>
            )}

            {roleUpdateNotice && (
              <div
                style={{
                  backgroundColor: 'rgba(234, 179, 8, 0.15)',
                  color: '#eab308',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '13px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                }}
              >
                <ShieldCheck size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{roleUpdateNotice}</span>
              </div>
            )}

            <form onSubmit={handleUpdateRoleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  New Role Assignment *
                </label>
                <select
                  value={newRoleId}
                  onChange={(e) => setNewRoleId(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                  }}
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.display_name} {r.name === 'SUPER_ADMIN' ? '⚡ (Requires Dual-Control)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Operational Reason for Role Change
                </label>
                <textarea
                  rows={2}
                  placeholder="Provide justification for audit compliance..."
                  value={roleChangeReason}
                  onChange={(e) => setRoleChangeReason(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEditRoleModalStaff(null)}
                >
                  {roleUpdateNotice ? 'Close' : 'Cancel'}
                </button>
                {!roleUpdateNotice && (
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={updatingRole}
                  >
                    {updatingRole ? 'Updating...' : 'Save Role Assignment'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: CHANGE STATUS */}
      {/* ========================================================================= */}
      {statusModalStaff && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '440px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-default)',
              boxShadow: 'var(--shadow-lg)',
              padding: '24px',
            }}
          >
            <h2 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}>
              Update Staff Status
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Target: <strong>{statusModalStaff.full_name}</strong>
            </p>

            {statusUpdateError && (
              <div
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  color: '#ef4444',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '13px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <AlertCircle size={16} />
                {statusUpdateError}
              </div>
            )}

            <form onSubmit={handleUpdateStatusSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Status
                </label>
                <select
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value as StaffStatus)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                  }}
                >
                  <option value="ACTIVE">ACTIVE (Full access)</option>
                  <option value="SUSPENDED">SUSPENDED (Temporary lock)</option>
                  <option value="DISABLED">DISABLED (Privileges revoked)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Reason for Status Change
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Departed organization, disciplinary review..."
                  value={statusChangeReason}
                  onChange={(e) => setStatusChangeReason(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setStatusModalStaff(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={updatingStatus}
                >
                  {updatingStatus ? 'Saving...' : 'Save Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: DUAL-CONTROL DECISION CONFIRMATION */}
      {/* ========================================================================= */}
      {decisionModalApproval && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '460px',
              backgroundColor: 'var(--bg-secondary)',
              border: decisionType === 'APPROVE' ? '1px solid #10b981' : '1px solid #ef4444',
              boxShadow: 'var(--shadow-lg)',
              padding: '24px',
            }}
          >
            <h2 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}>
              {decisionType === 'APPROVE' ? 'Approve Governance Action' : 'Reject Governance Action'}
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Request Type: <strong>{decisionModalApproval.request_type}</strong>
            </p>

            {decisionError && (
              <div
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  color: '#ef4444',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '13px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <AlertCircle size={16} />
                {decisionError}
              </div>
            )}

            <form onSubmit={handleDecisionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Verification Notes & Sign-off *
                </label>
                <textarea
                  rows={3}
                  placeholder="Record second administrator sign-off rationale..."
                  value={decisionNotes}
                  onChange={(e) => setDecisionNotes(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setDecisionModalApproval(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={decisionType === 'APPROVE' ? 'btn btn-primary' : 'btn btn-danger'}
                  disabled={submittingDecision || !decisionNotes.trim()}
                >
                  {submittingDecision
                    ? 'Submitting...'
                    : decisionType === 'APPROVE'
                    ? 'Confirm Approval'
                    : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DRAWER: STAFF ACTIVITY & AUDIT STREAM */}
      {/* ========================================================================= */}
      <DetailDrawer
        isOpen={Boolean(activityStaff)}
        onClose={() => {
          setActivityStaff(null);
          setStaffActivity([]);
        }}
        title={activityStaff ? `${activityStaff.full_name} — Activity Log` : 'Staff Activity'}
      >
        {activityStaff && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Header info */}
            <div
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                padding: '14px 16px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px' }}>
                  {activityStaff.full_name}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{activityStaff.email}</div>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {renderRoleBadge(activityStaff.role, activityStaff.role_display_name)}
                {renderStatusBadge(activityStaff.status)}
              </div>
            </div>

            {/* Activity Stream */}
            <h4 style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Recent Operational Actions
            </h4>

            {loadingActivity ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
                <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 8px', display: 'block' }} />
                Loading audit trail...
              </div>
            ) : staffActivity.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                No recent actions recorded for this staff member.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {staffActivity.map((act) => (
                  <div
                    key={act.id}
                    style={{
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px 14px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: '12.5px', color: 'var(--accent-primary)' }}>
                        {act.action}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {new Date(act.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Target: {act.target_type} {act.target_id ? `(#${act.target_id.slice(0, 8)})` : ''}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </DetailDrawer>
    </div>
  );
};

export default Staff;
