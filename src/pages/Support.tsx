import React, { useState, useEffect, useCallback } from 'react';
import {
  Headphones,
  Search,
  RefreshCw,
  Plus,
  Eye,
  User,
  Zap,
  Wallet,
  CreditCard,
  FileText,
  AlertTriangle,
  Lock,
  MessageSquare,
  ArrowUpRight,
  UserCheck,
  CheckCircle2,
  Clock,
  Send,
  AlertCircle,
  SlidersHorizontal,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import {
  AdminSupportService,
  SupportCaseListItem,
  SupportCaseDetailsResponse,
  CaseStatus,
  CasePriority,
  CaseCategory,
  EscalationDepartment,
  StaffOption,
} from '../services/admin-support.service';
import { AdminCustomersService, CustomerSummary } from '../services/admin-customers.service';
import { Pagination } from '../components/common/Pagination';
import { DetailDrawer } from '../components/common/DetailDrawer';
import { EmptyState } from '../components/common/EmptyState';
import { Badge } from '../components/common/Badge';
import { PermissionGate } from '../components/common/PermissionGate';

export const Support: React.FC = () => {
  const [cases, setCases] = useState<SupportCaseListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const limit = 15;

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [escalatedFilter, setEscalatedFilter] = useState<string>('ALL');

  // Staff members for assignment
  const [staffList, setStaffList] = useState<StaffOption[]>([]);

  // Selected Case Detail
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [caseDetails, setCaseDetails] = useState<SupportCaseDetailsResponse | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<'overview' | 'context' | 'notes'>('overview');

  // New Note State
  const [newNoteText, setNewNoteText] = useState('');
  const [newNoteIsInternal, setNewNoteIsInternal] = useState(true);
  const [submittingNote, setSubmittingNote] = useState(false);

  // Status Change Modal State
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<CaseStatus>('IN_PROGRESS');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Assignment Modal State
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [targetStaffId, setTargetStaffId] = useState<string>('');
  const [assignNote, setAssignNote] = useState('');
  const [assigning, setAssigning] = useState(false);

  // Escalation Modal State
  const [escalateModalOpen, setEscalateModalOpen] = useState(false);
  const [targetEscalationDept, setTargetEscalationDept] = useState<'OPERATIONS' | 'FINANCE' | 'MANAGER'>('OPERATIONS');
  const [escalationReason, setEscalationReason] = useState('');
  const [escalating, setEscalating] = useState(false);

  // Create Case Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerSearchResults, setCustomerSearchResults] = useState<CustomerSummary[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSummary | null>(null);
  const [createCategory, setCreateCategory] = useState<CaseCategory>('ELECTRICITY_PURCHASE');
  const [createPriority, setCreatePriority] = useState<CasePriority>('MEDIUM');
  const [createSubject, setCreateSubject] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createAssignee, setCreateAssignee] = useState('');
  const [creatingCase, setCreatingCase] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Metrics summary
  const [metrics, setMetrics] = useState({
    activeCount: 0,
    urgentCount: 0,
    waitingCount: 0,
    escalatedCount: 0,
    resolvedCount: 0,
  });

  const fetchStaff = async () => {
    const list = await AdminSupportService.listActiveStaff();
    setStaffList(list);
  };

  const fetchCases = useCallback(async () => {
    setLoading(true);
    try {
      const res = await AdminSupportService.listCases({
        search: search.trim(),
        status: statusFilter,
        priority: priorityFilter,
        category: categoryFilter,
        escalatedDept: escalatedFilter,
        limit,
        offset,
      });

      if (res.success) {
        setCases(res.data);
        setTotal(res.total);

        // Compute metrics from fetched data
        const active = res.data.filter((c) => c.status === 'OPEN' || c.status === 'IN_PROGRESS').length;
        const urgent = res.data.filter((c) => c.priority === 'URGENT' || c.priority === 'HIGH').length;
        const waiting = res.data.filter((c) => c.status === 'WAITING').length;
        const escalated = res.data.filter((c) => c.escalated_to_department && c.escalated_to_department !== 'NONE').length;
        const resolved = res.data.filter((c) => c.status === 'RESOLVED' || c.status === 'CLOSED').length;

        setMetrics({
          activeCount: active,
          urgentCount: urgent,
          waitingCount: waiting,
          escalatedCount: escalated,
          resolvedCount: resolved,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, priorityFilter, categoryFilter, escalatedFilter, offset]);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  useEffect(() => {
    fetchStaff();
  }, []);

  // Fetch full details when a case is selected
  const handleOpenCase = async (caseId: string) => {
    setSelectedCaseId(caseId);
    setDetailsLoading(true);
    setDetailsError(null);
    setActiveDetailTab('overview');
    try {
      const res = await AdminSupportService.getCaseDetails(caseId);
      if (res.success) {
        setCaseDetails(res);
        setDetailsError(null);
      } else {
        setDetailsError(res.error || 'Failed to load case details.');
      }
    } catch (err: any) {
      setDetailsError(err.message || 'An unexpected error occurred while loading ticket details.');
    } finally {
      setDetailsLoading(false);
    }
  };

  const refreshSelectedCase = async () => {
    if (!selectedCaseId) return;
    try {
      const res = await AdminSupportService.getCaseDetails(selectedCaseId);
      if (res.success) {
        setCaseDetails(res);
        setDetailsError(null);
      }
    } catch (err) {
      console.warn('Failed to refresh case details:', err);
    }
    fetchCases();
  };

  // Search customers for case creation
  const handleCustomerSearch = async (term: string) => {
    setCustomerSearch(term);
    if (term.trim().length >= 2) {
      const res = await AdminCustomersService.listCustomers({ search: term.trim(), limit: 5 });
      if (res.success) {
        setCustomerSearchResults(res.data);
      }
    } else {
      setCustomerSearchResults([]);
    }
  };

  // Create Case Submit
  const handleCreateCaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) {
      setCreateError('Please select a customer for this support case.');
      return;
    }
    if (!createSubject.trim()) {
      setCreateError('Please enter a case subject.');
      return;
    }
    if (!createDescription.trim()) {
      setCreateError('Please enter a detailed description of the inquiry/issue.');
      return;
    }

    setCreateError(null);
    setCreatingCase(true);
    try {
      const res = await AdminSupportService.createCase({
        customerId: selectedCustomer.id,
        category: createCategory,
        priority: createPriority,
        subject: createSubject.trim(),
        description: createDescription.trim(),
        assignedStaffId: createAssignee || undefined,
      });

      if (res.success) {
        setCreateModalOpen(false);
        setSelectedCustomer(null);
        setCustomerSearch('');
        setCreateSubject('');
        setCreateDescription('');
        setCreateAssignee('');
        fetchCases();
        if (res.case_id) {
          handleOpenCase(res.case_id);
        }
      } else {
        setCreateError(res.error || 'Failed to create support case.');
      }
    } finally {
      setCreatingCase(false);
    }
  };

  // Add Note Submit
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCaseId || !newNoteText.trim()) return;

    setSubmittingNote(true);
    try {
      const res = await AdminSupportService.addNote(selectedCaseId, newNoteText.trim(), newNoteIsInternal);
      if (res.success) {
        setNewNoteText('');
        refreshSelectedCase();
      }
    } finally {
      setSubmittingNote(false);
    }
  };

  // Status Change Submit
  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCaseId) return;

    setUpdatingStatus(true);
    try {
      const res = await AdminSupportService.updateStatus(selectedCaseId, targetStatus, resolutionNotes.trim() || undefined);
      if (res.success) {
        setStatusModalOpen(false);
        setResolutionNotes('');
        refreshSelectedCase();
      }
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Assign Staff Submit
  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCaseId) return;

    setAssigning(true);
    try {
      const res = await AdminSupportService.assignCase(selectedCaseId, targetStaffId || null, assignNote.trim() || undefined);
      if (res.success) {
        setAssignModalOpen(false);
        setAssignNote('');
        refreshSelectedCase();
      }
    } finally {
      setAssigning(false);
    }
  };

  // Escalate Submit
  const handleEscalateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCaseId || !escalationReason.trim()) return;

    setEscalating(true);
    try {
      const res = await AdminSupportService.escalateCase(selectedCaseId, targetEscalationDept, escalationReason.trim());
      if (res.success) {
        setEscalateModalOpen(false);
        setEscationReasonEmpty();
        refreshSelectedCase();
      }
    } finally {
      setEscalating(false);
    }
  };

  const setEscationReasonEmpty = () => {
    setEscalationReason('');
  };

  const renderPriorityBadge = (priority: CasePriority) => {
    switch (priority) {
      case 'URGENT':
        return <Badge variant="danger">URGENT</Badge>;
      case 'HIGH':
        return (
          <span className="badge" style={{ backgroundColor: 'rgba(249, 115, 22, 0.15)', color: '#f97316', border: '1px solid rgba(249, 115, 22, 0.3)' }}>
            HIGH
          </span>
        );
      case 'MEDIUM':
        return <Badge variant="pending">MEDIUM</Badge>;
      case 'LOW':
      default:
        return <Badge variant="neutral">LOW</Badge>;
    }
  };

  const renderStatusBadge = (status: CaseStatus) => {
    switch (status) {
      case 'OPEN':
        return (
          <span className="badge" style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
            OPEN
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="badge" style={{ backgroundColor: 'rgba(168, 85, 247, 0.15)', color: '#a855f7', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
            IN PROGRESS
          </span>
        );
      case 'WAITING':
        return <Badge variant="pending">WAITING</Badge>;
      case 'RESOLVED':
        return <Badge variant="active">RESOLVED</Badge>;
      case 'CLOSED':
      default:
        return <Badge variant="neutral">CLOSED</Badge>;
    }
  };

  const renderCategoryBadge = (category: CaseCategory) => {
    const formatted = category ? category.replace('_', ' ') : 'GENERAL';
    return (
      <span
        style={{
          fontSize: '11px',
          fontWeight: 600,
          color: 'var(--text-secondary)',
          backgroundColor: 'var(--bg-tertiary)',
          padding: '2px 8px',
          borderRadius: '4px',
          border: '1px solid var(--border-subtle)',
          textTransform: 'uppercase',
        }}
      >
        {formatted}
      </span>
    );
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Customer Support & Case Management</h1>
          <p className="page-subtitle">Support operations center, live customer context, and tiered escalations.</p>
        </div>

        <PermissionGate permission="support.manage">
          <button className="btn btn-primary" onClick={() => setCreateModalOpen(true)}>
            <Plus size={16} />
            Create Support Case
          </button>
        </PermissionGate>
      </div>

      {/* KPI Summary Cards */}
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
            <Headphones size={20} />
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>{metrics.activeCount}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Active Tickets</div>
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
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#ef4444' }}>{metrics.urgentCount}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Urgent / High Queue</div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '8px',
              backgroundColor: 'rgba(245, 158, 11, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f59e0b',
            }}
          >
            <Clock size={20} />
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#f59e0b' }}>{metrics.waitingCount}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Waiting on Response</div>
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
            <ArrowUpRight size={20} />
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#a855f7' }}>{metrics.escalatedCount}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Escalated Cases</div>
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
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#10b981' }}>{metrics.resolvedCount}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Resolved / Closed</div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="card" style={{ marginBottom: '20px', padding: '16px 20px' }}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setOffset(0);
            fetchCases();
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
          <div style={{ position: 'relative', flex: '1 1 260px', minWidth: '240px' }}>
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
              className="form-control"
              placeholder="Search Case #, customer, subject..."
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
            <option value="OPEN">OPEN</option>
            <option value="IN_PROGRESS">IN PROGRESS</option>
            <option value="WAITING">WAITING</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="CLOSED">CLOSED</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value);
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
            <option value="ALL">All Priorities</option>
            <option value="URGENT">URGENT</option>
            <option value="HIGH">HIGH</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="LOW">LOW</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
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
            <option value="ALL">All Categories</option>
            <option value="WALLET">Wallet</option>
            <option value="PAYMENT">Payment</option>
            <option value="ELECTRICITY_PURCHASE">Electricity Purchase</option>
            <option value="METER">Meter</option>
            <option value="ACCOUNT">Account</option>
            <option value="TECHNICAL">Technical</option>
            <option value="OTHER">Other</option>
          </select>

          {/* Escalation Filter */}
          <select
            value={escalatedFilter}
            onChange={(e) => {
              setEscalatedFilter(e.target.value);
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
            <option value="ALL">All Escalations</option>
            <option value="OPERATIONS">Escalated: Operations</option>
            <option value="FINANCE">Escalated: Finance</option>
            <option value="MANAGER">Escalated: Manager</option>
            <option value="NONE">Unescalated</option>
          </select>

          {/* Action Buttons */}
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
                setStatusFilter('ALL');
                setPriorityFilter('ALL');
                setCategoryFilter('ALL');
                setEscalatedFilter('ALL');
                setOffset(0);
                fetchCases();
              }}
              title="Reset Filters"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </form>
      </div>

      {/* Cases Data Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading && cases.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px', display: 'block' }} />
            Loading support cases...
          </div>
        ) : cases.length === 0 ? (
          <div style={{ padding: '40px 20px' }}>
            <EmptyState
              icon={Headphones}
              title="No Support Cases Found"
              description="No support tickets match the selected filter criteria. You can create a new case to get started."
            />
          </div>
        ) : (
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Case ID & Subject</th>
                  <th>Customer</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Assigned Staff</th>
                  <th>Escalation</th>
                  <th>Updated</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13.5px' }}>
                        {c.case_number}
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: 'var(--text-secondary)',
                          maxWidth: '240px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {c.subject}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{c.customer_name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{c.customer_email}</div>
                    </td>
                    <td>{renderCategoryBadge(c.category)}</td>
                    <td>{renderPriorityBadge(c.priority)}</td>
                    <td>{renderStatusBadge(c.status)}</td>
                    <td>
                      {c.assigned_staff_name ? (
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                            {c.assigned_staff_name}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.assigned_staff_role}</div>
                        </div>
                      ) : (
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td>
                      {c.escalated_to_department && c.escalated_to_department !== 'NONE' ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(239, 68, 68, 0.15)',
                            color: '#ef4444',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            fontSize: '11px',
                            fontWeight: 700,
                          }}
                        >
                          <ShieldAlert size={12} />
                          {c.escalated_to_department}
                        </span>
                      ) : (
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {new Date(c.updated_at).toLocaleDateString()}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {new Date(c.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                        onClick={() => handleOpenCase(c.id)}
                      >
                        <Eye size={14} />
                        View Context & Case
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {total > limit && (
          <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-subtle)' }}>
            <Pagination
              total={total}
              limit={limit}
              offset={offset}
              onPageChange={(newOffset) => setOffset(newOffset)}
            />
          </div>
        )}
      </div>

      {/* Case Details Drawer with Live Customer Context */}
      <DetailDrawer
        isOpen={Boolean(selectedCaseId)}
        onClose={() => {
          setSelectedCaseId(null);
          setCaseDetails(null);
          setDetailsError(null);
        }}
        title={
          caseDetails?.case
            ? `${caseDetails.case.case_number} — ${caseDetails.case.subject}`
            : 'Support Case Context'
        }
      >
        {detailsLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px', display: 'block' }} />
            Loading live customer context and ticket details...
          </div>
        ) : detailsError || !caseDetails ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <AlertCircle size={32} color="var(--danger)" style={{ margin: '0 auto 12px', display: 'block' }} />
            <p style={{ color: 'var(--danger)', fontWeight: 600, marginBottom: '8px' }}>
              {detailsError || 'Unable to load case details'}
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '16px' }}>
              There was an issue retrieving the customer context for this ticket.
            </p>
            <button
              className="btn btn-secondary"
              onClick={() => selectedCaseId && handleOpenCase(selectedCaseId)}
            >
              <RefreshCw size={14} style={{ marginRight: '6px' }} />
              Retry Loading Context
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Case Quick Status Bar */}
            <div
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                padding: '16px 20px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {renderStatusBadge(caseDetails.case.status)}
                {renderPriorityBadge(caseDetails.case.priority)}
                {renderCategoryBadge(caseDetails.case.category)}
                {caseDetails.case.escalated_to_department && caseDetails.case.escalated_to_department !== 'NONE' && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(239, 68, 68, 0.15)',
                      color: '#ef4444',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      fontSize: '11px',
                      fontWeight: 700,
                    }}
                  >
                    <ShieldAlert size={12} />
                    ESCALATED: {caseDetails.case.escalated_to_department}
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <PermissionGate permission="support.manage">
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                    onClick={() => {
                      setTargetStatus(caseDetails.case.status);
                      setStatusModalOpen(true);
                    }}
                  >
                    Change Status
                  </button>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                    onClick={() => {
                      setTargetStaffId(caseDetails.case.assigned_staff_id || '');
                      setAssignModalOpen(true);
                    }}
                  >
                    <UserCheck size={14} />
                    Assign Staff
                  </button>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '12px', borderColor: 'rgba(239, 68, 68, 0.4)' }}
                    onClick={() => setEscalateModalOpen(true)}
                  >
                    <ArrowUpRight size={14} color="#ef4444" />
                    Escalate
                  </button>
                </div>
              </PermissionGate>
            </div>

            {/* Navigation Tabs */}
            <div
              style={{
                display: 'flex',
                borderBottom: '1px solid var(--border-subtle)',
                gap: '8px',
              }}
            >
              <button
                type="button"
                onClick={() => setActiveDetailTab('overview')}
                style={{
                  padding: '10px 16px',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeDetailTab === 'overview' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                  color: activeDetailTab === 'overview' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: activeDetailTab === 'overview' ? 600 : 400,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <FileText size={15} />
                Case Overview
              </button>

              <button
                type="button"
                onClick={() => setActiveDetailTab('context')}
                style={{
                  padding: '10px 16px',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeDetailTab === 'context' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                  color: activeDetailTab === 'context' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: activeDetailTab === 'context' ? 600 : 400,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <User size={15} />
                Live Customer Context
              </button>

              <button
                type="button"
                onClick={() => setActiveDetailTab('notes')}
                style={{
                  padding: '10px 16px',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeDetailTab === 'notes' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                  color: activeDetailTab === 'notes' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: activeDetailTab === 'notes' ? 600 : 400,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <MessageSquare size={15} />
                Notes & Timeline ({caseDetails.notes.length})
              </button>
            </div>

            {/* TAB 1: OVERVIEW */}
            {activeDetailTab === 'overview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="card" style={{ padding: '18px 20px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '10px', color: 'var(--text-primary)' }}>
                    Customer Inquiry / Issue Description
                  </h3>
                  <div
                    style={{
                      backgroundColor: 'var(--bg-primary)',
                      padding: '14px 16px',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '13px',
                      lineHeight: 1.6,
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-subtle)',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {caseDetails.case.description}
                  </div>
                </div>

                {caseDetails.case.resolution_notes && (
                  <div className="card" style={{ padding: '18px 20px', borderLeft: '3px solid #10b981' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#10b981' }}>
                      Resolution Summary
                    </h3>
                    <p style={{ fontSize: '13px', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                      {caseDetails.case.resolution_notes}
                    </p>
                  </div>
                )}

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '12px',
                  }}
                >
                  <div className="card" style={{ padding: '14px 16px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Customer Name
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }}>
                      {caseDetails.customer?.full_name || 'N/A'}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{caseDetails.customer?.email}</div>
                  </div>

                  <div className="card" style={{ padding: '14px 16px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Assigned Staff
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }}>
                      {caseDetails.case.assigned_staff_name || 'Unassigned'}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {caseDetails.case.assigned_staff_role || '—'}
                    </div>
                  </div>

                  <div className="card" style={{ padding: '14px 16px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Date Created
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-primary)', marginTop: '4px' }}>
                      {new Date(caseDetails.case.created_at).toLocaleString()}
                    </div>
                  </div>

                  <div className="card" style={{ padding: '14px 16px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Last Updated
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-primary)', marginTop: '4px' }}>
                      {new Date(caseDetails.case.updated_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: LIVE CUSTOMER CONTEXT (NON-DUPLICATED RELATIONAL DATA) */}
            {activeDetailTab === 'context' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Notice Alert */}
                <div
                  style={{
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '12.5px',
                    color: 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <User size={16} color="#3b82f6" />
                  <span>
                    <strong>Live Customer Context:</strong> Directly linked to customer records, registered meters, ledger balances, and payment attempts in real-time.
                  </span>
                </div>

                {/* Profile Overview */}
                <div className="card" style={{ padding: '18px 20px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <User size={16} color="var(--accent-primary)" />
                    Customer Profile & KYC Summary
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Full Name:</span>
                      <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{caseDetails.customer?.full_name}</p>
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Email:</span>
                      <p style={{ color: 'var(--text-primary)' }}>{caseDetails.customer?.email}</p>
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Phone:</span>
                      <p style={{ color: 'var(--text-primary)' }}>{caseDetails.customer?.phone || 'Not provided'}</p>
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Account Tier:</span>
                      <p style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>
                        {caseDetails.customer?.account_type || 'INDIVIDUAL'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Customer Wallet History */}
                <div className="card" style={{ padding: '18px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Wallet size={16} color="#84cc16" />
                      Live Wallet History & Ledger
                    </h3>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--accent-primary)' }}>
                      ₦{((caseDetails.wallet?.balance_kobo || 0) / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  {caseDetails.wallet?.recent_entries?.length === 0 ? (
                    <p style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>No ledger movements recorded for this wallet.</p>
                  ) : (
                    <div className="table-container">
                      <table className="admin-table" style={{ fontSize: '12px' }}>
                        <thead>
                          <tr>
                            <th>Type</th>
                            <th>Amount</th>
                            <th>Balance After</th>
                            <th>Reference</th>
                            <th>Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {caseDetails.wallet?.recent_entries?.map((entry) => (
                            <tr key={entry.id}>
                              <td>
                                <span
                                  style={{
                                    fontWeight: 600,
                                    color: entry.type.includes('credit') ? '#10b981' : '#ef4444',
                                  }}
                                >
                                  {entry.type}
                                </span>
                              </td>
                              <td style={{ fontWeight: 600 }}>
                                ₦{(entry.amount_kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                              </td>
                              <td>₦{(entry.balance_after_kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</td>
                              <td style={{ color: 'var(--text-muted)' }}>{entry.reference}</td>
                              <td>{new Date(entry.created_at).toLocaleDateString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Customer Meters */}
                <div className="card" style={{ padding: '18px 20px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Zap size={16} color="#f59e0b" />
                    Registered Meters ({caseDetails.meters?.length || 0})
                  </h3>

                  {caseDetails.meters?.length === 0 ? (
                    <p style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>No meters registered for this customer.</p>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                      {caseDetails.meters?.map((m) => (
                        <div
                          key={m.id}
                          style={{
                            backgroundColor: 'var(--bg-primary)',
                            padding: '12px 14px',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border-subtle)',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '13px' }}>
                              {m.meter_number}
                            </span>
                            <span style={{ fontSize: '11px', padding: '1px 6px', borderRadius: '4px', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                              {m.meter_type}
                            </span>
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--accent-primary)', marginTop: '4px' }}>
                            {m.disco_name} ({m.disco_code})
                          </div>
                          {m.customer_name && (
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                              {m.customer_name}
                            </div>
                          )}
                          {m.address && (
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                              {m.address}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Relevant Electricity Purchases */}
                <div className="card" style={{ padding: '18px 20px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileText size={16} color="#3b82f6" />
                    Recent Electricity Purchases ({caseDetails.transactions?.length || 0})
                  </h3>

                  {caseDetails.transactions?.length === 0 ? (
                    <p style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>No electricity purchase transactions found.</p>
                  ) : (
                    <div className="table-container">
                      <table className="admin-table" style={{ fontSize: '12px' }}>
                        <thead>
                          <tr>
                            <th>Meter & DisCo</th>
                            <th>Amount</th>
                            <th>Units (kWh)</th>
                            <th>Token</th>
                            <th>Status</th>
                            <th>Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {caseDetails.transactions?.map((tx) => (
                            <tr key={tx.id}>
                              <td>
                                <div style={{ fontWeight: 600 }}>{tx.meter_number}</div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{tx.disco_code}</div>
                              </td>
                              <td style={{ fontWeight: 600 }}>
                                ₦{(tx.amount_kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                              </td>
                              <td>{tx.units_kwh} kWh</td>
                              <td>
                                {tx.token ? (
                                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-primary)' }}>
                                    {tx.token}
                                  </span>
                                ) : (
                                  <span style={{ color: 'var(--text-muted)' }}>—</span>
                                )}
                              </td>
                              <td>
                                <span
                                  className="badge"
                                  style={{
                                    backgroundColor: tx.status === 'successful' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                    color: tx.status === 'successful' ? '#10b981' : '#ef4444',
                                  }}
                                >
                                  {tx.status}
                                </span>
                              </td>
                              <td>{new Date(tx.created_at).toLocaleDateString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Related Inbound Payments */}
                <div className="card" style={{ padding: '18px 20px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CreditCard size={16} color="#a855f7" />
                    Related Inbound Payments ({caseDetails.payments?.length || 0})
                  </h3>

                  {caseDetails.payments?.length === 0 ? (
                    <p style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>No payment attempts found for this customer.</p>
                  ) : (
                    <div className="table-container">
                      <table className="admin-table" style={{ fontSize: '12px' }}>
                        <thead>
                          <tr>
                            <th>Reference</th>
                            <th>Provider</th>
                            <th>Amount</th>
                            <th>Status</th>
                            <th>Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {caseDetails.payments?.map((pay) => (
                            <tr key={pay.id}>
                              <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{pay.reference}</td>
                              <td>{pay.provider}</td>
                              <td style={{ fontWeight: 600 }}>
                                ₦{(pay.amount_kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                              </td>
                              <td>
                                <span
                                  className="badge"
                                  style={{
                                    backgroundColor: pay.status === 'successful' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                    color: pay.status === 'successful' ? '#10b981' : '#f59e0b',
                                  }}
                                >
                                  {pay.status}
                                </span>
                              </td>
                              <td>{new Date(pay.created_at).toLocaleDateString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: NOTES & TIMELINE */}
            {activeDetailTab === 'notes' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {/* Notes Stream */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {caseDetails.notes.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                      No notes recorded yet. Add the first internal staff note below.
                    </div>
                  ) : (
                    caseDetails.notes.map((note) => (
                      <div
                        key={note.id}
                        style={{
                          borderRadius: 'var(--radius-md)',
                          padding: '14px 16px',
                          border: note.is_internal
                            ? '1px solid rgba(245, 158, 11, 0.4)'
                            : '1px solid rgba(16, 185, 129, 0.4)',
                          backgroundColor: note.is_internal
                            ? 'rgba(245, 158, 11, 0.06)'
                            : 'rgba(16, 185, 129, 0.06)',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '8px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {note.is_internal ? (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  backgroundColor: 'rgba(245, 158, 11, 0.2)',
                                  color: '#f59e0b',
                                  fontSize: '10.5px',
                                  fontWeight: 700,
                                  textTransform: 'uppercase',
                                }}
                              >
                                <Lock size={11} />
                                Internal Staff Note
                              </span>
                            ) : (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  backgroundColor: 'rgba(16, 185, 129, 0.2)',
                                  color: '#10b981',
                                  fontSize: '10.5px',
                                  fontWeight: 700,
                                  textTransform: 'uppercase',
                                }}
                              >
                                <CheckCircle2 size={11} />
                                Customer-Visible Note
                              </span>
                            )}
                            <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {note.author_name || 'Staff Member'}
                            </span>
                            {note.author_role && (
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                ({note.author_role})
                              </span>
                            )}
                          </div>

                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {new Date(note.created_at).toLocaleString()}
                          </div>
                        </div>

                        <div
                          style={{
                            fontSize: '13px',
                            color: 'var(--text-primary)',
                            whiteSpace: 'pre-wrap',
                            lineHeight: 1.5,
                          }}
                        >
                          {note.note}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Note Form */}
                <PermissionGate permission="support.manage">
                  <form
                    onSubmit={handleAddNote}
                    className="card"
                    style={{ padding: '16px 20px', backgroundColor: 'var(--bg-secondary)' }}
                  >
                    <h4 style={{ fontSize: '13.5px', fontWeight: 600, marginBottom: '10px', color: 'var(--text-primary)' }}>
                      Add Note to Case
                    </h4>

                    <textarea
                      className="form-control"
                      rows={3}
                      placeholder="Type your internal note or public response here..."
                      value={newNoteText}
                      onChange={(e) => setNewNoteText(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        backgroundColor: 'var(--bg-input)',
                        border: '1px solid var(--border-default)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--text-primary)',
                        fontSize: '13px',
                        marginBottom: '12px',
                        resize: 'vertical',
                      }}
                    />

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                      <label
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '12.5px',
                          color: 'var(--text-primary)',
                          cursor: 'pointer',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={newNoteIsInternal}
                          onChange={(e) => setNewNoteIsInternal(e.target.checked)}
                          style={{ accentColor: 'var(--accent-primary)' }}
                        />
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Lock size={12} color="#f59e0b" />
                          <strong>Internal Staff Note</strong> (Confidential to staff only)
                        </span>
                      </label>

                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={submittingNote || !newNoteText.trim()}
                        style={{ padding: '7px 16px', fontSize: '12.5px' }}
                      >
                        <Send size={14} />
                        {submittingNote ? 'Posting...' : 'Post Note'}
                      </button>
                    </div>
                  </form>
                </PermissionGate>
              </div>
            )}
          </div>
        )}
      </DetailDrawer>

      {/* CREATE CASE MODAL */}
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
              maxWidth: '560px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-default)',
              boxShadow: 'var(--shadow-lg)',
              padding: '24px',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Create Support Case
              </h2>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '18px',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            {createError && (
              <div
                style={{
                  backgroundColor: 'var(--status-danger-bg)',
                  color: 'var(--status-danger-text)',
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

            <form onSubmit={handleCreateCaseSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Customer Search / Selection */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Customer *
                </label>
                {selectedCustomer ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      backgroundColor: 'var(--bg-input)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--accent-primary)',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13px' }}>
                        {selectedCustomer.fullName}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{selectedCustomer.email}</div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '4px 8px', fontSize: '11px' }}
                      onClick={() => setSelectedCustomer(null)}
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div>
                    <input
                      type="text"
                      placeholder="Type customer name, email, or phone to search..."
                      value={customerSearch}
                      onChange={(e) => handleCustomerSearch(e.target.value)}
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
                    {customerSearchResults.length > 0 && (
                      <div
                        style={{
                          marginTop: '6px',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: 'var(--bg-tertiary)',
                          maxHeight: '160px',
                          overflowY: 'auto',
                        }}
                      >
                        {customerSearchResults.map((cust) => (
                          <div
                            key={cust.id}
                            onClick={() => {
                              setSelectedCustomer(cust);
                              setCustomerSearchResults([]);
                            }}
                            style={{
                              padding: '8px 12px',
                              cursor: 'pointer',
                              borderBottom: '1px solid var(--border-subtle)',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                                {cust.fullName}
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{cust.email}</div>
                            </div>
                            <ChevronRight size={14} color="var(--text-muted)" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Category & Priority */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    Category *
                  </label>
                  <select
                    value={createCategory}
                    onChange={(e) => setCreateCategory(e.target.value as CaseCategory)}
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
                    <option value="ELECTRICITY_PURCHASE">Electricity Purchase</option>
                    <option value="PAYMENT">Payment</option>
                    <option value="WALLET">Wallet</option>
                    <option value="METER">Meter</option>
                    <option value="ACCOUNT">Account</option>
                    <option value="TECHNICAL">Technical</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    Priority *
                  </label>
                  <select
                    value={createPriority}
                    onChange={(e) => setCreatePriority(e.target.value as CasePriority)}
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
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="URGENT">URGENT</option>
                  </select>
                </div>
              </div>

              {/* Subject */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Subject *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Token delivery failure for AEDC meter #4412"
                  value={createSubject}
                  onChange={(e) => setCreateSubject(e.target.value)}
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

              {/* Description */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Inquiry / Issue Description *
                </label>
                <textarea
                  rows={4}
                  placeholder="Provide full context of the customer complaint or operational issue..."
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Assignee */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Initial Assignee (Optional)
                </label>
                <select
                  value={createAssignee}
                  onChange={(e) => setCreateAssignee(e.target.value)}
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
                  <option value="">Unassigned</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} ({s.role_display_name})
                    </option>
                  ))}
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
                  disabled={creatingCase}
                >
                  {creatingCase ? 'Creating...' : 'Create Support Case'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STATUS CHANGE MODAL */}
      {statusModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
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
              padding: '20px',
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '14px', color: 'var(--text-primary)' }}>
              Update Case Status
            </h3>

            <form onSubmit={handleStatusSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Target Status
                </label>
                <select
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value as CaseStatus)}
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
                  <option value="OPEN">OPEN</option>
                  <option value="IN_PROGRESS">IN PROGRESS</option>
                  <option value="WAITING">WAITING</option>
                  <option value="RESOLVED">RESOLVED</option>
                  <option value="CLOSED">CLOSED</option>
                </select>
              </div>

              {(targetStatus === 'RESOLVED' || targetStatus === 'CLOSED') && (
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    Resolution Notes (Customer-visible summary)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Describe how this issue was resolved..."
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
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
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setStatusModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={updatingStatus}
                >
                  {updatingStatus ? 'Updating...' : 'Save Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSIGN STAFF MODAL */}
      {assignModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
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
              padding: '20px',
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '14px', color: 'var(--text-primary)' }}>
              Assign Case to Staff
            </h3>

            <form onSubmit={handleAssignSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Assignee
                </label>
                <select
                  value={targetStaffId}
                  onChange={(e) => setTargetStaffId(e.target.value)}
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
                  <option value="">Unassign / Free Queue</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} ({s.role_display_name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Assignment Note (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Instructions or notes for assigned staff..."
                  value={assignNote}
                  onChange={(e) => setAssignNote(e.target.value)}
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

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setAssignModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={assigning}
                >
                  {assigning ? 'Assigning...' : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TIERED ESCALATION MODAL */}
      {escalateModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '20px',
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '460px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              boxShadow: 'var(--shadow-lg)',
              padding: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ef4444',
                }}
              >
                <ShieldAlert size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Tiered Case Escalation
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Escalate to higher operational tiers by category.
                </p>
              </div>
            </div>

            <form onSubmit={handleEscalateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Target Department *
                </label>
                <select
                  value={targetEscalationDept}
                  onChange={(e) => setTargetEscalationDept(e.target.value as 'OPERATIONS' | 'FINANCE' | 'MANAGER')}
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
                  <option value="OPERATIONS">Support → Operations (Meters & Provider Vending)</option>
                  <option value="FINANCE">Support → Finance (Payment & Wallet Discrepancies)</option>
                  <option value="MANAGER">Support → Manager (High Priority & Dispute Review)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Escalation Reason & Operational Context *
                </label>
                <textarea
                  rows={3}
                  placeholder="Explain why this case requires higher-tier escalation..."
                  value={escalationReason}
                  onChange={(e) => setEscalationReason(e.target.value)}
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

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEscalateModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-danger"
                  disabled={escalating || !escalationReason.trim()}
                >
                  {escalating ? 'Escalating...' : 'Confirm Escalation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Support;
