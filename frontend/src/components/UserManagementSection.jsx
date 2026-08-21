import React, { useState, useMemo } from 'react';
import {
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  Crown,
  Shield,
  Eye,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock
} from 'lucide-react';
import { formatDate } from '../utils/formatters';

export function UserManagementSection({
  users,
  currentUserId,
  currentUserRole,
  isSuperAdmin = false,
  onAddUser,
  onEditUser,
  onDeleteUser
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [deletingUser, setDeletingUser] = useState(null);

  const superAdminCount = useMemo(() => users.filter((u) => u.role === 'super_admin').length, [users]);
  const adminCount = useMemo(() => users.filter((u) => u.role === 'admin').length, [users]);
  const viewerCount = useMemo(() => users.filter((u) => u.role === 'viewer' || u.role === 'user').length, [users]);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase());

      const isViewer = u.role === 'viewer' || u.role === 'user';
      const matchRole =
        roleFilter === 'All' ||
        (roleFilter === 'super_admin' && u.role === 'super_admin') ||
        (roleFilter === 'admin' && u.role === 'admin') ||
        (roleFilter === 'viewer' && isViewer);

      return matchSearch && matchRole;
    });
  }, [users, searchTerm, roleFilter]);

  // Check if current user can edit target
  const canEditUser = (target) => {
    if (isSuperAdmin) return true;
    if (currentUserRole === 'admin') {
      if (target.role === 'super_admin') return false;
      if (target.role === 'admin' && target.id !== currentUserId) return false;
      return true; // Admin can edit Viewers and self
    }
    return false;
  };

  // Check if current user can delete target
  const canDeleteUser = (target) => {
    if (target.id === currentUserId) return false; // Cannot delete self
    if (target.role === 'super_admin' && superAdminCount <= 1) return false; // Last Super Admin protection

    if (isSuperAdmin) return true;
    if (currentUserRole === 'admin') {
      if (target.role === 'super_admin' || target.role === 'admin') return false;
      return true; // Admin can only delete Viewers
    }
    return false;
  };

  const handleConfirmDelete = () => {
    if (!deletingUser) return;
    onDeleteUser(deletingUser.id);
    setDeletingUser(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <section className="card" id="users">
        <div className="card-header">
          <div>
            <h2>
              <Users size={20} color="#6366f1" />
              Role & User Management (RBAC)
            </h2>
            <p>
              {isSuperAdmin
                ? 'Manage all Super Admin, Admin, and Viewer roles with full system authority.'
                : 'Manage Viewer accounts. Super Admin accounts have elevated permissions.'}
            </p>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={onAddUser}
          >
            <Plus size={16} /> Create User Account
          </button>
        </div>

        {/* User stats summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '20px' }}>
          <div style={{ padding: '14px 16px', background: 'var(--bg-secondary, #f8fafc)', borderRadius: '10px', border: '1px solid var(--border-color, #e2e8f0)' }}>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Total Accounts</div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{users.length}</div>
          </div>
          <div style={{ padding: '14px 16px', background: '#faf5ff', borderRadius: '10px', border: '1px solid #e9d5ff' }}>
            <div style={{ fontSize: '12px', color: '#7e22ce', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Crown size={13} /> Super Admins
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#581c87', marginTop: '2px' }}>{superAdminCount}</div>
          </div>
          <div style={{ padding: '14px 16px', background: '#eef2ff', borderRadius: '10px', border: '1px solid #c7d2fe' }}>
            <div style={{ fontSize: '12px', color: '#4338ca', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Shield size={13} /> Administrators
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#312e81', marginTop: '2px' }}>{adminCount}</div>
          </div>
          <div style={{ padding: '14px 16px', background: '#eff6ff', borderRadius: '10px', border: '1px solid #bfdbfe' }}>
            <div style={{ fontSize: '12px', color: '#1d4ed8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Eye size={13} /> Viewers
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#1e3a8a', marginTop: '2px' }}>{viewerCount}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1', minWidth: '220px' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8'
              }}
            />
            <input
              type="text"
              placeholder="Search users by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', paddingLeft: '36px' }}
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{ width: '190px' }}
          >
            <option value="All">All Roles ({users.length})</option>
            <option value="super_admin">Super Admins ({superAdminCount})</option>
            <option value="admin">Admins ({adminCount})</option>
            <option value="viewer">Viewers ({viewerCount})</option>
          </select>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role (RBAC)</th>
                <th>Created Date</th>
                <th>Privilege Level</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                    No users found matching your search.
                  </td>
                </tr>
              ) : (
                filtered.map((u) => {
                  const isSelf = u.id === currentUserId;
                  const isSuperAdminRole = u.role === 'super_admin';
                  const isAdminRole = u.role === 'admin';
                  const isLastSuperAdmin = isSuperAdminRole && superAdminCount <= 1;

                  const editable = canEditUser(u);
                  const deletable = canDeleteUser(u);

                  return (
                    <tr key={u.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <img
                            src={u.avatar}
                            alt={u.name}
                            style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '50%',
                              objectFit: 'cover',
                              border: isSuperAdminRole ? '2px solid #8b5cf6' : '1px solid #e2e8f0'
                            }}
                          />
                          <div>
                            <strong style={{ color: '#0f172a' }}>{u.name}</strong>
                            {isSelf && (
                              <span
                                style={{
                                  marginLeft: '6px',
                                  fontSize: '10px',
                                  background: '#e0e7ff',
                                  color: '#4338ca',
                                  padding: '1px 6px',
                                  borderRadius: '99px',
                                  fontWeight: 700
                                }}
                              >
                                YOU
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ color: '#475569' }}>{u.email}</td>
                      <td>
                        {isSuperAdminRole ? (
                          <span
                            className="badge"
                            style={{
                              padding: '4px 9px',
                              fontSize: '11px',
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              background: '#f3e8ff',
                              color: '#7e22ce',
                              border: '1px solid #d8b4fe'
                            }}
                          >
                            <Crown size={12} color="#9333ea" /> SUPER ADMIN
                          </span>
                        ) : isAdminRole ? (
                          <span
                            className="badge"
                            style={{
                              padding: '4px 9px',
                              fontSize: '11px',
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              background: '#eef2ff',
                              color: '#4338ca',
                              border: '1px solid #c7d2fe'
                            }}
                          >
                            <Shield size={12} /> ADMIN
                          </span>
                        ) : (
                          <span
                            className="badge"
                            style={{
                              padding: '4px 9px',
                              fontSize: '11px',
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              background: '#eff6ff',
                              color: '#1d4ed8',
                              border: '1px solid #bfdbfe'
                            }}
                          >
                            <Eye size={12} /> VIEWER
                          </span>
                        )}
                      </td>
                      <td>{formatDate(u.createdAt)}</td>
                      <td style={{ fontSize: '12px', fontWeight: 600 }}>
                        {isSuperAdminRole ? (
                          <span style={{ color: '#7e22ce' }}>Full System Access & Roles</span>
                        ) : isAdminRole ? (
                          <span style={{ color: '#059669' }}>Operations & Viewer Mgmt</span>
                        ) : (
                          <span style={{ color: '#64748b' }}>Read-Only (Dashboard)</span>
                        )}
                      </td>
                      <td>
                        <div className="table-actions">
                          {editable ? (
                            <button
                              type="button"
                              className="action-btn action-edit"
                              title="Edit user details & role"
                              onClick={() => onEditUser(u)}
                            >
                              <Edit size={14} />
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="action-btn"
                              style={{ opacity: 0.35, cursor: 'not-allowed' }}
                              title="Insufficient permissions to edit this role"
                              disabled
                            >
                              <Lock size={14} />
                            </button>
                          )}

                          {deletable ? (
                            <button
                              type="button"
                              className="action-btn action-delete"
                              title="Delete user"
                              onClick={() => setDeletingUser(u)}
                            >
                              <Trash2 size={14} />
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="action-btn"
                              style={{ opacity: 0.35, cursor: 'not-allowed' }}
                              title={
                                isLastSuperAdmin
                                  ? 'Protected: Last remaining Super Admin'
                                  : isSelf
                                  ? 'Cannot delete your own active account'
                                  : 'Insufficient permissions to delete this account'
                              }
                              disabled
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* 3-Tier RBAC Permissions Matrix Card */}
      <section className="card">
        <div className="card-header">
          <div>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', margin: 0 }}>
              <ShieldCheck size={18} color="#059669" />
              Role-Based Access Control (RBAC) 3-Tier Matrix
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
              Summary of system authority across Super Admin, Admin, and Viewer roles.
            </p>
          </div>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>System Capability</th>
                <th style={{ width: '160px', textAlign: 'center', color: '#6d28d9' }}>👑 Super Admin</th>
                <th style={{ width: '160px', textAlign: 'center', color: '#4338ca' }}>🛡️ Admin</th>
                <th style={{ width: '160px', textAlign: 'center', color: '#1d4ed8' }}>👁️ Viewer</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>Dashboard & Analytics</strong>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>View KPIs, trend charts, burn analytics, PDF reports</div>
                </td>
                <td style={{ textAlign: 'center', color: '#059669', fontWeight: 600 }}>
                  <CheckCircle2 size={16} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Full Access
                </td>
                <td style={{ textAlign: 'center', color: '#059669', fontWeight: 600 }}>
                  <CheckCircle2 size={16} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Full Access
                </td>
                <td style={{ textAlign: 'center', color: '#059669', fontWeight: 600 }}>
                  <CheckCircle2 size={16} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Read-Only
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Subscriptions Management</strong>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Create, modify, archive, and delete tool subscriptions</div>
                </td>
                <td style={{ textAlign: 'center', color: '#059669', fontWeight: 600 }}>
                  <CheckCircle2 size={16} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Full CRUD
                </td>
                <td style={{ textAlign: 'center', color: '#059669', fontWeight: 600 }}>
                  <CheckCircle2 size={16} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Full CRUD
                </td>
                <td style={{ textAlign: 'center', color: '#dc2626', fontWeight: 600 }}>
                  <XCircle size={16} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> View Only
                </td>
              </tr>
              <tr>
                <td>
                  <strong>AI Token Entries & Budgets</strong>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Record token expenditures, modify allotments</div>
                </td>
                <td style={{ textAlign: 'center', color: '#059669', fontWeight: 600 }}>
                  <CheckCircle2 size={16} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Full CRUD
                </td>
                <td style={{ textAlign: 'center', color: '#059669', fontWeight: 600 }}>
                  <CheckCircle2 size={16} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Full CRUD
                </td>
                <td style={{ textAlign: 'center', color: '#dc2626', fontWeight: 600 }}>
                  <XCircle size={16} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> View Only
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Automated Email Alerts</strong>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Dispatch serverless renewal reminder emails</div>
                </td>
                <td style={{ textAlign: 'center', color: '#059669', fontWeight: 600 }}>
                  <CheckCircle2 size={16} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Allowed
                </td>
                <td style={{ textAlign: 'center', color: '#059669', fontWeight: 600 }}>
                  <CheckCircle2 size={16} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Allowed
                </td>
                <td style={{ textAlign: 'center', color: '#dc2626', fontWeight: 600 }}>
                  <XCircle size={16} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Restricted
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Create Super Admin Accounts</strong>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Provision new Super Administrator users</div>
                </td>
                <td style={{ textAlign: 'center', color: '#059669', fontWeight: 600 }}>
                  <CheckCircle2 size={16} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Allowed
                </td>
                <td style={{ textAlign: 'center', color: '#dc2626', fontWeight: 600 }}>
                  <XCircle size={16} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> No Access
                </td>
                <td style={{ textAlign: 'center', color: '#dc2626', fontWeight: 600 }}>
                  <XCircle size={16} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> No Access
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Create Admin Accounts</strong>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Provision operational Administrator users</div>
                </td>
                <td style={{ textAlign: 'center', color: '#059669', fontWeight: 600 }}>
                  <CheckCircle2 size={16} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Allowed
                </td>
                <td style={{ textAlign: 'center', color: '#dc2626', fontWeight: 600 }}>
                  <XCircle size={16} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> No Access
                </td>
                <td style={{ textAlign: 'center', color: '#dc2626', fontWeight: 600 }}>
                  <XCircle size={16} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> No Access
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Create / Manage Viewer Accounts</strong>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Provision and manage read-only dashboard viewers</div>
                </td>
                <td style={{ textAlign: 'center', color: '#059669', fontWeight: 600 }}>
                  <CheckCircle2 size={16} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Allowed
                </td>
                <td style={{ textAlign: 'center', color: '#059669', fontWeight: 600 }}>
                  <CheckCircle2 size={16} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Allowed
                </td>
                <td style={{ textAlign: 'center', color: '#dc2626', fontWeight: 600 }}>
                  <XCircle size={16} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> No Access
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Delete Any Account</strong>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Delete Super Admin, Admin, and Viewer accounts</div>
                </td>
                <td style={{ textAlign: 'center', color: '#059669', fontWeight: 600 }}>
                  <CheckCircle2 size={16} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Full Authority
                </td>
                <td style={{ textAlign: 'center', color: '#b45309', fontWeight: 600 }}>
                  Viewers Only
                </td>
                <td style={{ textAlign: 'center', color: '#dc2626', fontWeight: 600 }}>
                  <XCircle size={16} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> No Access
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Data Import & System Reset</strong>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Restore JSON snapshots or reset database</div>
                </td>
                <td style={{ textAlign: 'center', color: '#059669', fontWeight: 600 }}>
                  <CheckCircle2 size={16} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Allowed
                </td>
                <td style={{ textAlign: 'center', color: '#059669', fontWeight: 600 }}>
                  <CheckCircle2 size={16} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Allowed
                </td>
                <td style={{ textAlign: 'center', color: '#dc2626', fontWeight: 600 }}>
                  <XCircle size={16} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Export Only
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Delete Confirmation Modal */}
      {deletingUser && (
        <div className="modal-overlay" onClick={() => setDeletingUser(null)}>
          <div className="modal-card" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ textAlign: 'center', padding: '12px 0 8px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#fee2e2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <AlertTriangle size={24} />
              </div>
              <h3 style={{ margin: '0 0 6px', fontSize: '18px', color: '#0f172a' }}>Delete User Account?</h3>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                Are you sure you want to permanently delete <strong>{deletingUser.name}</strong> ({deletingUser.email})?
              </p>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', margin: '16px 0', fontSize: '12px', color: '#475569' }}>
              <div><strong>Role:</strong> {deletingUser.role.toUpperCase()}</div>
              <div><strong>Created:</strong> {formatDate(deletingUser.createdAt)}</div>
              <div style={{ color: '#dc2626', marginTop: '6px', fontWeight: 600 }}>
                This user will immediately lose all access to Creative Subscription Hub.
              </div>
            </div>

            <div className="modal-footer" style={{ justifyContent: 'center', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setDeletingUser(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleConfirmDelete}
              >
                Confirm Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
