import React, { useState, useMemo } from 'react';
import { Users, Plus, Search, Edit, Trash2, Shield, Eye, ShieldCheck, Lock, CheckCircle2, XCircle } from 'lucide-react';
import { formatDate } from '../utils/formatters';

export function UserManagementSection({
  users,
  currentUserId,
  onAddUser,
  onEditUser,
  onDeleteUser
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');

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
        (roleFilter === 'admin' && u.role === 'admin') ||
        (roleFilter === 'viewer' && isViewer);

      return matchSearch && matchRole;
    });
  }, [users, searchTerm, roleFilter]);

  const handleDelete = (user) => {
    if (user.id === currentUserId) {
      alert('You cannot delete your own active administrator account.');
      return;
    }
    if (
      window.confirm(
        `Are you sure you want to delete user account "${user.name}" (${user.email})?`
      )
    ) {
      onDeleteUser(user.id);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <section className="card" id="users">
        <div className="card-header">
          <div>
            <h2>
              <Users size={20} color="#6366f1" />
              Role & User Management
            </h2>
            <p>Create and manage Admin (full permissions) and Viewer (read-only) accounts with role-based access control.</p>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px' }}>
          <div style={{ padding: '14px 16px', background: 'var(--bg-secondary, #f8fafc)', borderRadius: '10px', border: '1px solid var(--border-color, #e2e8f0)' }}>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Total Accounts</div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{users.length}</div>
          </div>
          <div style={{ padding: '14px 16px', background: '#eef2ff', borderRadius: '10px', border: '1px solid #c7d2fe' }}>
            <div style={{ fontSize: '12px', color: '#4338ca', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Shield size={13} /> Administrators
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#312e81', marginTop: '2px' }}>{adminCount}</div>
          </div>
          <div style={{ padding: '14px 16px', background: '#eff6ff', borderRadius: '10px', border: '1px solid #bfdbfe' }}>
            <div style={{ fontSize: '12px', color: '#1d4ed8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Eye size={13} /> Viewers (Read-Only)
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
            style={{ width: '180px' }}
          >
            <option value="All">All Roles ({users.length})</option>
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
                <th>Access Level</th>
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
                  const isAdminRole = u.role === 'admin';

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
                              border: '1px solid #e2e8f0'
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
                        <span
                          className={`badge ${
                            isAdminRole ? 'badge-role-admin' : 'badge-role-user'
                          }`}
                          style={{
                            padding: '4px 9px',
                            fontSize: '11px',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            background: isAdminRole ? '#eef2ff' : '#eff6ff',
                            color: isAdminRole ? '#4f46e5' : '#2563eb',
                            border: isAdminRole ? '1px solid #c7d2fe' : '1px solid #bfdbfe'
                          }}
                        >
                          {isAdminRole ? (
                            <>
                              <Shield size={12} /> ADMIN
                            </>
                          ) : (
                            <>
                              <Eye size={12} /> VIEWER
                            </>
                          )}
                        </span>
                      </td>
                      <td>{formatDate(u.createdAt)}</td>
                      <td style={{ fontSize: '12px', color: isAdminRole ? '#059669' : '#64748b', fontWeight: 600 }}>
                        {isAdminRole ? 'Full Access (Read/Write/Delete)' : 'Read-Only (Dashboard)'}
                      </td>
                      <td>
                        <div className="table-actions">
                          <button
                            type="button"
                            className="action-btn action-edit"
                            title="Edit user details & role"
                            onClick={() => onEditUser(u)}
                          >
                            <Edit size={14} />
                          </button>
                          {!isSelf && (
                            <button
                              type="button"
                              className="action-btn action-delete"
                              title="Delete user"
                              onClick={() => handleDelete(u)}
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

      {/* RBAC Permissions Matrix Card */}
      <section className="card">
        <div className="card-header">
          <div>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', margin: 0 }}>
              <ShieldCheck size={18} color="#059669" />
              Role-Based Access Control (RBAC) Permissions Matrix
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
              Reference table showing what each role can access and execute across the platform.
            </p>
          </div>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Platform Capability</th>
                <th style={{ width: '180px', textAlign: 'center' }}>Admin Role</th>
                <th style={{ width: '180px', textAlign: 'center' }}>Viewer Role</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>Dashboard & Analytics</strong>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>View KPIs, trend charts, usage analytics, PDF reports</div>
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
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Create, edit, archive, and delete tool subscriptions</div>
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
                  <strong>AI Token Entries</strong>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Add token expenditures, allocate tokens, modify entries</div>
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
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Trigger serverless reminder emails for expiring accounts</div>
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
                  <strong>User & Role Management</strong>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Create, edit, change roles, and remove users</div>
                </td>
                <td style={{ textAlign: 'center', color: '#059669', fontWeight: 600 }}>
                  <CheckCircle2 size={16} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Full Access
                </td>
                <td style={{ textAlign: 'center', color: '#dc2626', fontWeight: 600 }}>
                  <XCircle size={16} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> No Access
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Data Import & Database Reset</strong>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Import JSON backups, restore states, reset database</div>
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
    </div>
  );
}
