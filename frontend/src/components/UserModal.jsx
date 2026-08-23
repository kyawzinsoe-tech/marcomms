import React, { useState, useEffect } from 'react';
import { X, Crown, Shield, Eye, Lock } from 'lucide-react';
import { ROLES, normalizeRole } from '../config/rbac';

export function UserModal({ isOpen, onClose, onSave, editingUser, isSuperAdmin = false }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: ROLES.VIEWER
  });

  useEffect(() => {
    if (editingUser) {
      setFormData({
        name: editingUser.name || '',
        email: editingUser.email || '',
        password: editingUser.password || '',
        role: normalizeRole(editingUser.role)
      });
    } else {
      setFormData({
        name: '',
        email: '',
        password: '',
        role: isSuperAdmin ? ROLES.ADMIN : ROLES.VIEWER
      });
    }
  }, [editingUser, isOpen, isSuperAdmin]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      alert('Name and Email are required.');
      return;
    }

    if (!editingUser && !formData.password.trim()) {
      alert('Account password is required for new users.');
      return;
    }

    // Role enforcement based on creator privileges
    let finalRole = formData.role;
    if (!isSuperAdmin) {
      finalRole = ROLES.VIEWER;
    }

    onSave({
      ...formData,
      role: finalRole
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: '540px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>{editingUser ? 'Edit User Account' : 'Provision User Account'}</h3>
            <p>Assign designated Role-Based Access Control (RBAC) permissions.</p>
          </div>
          <button type="button" className="btn-close-modal" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="form-group">
              <label>Full Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Kyaw Zin Soe"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Work Email *</label>
              <input
                type="email"
                required
                placeholder="e.g. name@kbzbank.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Account Password {editingUser ? '(leave blank to keep unchanged)' : '*'}</label>
              <input
                type="password"
                required={!editingUser}
                placeholder={editingUser ? 'Leave blank to keep unchanged' : '••••••••'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ margin: 0 }}>Assigned Role (RBAC) *</label>
                {!isSuperAdmin && (
                  <span style={{ fontSize: '11px', color: '#b45309', background: '#fef3c7', padding: '2px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Lock size={11} /> Admin can only assign Viewer role
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {isSuperAdmin ? (
                  <>
                    {/* Super Admin option (Only visible to Super Admin) */}
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 14px',
                        border: formData.role === ROLES.SUPER_ADMIN ? '2px solid #8b5cf6' : '1px solid #e2e8f0',
                        borderRadius: '10px',
                        background: formData.role === ROLES.SUPER_ADMIN ? '#f5f3ff' : '#ffffff',
                        cursor: 'pointer'
                      }}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={ROLES.SUPER_ADMIN}
                        checked={formData.role === ROLES.SUPER_ADMIN}
                        onChange={() => setFormData({ ...formData, role: ROLES.SUPER_ADMIN })}
                        style={{ margin: 0 }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '13px', color: '#6d28d9' }}>
                          <Crown size={14} color="#8b5cf6" /> Super Admin
                        </div>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>Full system access: manage all accounts, roles, backups & system data</span>
                      </div>
                    </label>

                    {/* Admin option (Only visible to Super Admin) */}
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 14px',
                        border: formData.role === ROLES.ADMIN ? '2px solid #6366f1' : '1px solid #e2e8f0',
                        borderRadius: '10px',
                        background: formData.role === ROLES.ADMIN ? '#eef2ff' : '#ffffff',
                        cursor: 'pointer'
                      }}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={ROLES.ADMIN}
                        checked={formData.role === ROLES.ADMIN}
                        onChange={() => setFormData({ ...formData, role: ROLES.ADMIN })}
                        style={{ margin: 0 }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '13px', color: '#4338ca' }}>
                          <Shield size={14} color="#6366f1" /> Admin
                        </div>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>Manage subscriptions, AI tokens, email alerts, and create Viewer accounts</span>
                      </div>
                    </label>
                  </>
                ) : null}

                {/* Viewer option (Visible to Super Admin and Admin) */}
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 14px',
                    border: formData.role === ROLES.VIEWER ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                    borderRadius: '10px',
                    background: formData.role === ROLES.VIEWER ? '#eff6ff' : '#ffffff',
                    cursor: 'pointer'
                  }}
                >
                  <input
                    type="radio"
                    name="role"
                    value={ROLES.VIEWER}
                    checked={formData.role === ROLES.VIEWER}
                    onChange={() => setFormData({ ...formData, role: ROLES.VIEWER })}
                    style={{ margin: 0 }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '13px', color: '#1d4ed8' }}>
                      <Eye size={14} color="#3b82f6" /> Viewer
                    </div>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Read-only dashboard view, KPI metrics, PDF report generation & data export</span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-outline"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
            >
              {editingUser ? 'Save Changes' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
