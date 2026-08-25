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
  Building2,
  CreditCard,
  Megaphone,
  Truck,
  Sparkles,
  AlertTriangle,
  Lock
} from 'lucide-react';
import { formatDate } from '../utils/formatters';
import { ROLES, PERMISSIONS, normalizeRole } from '../config/rbac';
import { useAuth } from '../context/useAuth';

export function UserManagementSection({
  users,
  currentUserId,
  onAddUser,
  onEditUser,
  onDeleteUser
}) {
  const { can, user: currentUser, isSuperAdmin } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [deletingUser, setDeletingUser] = useState(null);

  const superAdminCount = useMemo(() => users.filter((u) => normalizeRole(u.role) === ROLES.SUPER_ADMIN).length, [users]);
  const adminCount = useMemo(() => users.filter((u) => normalizeRole(u.role) === ROLES.ADMIN).length, [users]);
  const viewerCount = useMemo(() => users.filter((u) => normalizeRole(u.role) === ROLES.VIEWER).length, [users]);
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

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(searchTerm.toLowerCase());

      const userRole = normalizeRole(u.role);
      const matchRole = roleFilter === 'All' || userRole === roleFilter;

      return matchSearch && matchRole;
    });
  }, [users, searchTerm, roleFilter]);

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
    if (targetRole === ROLES.SUPER_ADMIN) {
      return can(PERMISSIONS.USER_DELETE_SUPER_ADMIN, target, { superAdminCount });
    }
    if (targetRole === ROLES.ADMIN) {
      return can(PERMISSIONS.USER_DELETE_ADMIN, target);
    }
    return can(PERMISSIONS.USER_DELETE_VIEWER, target);
  };

  const handleConfirmDelete = () => {
    if (!deletingUser) return;
    onDeleteUser(deletingUser.id);
    setDeletingUser(null);
  };

  const renderRoleBadge = (role) => {
    const norm = normalizeRole(role);
    switch (norm) {
      case ROLES.SUPER_ADMIN:
        return (
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
        );
      case ROLES.HEAD_BRAND:
        return (
          <span
            className="badge"
            style={{
              padding: '4px 9px',
              fontSize: '11px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              background: '#fdf2f8',
              color: '#be185d',
              border: '1px solid #fbcfe8'
            }}
          >
            <Sparkles size={12} color="#ec4899" /> HEAD OF BRAND
          </span>
        );
      case ROLES.BANK_DESIGN:
        return (
          <span
            className="badge"
            style={{
              padding: '4px 9px',
              fontSize: '11px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              background: '#f0f9ff',
              color: '#0369a1',
              border: '1px solid #bae6fd'
            }}
          >
            <Building2 size={12} color="#0284c7" /> BANK DESIGN
          </span>
        );
      case ROLES.PAY_DESIGN:
        return (
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
            <CreditCard size={12} color="#2563eb" /> PAY DESIGN
          </span>
        );
      case ROLES.COMMS_DESIGN:
        return (
          <span
            className="badge"
            style={{
              padding: '4px 9px',
              fontSize: '11px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              background: '#fffbeb',
              color: '#b45309',
              border: '1px solid #fde68a'
            }}
          >
            <Megaphone size={12} color="#d97706" /> COMMS DESIGN
          </span>
        );
      case ROLES.PROCUREMENT_OFFICER:
        return (
          <span
            className="badge"
            style={{
              padding: '4px 9px',
              fontSize: '11px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              background: '#ecfdf5',
              color: '#047857',
              border: '1px solid #a7f3d0'
            }}
          >
            <Truck size={12} color="#059669" /> PROCUREMENT
          </span>
        );
      case ROLES.ADMIN:
        return (
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
            <Shield size={12} color="#6366f1" /> ADMIN
          </span>
        );
      default:
        return (
          <span
            className="badge"
            style={{
              padding: '4px 9px',
              fontSize: '11px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              background: '#f8fafc',
              color: '#475569',
              border: '1px solid #e2e8f0'
            }}
          >
            <Eye size={12} color="#64748b" /> VIEWER
          </span>
        );
    }
  };

  const renderPrivilegeDescription = (role) => {
    const norm = normalizeRole(role);
    switch (norm) {
      case ROLES.SUPER_ADMIN:
        return <span style={{ color: '#7e22ce' }}>Full System Access & All Roles</span>;
      case ROLES.HEAD_BRAND:
        return <span style={{ color: '#be185d' }}>Brand Governance & Proof Approvals</span>;
      case ROLES.BANK_DESIGN:
        return <span style={{ color: '#0369a1' }}>KBZ Bank Asset Library CRUD</span>;
      case ROLES.PAY_DESIGN:
        return <span style={{ color: '#1d4ed8' }}>KBZPay Asset Library CRUD</span>;
      case ROLES.COMMS_DESIGN:
        return <span style={{ color: '#b45309' }}>Comms Asset Library CRUD</span>;
      case ROLES.PROCUREMENT_OFFICER:
        return <span style={{ color: '#047857' }}>Suppliers & Production Orders CRUD</span>;
      case ROLES.ADMIN:
        return <span style={{ color: '#059669' }}>Operations & Viewer Account Mgmt</span>;
      default:
        return <span style={{ color: '#64748b' }}>Universal Read-Only Access</span>;
    }
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
                ? 'Super Administrator panel: provision and assign role permissions across Brand Assets, Procurement, Operations, and Analytics.'
                : 'Administrator panel: provision and manage Viewer accounts.'}
            </p>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={onAddUser}
          >
            <Plus size={16} /> {isSuperAdmin ? 'Provision User Account' : 'Create Viewer Account'}
          </button>
        </div>

        {/* User stats summary */}
        <div className="user-stats-grid">
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
          <div style={{ padding: '14px 16px', background: '#fdf2f8', borderRadius: '10px', border: '1px solid #fbcfe8' }}>
            <div style={{ fontSize: '12px', color: '#be185d', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Sparkles size={13} /> Specialists
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#9d174d', marginTop: '2px' }}>{specialistCount}</div>
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

        <div className="user-filter-bar">
          <div className="user-search-wrap">
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
            className="user-role-select"
          >
            <option value="All">All Roles ({users.length})</option>
            <option value={ROLES.SUPER_ADMIN}>Super Admin ({superAdminCount})</option>
            <option value={ROLES.HEAD_BRAND}>Head of Brand</option>
            <option value={ROLES.BANK_DESIGN}>KBZ Bank Design</option>
            <option value={ROLES.PAY_DESIGN}>KBZPay Design</option>
            <option value={ROLES.COMMS_DESIGN}>KBZBank Comms Design</option>
            <option value={ROLES.PROCUREMENT_OFFICER}>Procurement Officer</option>
            <option value={ROLES.ADMIN}>Administrator ({adminCount})</option>
            <option value={ROLES.VIEWER}>Viewer ({viewerCount})</option>
          </select>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Assigned Role</th>
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
                  const targetRole = normalizeRole(u.role);
                  const isSelf = String(u.id) === String(currentUserId) || u.email.toLowerCase() === currentUser?.email?.toLowerCase();
                  const isSuperAdminRole = targetRole === ROLES.SUPER_ADMIN;
                  const isLastSuperAdmin = isSuperAdminRole && superAdminCount <= 1;

                  const editable = canEdit(u);
                  const deletable = canDelete(u);

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
                      <td>{renderRoleBadge(u.role)}</td>
                      <td>{formatDate(u.createdAt)}</td>
                      <td style={{ fontSize: '12px', fontWeight: 600 }}>
                        {renderPrivilegeDescription(u.role)}
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
                              style={{ opacity: 0.3, cursor: 'not-allowed' }}
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
                              style={{ opacity: 0.3, cursor: 'not-allowed' }}
                              title={
                                isLastSuperAdmin
                                  ? 'Protection active: Final remaining Super Admin'
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

      {/* Delete Confirmation Modal */}
      {deletingUser && (
        <div className="modal-overlay" onClick={() => setDeletingUser(null)}>
          <div className="modal-card" style={{ maxWidth: '460px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ textAlign: 'center', padding: '12px 0 8px' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#fee2e2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <AlertTriangle size={26} />
              </div>
              <h3 style={{ margin: '0 0 6px', fontSize: '19px', color: '#0f172a' }}>Delete User Account?</h3>
              <p style={{ margin: 0, fontSize: '13.5px', color: '#64748b' }}>
                Are you sure you want to permanently delete this user?
              </p>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', margin: '16px 0', fontSize: '13px', color: '#334155' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <img
                  src={deletingUser.avatar}
                  alt={deletingUser.name}
                  style={{ width: '36px', height: '36px', borderRadius: '50%', border: '1px solid #cbd5e1' }}
                />
                <div>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>{deletingUser.name}</div>
                  <div style={{ color: '#64748b', fontSize: '12px' }}>{deletingUser.email}</div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '8px', fontSize: '12px' }}>
                <span>Role:</span>
                <strong style={{ color: normalizeRole(deletingUser.role) === ROLES.SUPER_ADMIN ? '#7e22ce' : '#0f172a' }}>
                  {normalizeRole(deletingUser.role).toUpperCase().replace(/_/g, ' ')}
                </strong>
              </div>

              {normalizeRole(deletingUser.role) === ROLES.SUPER_ADMIN && (
                <div style={{ marginTop: '10px', padding: '8px 10px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#b91c1c', fontSize: '12px', fontWeight: 600 }}>
                  ⚠️ Warning: You are deleting a Super Administrator account.
                </div>
              )}

              <div style={{ color: '#dc2626', marginTop: '10px', fontSize: '12px', fontWeight: 600 }}>
                This user will immediately lose all access to Creative Subscription Hub. This action cannot be undone.
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
