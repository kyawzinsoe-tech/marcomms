import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  Crown,
  Shield,
  Eye,
  Building2,
  CreditCard,
  Megaphone,
  Truck,
  Sparkles,
  AlertTriangle,
  Lock,
  Activity,
  Laptop,
  RefreshCw,
  PowerOff,
  CheckCircle2,
  Filter,
  RotateCcw,
  Loader2,
  UserX
} from 'lucide-react';
import { formatDate, formatDateTime } from '../utils/formatters';
import { ROLES, PERMISSIONS, normalizeRole } from '../config/rbac';
import { useAuth } from '../context/useAuth';
import { fetchSessions, revokeSession, revokeAllUserSessions } from '../services/sessionService';
import { ErrorDialog } from './common/ErrorDialog';

export function UserManagementSection({
  users = [],
  currentUserId,
  onAddUser,
  onEditUser,
  onDeleteUser
}) {
  const { can, user: currentUser, isSuperAdmin } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');

  // Active sessions state
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionError, setSessionError] = useState('');

  // Confirmation Modals State
  const [deletingUser, setDeletingUser] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [revokingSession, setRevokingSession] = useState(null);
  const [isRevokingSingle, setIsRevokingSingle] = useState(false);

  const [bulkRevokingUser, setBulkRevokingUser] = useState(null);
  const [isRevokingBulk, setIsRevokingBulk] = useState(false);

  const [errorMessage, setErrorMessage] = useState(null);

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    setSessionError('');
    try {
      const data = await fetchSessions();
      setSessions(data);
    } catch (err) {
      setSessionError(err.message || 'Unable to retrieve active sessions.');
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Derived counts
  const superAdminCount = useMemo(
    () => users.filter((u) => normalizeRole(u.role) === ROLES.SUPER_ADMIN).length,
    [users]
  );
  const adminCount = useMemo(
    () => users.filter((u) => normalizeRole(u.role) === ROLES.ADMIN).length,
    [users]
  );
  const viewerCount = useMemo(
    () => users.filter((u) => normalizeRole(u.role) === ROLES.VIEWER).length,
    [users]
  );
  const specialistCount = useMemo(
    () =>
      users.filter((u) => {
        const r = normalizeRole(u.role);
        return (
          r === ROLES.HEAD_BRAND ||
          r === ROLES.BANK_DESIGN ||
          r === ROLES.PAY_DESIGN ||
          r === ROLES.COMMS_DESIGN ||
          r === ROLES.PROCUREMENT_OFFICER
        );
      }).length,
    [users]
  );

  // Map of active session counts per user
  const userSessionCounts = useMemo(() => {
    const counts = {};
    sessions.forEach((s) => {
      if (s.user && s.user.id) {
        counts[s.user.id] = (counts[s.user.id] || 0) + 1;
      }
    });
    return counts;
  }, [sessions]);

  // Filtered users without mutating original array
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        (u.name || '').toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
        (u.email || '').toLowerCase().includes(searchTerm.toLowerCase().trim());

      const userRole = normalizeRole(u.role);
      const matchRole = roleFilter === 'All' || userRole === roleFilter;

      return matchSearch && matchRole;
    });
  }, [users, searchTerm, roleFilter]);

  const isFilteringActive = searchTerm.trim() !== '' || roleFilter !== 'All';

  const handleResetFilters = () => {
    setSearchTerm('');
    setRoleFilter('All');
  };

  // Evaluates if the current user can edit this target user
  const canEdit = (target) => {
    const targetRole = normalizeRole(target.role);
    if (targetRole === ROLES.SUPER_ADMIN) {
      return can(PERMISSIONS.USER_UPDATE_SUPER_ADMIN, target);
    }
    if (targetRole === ROLES.ADMIN) {
      return can(PERMISSIONS.USER_UPDATE_ADMIN, target);
    }
    return can(PERMISSIONS.USER_UPDATE_VIEWER, target);
  };

  // Evaluates if the current user can delete this target user
  const canDelete = (target) => {
    const targetRole = normalizeRole(target.role);
    const isSelf = String(currentUser?.id) === String(target.id);

    // Cannot delete yourself if Super Admin
    if (isSelf && targetRole === ROLES.SUPER_ADMIN) {
      return false;
    }

    // Protection rule: Cannot delete final remaining Super Admin
    if (targetRole === ROLES.SUPER_ADMIN && superAdminCount <= 1) {
      return false;
    }

    if (targetRole === ROLES.SUPER_ADMIN) {
      return can(PERMISSIONS.USER_DELETE_SUPER_ADMIN, target, { superAdminCount });
    }
    if (targetRole === ROLES.ADMIN) {
      return can(PERMISSIONS.USER_DELETE_ADMIN, target);
    }
    return can(PERMISSIONS.USER_DELETE_VIEWER, target);
  };

  // User Deletion Handlers
  const handlePromptDeleteUser = (user) => {
    if (!canDelete(user)) return;
    setDeletingUser(user);
  };

  const handleConfirmDeleteUser = async () => {
    if (!deletingUser) return;
    setIsDeleting(true);
    try {
      await onDeleteUser?.(deletingUser);
      setDeletingUser(null);
      await loadSessions();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to delete user account.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Single Session Revocation Handlers
  const handlePromptRevokeSession = (session) => {
    setRevokingSession(session);
  };

  const handleConfirmRevokeSession = async () => {
    if (!revokingSession) return;
    setIsRevokingSingle(true);
    const isCurrent = revokingSession.isCurrent;
    try {
      await revokeSession(revokingSession.id);
      setRevokingSession(null);
      await loadSessions();
      if (isCurrent) {
        window.location.reload();
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to terminate session.');
    } finally {
      setIsRevokingSingle(false);
    }
  };

  // Bulk User Session Revocation Handlers (Super Admin)
  const handlePromptBulkRevoke = (user) => {
    if (!isSuperAdmin) return;
    setBulkRevokingUser(user);
  };

  const handleConfirmBulkRevoke = async () => {
    if (!bulkRevokingUser || !isSuperAdmin) return;
    setIsRevokingBulk(true);
    const isSelf = String(currentUser?.id) === String(bulkRevokingUser.id);
    try {
      await revokeAllUserSessions(bulkRevokingUser.id);
      setBulkRevokingUser(null);
      await loadSessions();
      if (isSelf) {
        window.location.reload();
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to terminate all sessions for user.');
    } finally {
      setIsRevokingBulk(false);
    }
  };

  const getRoleBadge = (role) => {
    const r = normalizeRole(role);
    switch (r) {
      case ROLES.SUPER_ADMIN:
        return (
          <span
            className="badge"
            style={{
              background: '#f5f3ff',
              color: '#6d28d9',
              border: '1px solid #ddd6fe',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Crown size={12} color="#8b5cf6" /> Super Admin
          </span>
        );
      case ROLES.HEAD_BRAND:
        return (
          <span
            className="badge"
            style={{
              background: '#fdf2f8',
              color: '#be185d',
              border: '1px solid #fbcfe8',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Sparkles size={12} color="#ec4899" /> Head of Brand
          </span>
        );
      case ROLES.BANK_DESIGN:
        return (
          <span
            className="badge"
            style={{
              background: '#f0f9ff',
              color: '#0369a1',
              border: '1px solid #bae6fd',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Building2 size={12} color="#0284c7" /> KBZ Bank Design
          </span>
        );
      case ROLES.PAY_DESIGN:
        return (
          <span
            className="badge"
            style={{
              background: '#eff6ff',
              color: '#1d4ed8',
              border: '1px solid #bfdbfe',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <CreditCard size={12} color="#2563eb" /> KBZPay Design
          </span>
        );
      case ROLES.COMMS_DESIGN:
        return (
          <span
            className="badge"
            style={{
              background: '#fffbeb',
              color: '#b45309',
              border: '1px solid #fde68a',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Megaphone size={12} color="#d97706" /> KBZBank Comms Design
          </span>
        );
      case ROLES.PROCUREMENT_OFFICER:
        return (
          <span
            className="badge"
            style={{
              background: '#ecfdf5',
              color: '#047857',
              border: '1px solid #a7f3d0',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Truck size={12} color="#059669" /> Procurement Officer
          </span>
        );
      case ROLES.ADMIN:
        return (
          <span
            className="badge"
            style={{
              background: '#eef2ff',
              color: '#4338ca',
              border: '1px solid #c7d2fe',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Shield size={12} color="#6366f1" /> Admin
          </span>
        );
      default:
        return (
          <span
            className="badge"
            style={{
              background: '#f8fafc',
              color: '#475569',
              border: '1px solid #cbd5e1',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Eye size={12} color="#64748b" /> Viewer
          </span>
        );
    }
  };

  return (
    <section className="card" id="user-management" aria-label="User Management & Active Sessions">
      {/* Module Header */}
      <div className="card-header">
        <div>
          <h2>
            <Users size={20} color="var(--primary)" />
            User Management & Role Governance
          </h2>
          <p>
            Configure user accounts, assign Role-Based Access Controls (RBAC), and monitor active authentication sessions.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={loadSessions}
            disabled={sessionsLoading}
            title="Refresh active session monitoring"
            aria-label="Refresh active sessions"
          >
            <RefreshCw size={13} className={sessionsLoading ? 'animate-spin' : ''} /> Refresh Sessions
          </button>

          {can(PERMISSIONS.USER_CREATE_VIEWER) && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={onAddUser}
              title="Provision a new user account"
              aria-label="New user account"
            >
              <Plus size={15} /> Add User Account
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Metrics Bar */}
      <div className="sub-summary-bar">
        <div className="sub-summary-item">
          <Users size={14} className="sub-summary-icon" />
          <span>
            <b>{users.length}</b> Total User{users.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="sub-summary-item">
          <Crown size={14} style={{ color: '#8b5cf6' }} />
          <span>
            <b>{superAdminCount}</b> Super Admin{superAdminCount === 1 ? '' : 's'}
          </span>
        </div>

        <div className="sub-summary-item">
          <Shield size={14} style={{ color: 'var(--primary)' }} />
          <span>
            <b>{adminCount}</b> Administrator{adminCount === 1 ? '' : 's'}
          </span>
        </div>

        <div className="sub-summary-item">
          <Sparkles size={14} style={{ color: '#ec4899' }} />
          <span>
            <b>{specialistCount}</b> Specialist{specialistCount === 1 ? '' : 's'}
          </span>
        </div>

        <div className="sub-summary-item">
          <Laptop size={14} className="sub-summary-icon cost" />
          <span>
            <b>{sessions.length}</b> Active Session{sessions.length === 1 ? '' : 's'}
          </span>
        </div>

        {isFilteringActive && (
          <div className="sub-summary-item">
            <Filter size={14} className="sub-summary-icon cost" />
            <span>
              <b>{filteredUsers.length}</b> Matching Filters
            </span>
          </div>
        )}
      </div>

      {/* Command & Filter Bar */}
      <div className="table-filter-bar">
        <div className="search-input-wrap">
          <Search size={15} className="search-input-icon" />
          <input
            type="text"
            placeholder="Search users by full name or work email address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Search users"
          />
        </div>

        <div className="select-input-wrap">
          <Shield size={14} className="filter-input-icon" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            aria-label="Filter by assigned role"
            style={{ minWidth: '190px' }}
          >
            <option value="All">All Roles</option>
            <option value={ROLES.SUPER_ADMIN}>Super Admin ({superAdminCount})</option>
            <option value={ROLES.ADMIN}>Admin ({adminCount})</option>
            <option value={ROLES.HEAD_BRAND}>Head of Brand</option>
            <option value={ROLES.BANK_DESIGN}>KBZ Bank Design</option>
            <option value={ROLES.PAY_DESIGN}>KBZPay Design</option>
            <option value={ROLES.COMMS_DESIGN}>KBZBank Comms Design</option>
            <option value={ROLES.PROCUREMENT_OFFICER}>Procurement Officer</option>
            <option value={ROLES.VIEWER}>Viewer ({viewerCount})</option>
          </select>
        </div>

        {isFilteringActive && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={handleResetFilters}
            title="Clear all search and filter criteria"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            <RotateCcw size={12} /> Reset ({filteredUsers.length}/{users.length})
          </button>
        )}
      </div>

      {/* User Directory Table */}
      <div style={{ marginBottom: '28px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px' }}>
          Registered User Accounts
        </h3>

        {filteredUsers.length === 0 ? (
          <div className="empty-state" style={{ padding: '36px 20px' }}>
            <div className="empty-state-icon">
              <Users size={26} color="var(--primary)" />
            </div>
            <b>No users found</b>
            <p>
              {isFilteringActive
                ? 'No user accounts match the current filter criteria.'
                : 'No registered user accounts found.'}
            </p>
            {isFilteringActive && (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={handleResetFilters}
                style={{ marginTop: '8px' }}
              >
                <RotateCcw size={13} /> Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div className="table-container">
            <table className="table" aria-label="User Accounts Table">
              <thead>
                <tr>
                  <th scope="col" style={{ width: '30%' }}>User</th>
                  <th scope="col" style={{ width: '22%' }}>Assigned Role (RBAC)</th>
                  <th scope="col" style={{ width: '16%' }}>Created Date</th>
                  <th scope="col" style={{ width: '16%' }}>Active Sessions</th>
                  <th scope="col" style={{ textAlign: 'right', minWidth: '110px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const isCurrent = String(u.id) === String(currentUserId);
                  const activeSessionsCount = userSessionCounts[u.id] || 0;
                  const canUserEdit = canEdit(u);
                  const canUserDelete = canDelete(u);

                  return (
                    <tr key={u.id}>
                      {/* User Column */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <img
                            src={
                              u.avatar ||
                              `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(u.email || 'user')}`
                            }
                            alt={u.name}
                            style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: 'var(--radius-full)',
                              objectFit: 'cover',
                              border: '1px solid var(--border-light)',
                              flexShrink: 0
                            }}
                          />
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '13px' }}>
                              {u.name}{' '}
                              {isCurrent && (
                                <span
                                  style={{
                                    fontSize: '10px',
                                    background: 'var(--primary-50)',
                                    color: 'var(--primary-active)',
                                    padding: '1px 6px',
                                    borderRadius: 'var(--radius-xs)',
                                    fontWeight: 700,
                                    marginLeft: '4px'
                                  }}
                                >
                                  You
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                              {u.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role Column */}
                      <td>{getRoleBadge(u.role)}</td>

                      {/* Created Date */}
                      <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {u.createdAt ? formatDate(u.createdAt) : '—'}
                      </td>

                      {/* Active Sessions Count */}
                      <td>
                        {activeSessionsCount > 0 ? (
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '12px',
                              color: 'var(--success-text)',
                              fontWeight: 600
                            }}
                          >
                            <span
                              style={{
                                width: '7px',
                                height: '7px',
                                borderRadius: '50%',
                                background: 'var(--success)',
                                display: 'inline-block'
                              }}
                            />
                            <span>{activeSessionsCount} active device{activeSessionsCount === 1 ? '' : 's'}</span>
                          </div>
                        ) : (
                          <span style={{ fontSize: '12px', color: 'var(--text-subtle)' }}>0 sessions</span>
                        )}
                      </td>

                      {/* Actions Column */}
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px', justifyContent: 'flex-end' }}>
                          {/* Super Admin Bulk Terminate Sessions */}
                          {isSuperAdmin && activeSessionsCount > 0 && (
                            <button
                              type="button"
                              className="action-btn"
                              onClick={() => handlePromptBulkRevoke(u)}
                              title={`Terminate all ${activeSessionsCount} active session(s) for ${u.name}`}
                              aria-label={`Terminate all sessions for ${u.name}`}
                              style={{ color: 'var(--warning-text)' }}
                            >
                              <UserX size={13} />
                            </button>
                          )}

                          {canUserEdit && (
                            <button
                              type="button"
                              className="action-btn action-edit"
                              onClick={() => onEditUser?.(u)}
                              title={`Edit user ${u.name}`}
                              aria-label={`Edit user ${u.name}`}
                            >
                              <Edit size={13} />
                            </button>
                          )}

                          {canUserDelete && (
                            <button
                              type="button"
                              className="action-btn action-delete"
                              onClick={() => handlePromptDeleteUser(u)}
                              title={`Delete user account ${u.name}`}
                              aria-label={`Delete user account ${u.name}`}
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Active Login Sessions Monitoring Section */}
      <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              <Activity size={16} color="var(--primary)" style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }} />
              Active Login Sessions & Device Governance
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
              {isSuperAdmin
                ? 'Real-time overview of all authenticated user sessions across the Marcomms platform.'
                : 'Your currently active sessions on this and other devices.'}
            </p>
          </div>

          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={loadSessions}
            disabled={sessionsLoading}
          >
            <RefreshCw size={12} className={sessionsLoading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {sessionsLoading ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
            <RefreshCw size={22} className="animate-spin" style={{ margin: '0 auto 8px', color: 'var(--primary)' }} />
            <p style={{ fontSize: '12.5px' }}>Loading active sessions...</p>
          </div>
        ) : sessionError ? (
          <div className="empty-state" style={{ padding: '24px' }}>
            <AlertTriangle size={24} color="var(--danger)" />
            <p style={{ color: 'var(--danger-text)' }}>{sessionError}</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="empty-state" style={{ padding: '28px 20px' }}>
            <Laptop size={24} color="var(--text-muted)" />
            <b>No active sessions recorded</b>
            <p>Active login sessions will appear here upon user authentication.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table" aria-label="Active Sessions Table">
              <thead>
                <tr>
                  <th scope="col" style={{ width: '26%' }}>User / Account</th>
                  <th scope="col" style={{ width: '28%' }}>Device / User Agent</th>
                  <th scope="col" style={{ width: '16%' }}>Login Time</th>
                  <th scope="col" style={{ width: '16%' }}>Last Seen</th>
                  <th scope="col" style={{ textAlign: 'right', width: '14%' }}>Session Action</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id}>
                    {/* User */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <img
                          src={
                            s.user?.avatar ||
                            `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(s.user?.email || 'user')}`
                          }
                          alt={s.user?.name || 'User'}
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: 'var(--radius-full)',
                            border: '1px solid var(--border-light)',
                            flexShrink: 0
                          }}
                        />
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '12.5px' }}>
                            {s.user?.name || 'Unknown User'}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {s.user?.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Device */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Laptop size={14} color="var(--text-muted)" />
                        <span
                          style={{
                            fontSize: '12px',
                            color: 'var(--text-secondary)',
                            maxWidth: '240px',
                            display: '-webkit-box',
                            WebkitLineClamp: 1,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}
                          title={s.device}
                        >
                          {s.device}
                        </span>
                      </div>
                      {s.isCurrent && (
                        <div style={{ marginTop: '2px' }}>
                          <span
                            style={{
                              fontSize: '10px',
                              background: 'var(--success-light)',
                              color: 'var(--success-text)',
                              padding: '1px 6px',
                              borderRadius: 'var(--radius-xs)',
                              fontWeight: 700,
                              border: '1px solid var(--success-border)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px'
                            }}
                          >
                            <CheckCircle2 size={9} /> This Device (Current Session)
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Login Time */}
                    <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {s.loginAt ? formatDateTime(s.loginAt) : '—'}
                    </td>

                    {/* Last Seen */}
                    <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: 'var(--success)',
                            display: 'inline-block'
                          }}
                        />
                        <span>{s.lastSeenAt ? formatDateTime(s.lastSeenAt) : 'Active now'}</span>
                      </div>
                    </td>

                    {/* Terminate Action */}
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => handlePromptRevokeSession(s)}
                        style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          color: s.isCurrent ? 'var(--danger-text)' : 'inherit',
                          borderColor: s.isCurrent ? 'var(--danger-border)' : 'var(--border-default)'
                        }}
                        title={s.isCurrent ? 'Log out of this current session' : 'Terminate remote session'}
                        aria-label={`Terminate session on ${s.device}`}
                      >
                        <PowerOff size={11} /> {s.isCurrent ? 'Log Out' : 'Terminate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Safe User Deletion Confirmation Dialog */}
      {deletingUser && (
        <div className="modal-overlay" onClick={() => !isDeleting && setDeletingUser(null)}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-user-dialog-title"
            style={{ maxWidth: '480px' }}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--danger-light)',
                    display: 'grid',
                    placeItems: 'center',
                    color: 'var(--danger-text)',
                    flexShrink: 0
                  }}
                >
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <h3 id="delete-user-dialog-title" style={{ fontSize: '16px' }}>Confirm Permanent Deletion</h3>
                  <p style={{ fontSize: '12.5px' }}>This action cannot be undone.</p>
                </div>
              </div>
            </div>

            <div style={{ margin: '14px 0', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Are you sure you want to permanently delete user account{' '}
              <b style={{ color: 'var(--text-primary)' }}>"{deletingUser.name}"</b> ({deletingUser.email})? All associated access permissions will be immediately revoked.
            </div>

            <div className="modal-footer" style={{ marginTop: '20px' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setDeletingUser(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleConfirmDeleteUser}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Safe Single Session Revocation Dialog */}
      {revokingSession && (
        <div className="modal-overlay" onClick={() => !isRevokingSingle && setRevokingSession(null)}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="revoke-session-dialog-title"
            style={{ maxWidth: '480px' }}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: 'var(--radius-md)',
                    background: revokingSession.isCurrent ? 'var(--danger-light)' : 'var(--warning-light)',
                    display: 'grid',
                    placeItems: 'center',
                    color: revokingSession.isCurrent ? 'var(--danger-text)' : 'var(--warning-text)',
                    flexShrink: 0
                  }}
                >
                  <PowerOff size={18} />
                </div>
                <div>
                  <h3 id="revoke-session-dialog-title" style={{ fontSize: '16px' }}>
                    {revokingSession.isCurrent ? 'Terminate Current Session?' : 'Terminate Session?'}
                  </h3>
                  <p style={{ fontSize: '12.5px' }}>
                    {revokingSession.isCurrent ? 'You will be logged out immediately.' : 'The selected device will be disconnected.'}
                  </p>
                </div>
              </div>
            </div>

            <div style={{ margin: '14px 0', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {revokingSession.isCurrent ? (
                <>
                  You are terminating your <b>current active session</b> on <span style={{ fontFamily: 'var(--font-mono)' }}>{revokingSession.device}</span>. You will be logged out and returned to the sign-in screen.
                </>
              ) : (
                <>
                  Terminate active session for <b style={{ color: 'var(--text-primary)' }}>{revokingSession.user?.name || 'User'}</b> on device <span style={{ fontFamily: 'var(--font-mono)' }}>{revokingSession.device}</span>?
                </>
              )}
            </div>

            <div className="modal-footer" style={{ marginTop: '20px' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setRevokingSession(null)}
                disabled={isRevokingSingle}
              >
                Cancel
              </button>
              <button
                type="button"
                className={revokingSession.isCurrent ? 'btn btn-danger' : 'btn btn-primary'}
                onClick={handleConfirmRevokeSession}
                disabled={isRevokingSingle}
              >
                {isRevokingSingle ? 'Terminating...' : (revokingSession.isCurrent ? 'Log Out Now' : 'Terminate Session')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Safe Bulk User Session Revocation Dialog (Super Admin) */}
      {bulkRevokingUser && (
        <div className="modal-overlay" onClick={() => !isRevokingBulk && setBulkRevokingUser(null)}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="bulk-revoke-dialog-title"
            style={{ maxWidth: '500px' }}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--warning-light)',
                    display: 'grid',
                    placeItems: 'center',
                    color: 'var(--warning-text)',
                    flexShrink: 0
                  }}
                >
                  <UserX size={18} />
                </div>
                <div>
                  <h3 id="bulk-revoke-dialog-title" style={{ fontSize: '16px' }}>Terminate All User Sessions</h3>
                  <p style={{ fontSize: '12.5px' }}>Super Administrator Governance Action</p>
                </div>
              </div>
            </div>

            <div style={{ margin: '14px 0', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Are you sure you want to terminate <b>all active sessions</b> for{' '}
              <b style={{ color: 'var(--text-primary)' }}>"{bulkRevokingUser.name}"</b> ({bulkRevokingUser.email})? All logged-in devices for this account will be disconnected immediately.
            </div>

            <div className="modal-footer" style={{ marginTop: '20px' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setBulkRevokingUser(null)}
                disabled={isRevokingBulk}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleConfirmBulkRevoke}
                disabled={isRevokingBulk}
              >
                {isRevokingBulk ? 'Terminating All...' : 'Terminate All Sessions'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Centered Error Dialog */}
      <ErrorDialog
        isOpen={Boolean(errorMessage)}
        title="User Governance Alert"
        message={errorMessage}
        onClose={() => setErrorMessage(null)}
      />
    </section>
  );
}
