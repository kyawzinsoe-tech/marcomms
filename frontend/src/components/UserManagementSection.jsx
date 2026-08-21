import React, { useState, useMemo } from 'react';
import { Users, Plus, Search, Edit, Trash2, Shield, Eye, KeyRound } from 'lucide-react';
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

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchRole =
        roleFilter === 'All' || u.role === roleFilter;

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
    <section className="card" id="users">
      <div className="card-header">
        <div>
          <h2>
            <Users size={20} color="#6366f1" />
            User Management & Roles
          </h2>
          <p>Provision and manage user accounts with Admin (full access) or User (dashboard only) roles.</p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={onAddUser}
        >
          <Plus size={16} /> Create New User
        </button>
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
          style={{ width: '150px' }}
        >
          <option value="All">All Roles</option>
          <option value="admin">Admins Only</option>
          <option value="user">Users (Viewers) Only</option>
        </select>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Role</th>
              <th>Created Date</th>
              <th>Password</th>
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
                        style={{ padding: '3px 8px', fontSize: '10.5px' }}
                      >
                        {isAdminRole ? (
                          <>
                            <Shield size={11} /> ADMIN
                          </>
                        ) : (
                          <>
                            <Eye size={11} /> USER
                          </>
                        )}
                      </span>
                    </td>
                    <td>{formatDate(u.createdAt)}</td>
                    <td style={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: '12px' }}>
                      ••••••••
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="action-btn action-edit"
                          title="Edit user details"
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
  );
}
