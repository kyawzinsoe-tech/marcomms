import React, { useState, useEffect } from 'react';
import { X, Shield, Eye } from 'lucide-react';

export function UserModal({ isOpen, onClose, onSave, editingUser }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user'
  });

  useEffect(() => {
    if (editingUser) {
      setFormData({
        name: editingUser.name || '',
        email: editingUser.email || '',
        password: editingUser.password || '',
        role: editingUser.role || 'user'
      });
    } else {
      setFormData({
        name: '',
        email: '',
        password: 'user123',
        role: 'user'
      });
    }
  }, [editingUser, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      alert('Name and Email are required.');
      return;
    }
    onSave(formData);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>{editingUser ? 'Edit User Account' : 'Create New User'}</h3>
            <p>Provision access with designated permissions (Admin vs User).</p>
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
                placeholder="e.g. John Doe"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Work Email *</label>
              <input
                type="email"
                required
                placeholder="e.g. j.doe@company.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Password *</label>
              <input
                type="text"
                required
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Assigned Role *</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '4px' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px',
                    border: formData.role === 'admin' ? '2px solid #6366f1' : '1px solid #e2e8f0',
                    borderRadius: '10px',
                    background: formData.role === 'admin' ? '#eef2ff' : '#ffffff',
                    cursor: 'pointer'
                  }}
                >
                  <input
                    type="radio"
                    name="role"
                    value="admin"
                    checked={formData.role === 'admin'}
                    onChange={() => setFormData({ ...formData, role: 'admin' })}
                    style={{ margin: 0 }}
                  />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700, fontSize: '13px', color: '#1e293b' }}>
                      <Shield size={14} color="#6366f1" /> Admin
                    </div>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Full CRUD, users & alerts</span>
                  </div>
                </label>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px',
                    border: formData.role === 'viewer' || formData.role === 'user' ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                    borderRadius: '10px',
                    background: formData.role === 'viewer' || formData.role === 'user' ? '#eff6ff' : '#ffffff',
                    cursor: 'pointer'
                  }}
                >
                  <input
                    type="radio"
                    name="role"
                    value="viewer"
                    checked={formData.role === 'viewer' || formData.role === 'user'}
                    onChange={() => setFormData({ ...formData, role: 'viewer' })}
                    style={{ margin: 0 }}
                  />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700, fontSize: '13px', color: '#1e293b' }}>
                      <Eye size={14} color="#3b82f6" /> Viewer
                    </div>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Read-only dashboard view</span>
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
              {editingUser ? 'Save Changes' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
