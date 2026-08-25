import React, { useState, useEffect } from 'react';
import {
  X,
  Crown,
  Shield,
  Eye,
  Lock,
  Building2,
  CreditCard,
  Megaphone,
  Truck,
  Sparkles
} from 'lucide-react';
import { ROLES, normalizeRole } from '../config/rbac';

const ROLE_DEFINITIONS = [
  {
    role: ROLES.SUPER_ADMIN,
    label: 'Super Admin',
    icon: Crown,
    iconColor: '#8b5cf6',
    activeColor: '#6d28d9',
    borderColor: '#8b5cf6',
    bgColor: '#f5f3ff',
    description: 'Full system authority: provision all roles, manage backups, and configure system data.'
  },
  {
    role: ROLES.HEAD_BRAND,
    label: 'Head of Brand',
    icon: Sparkles,
    iconColor: '#ec4899',
    activeColor: '#be185d',
    borderColor: '#ec4899',
    bgColor: '#fdf2f8',
    description: 'Brand asset governance: full CRUD on all asset libraries and sample proof approvals.'
  },
  {
    role: ROLES.BANK_DESIGN,
    label: 'KBZ Bank Design',
    icon: Building2,
    iconColor: '#0284c7',
    activeColor: '#0369a1',
    borderColor: '#0284c7',
    bgColor: '#f0f9ff',
    description: 'Specialist access: manage KBZ Bank asset library; read-only on other libraries.'
  },
  {
    role: ROLES.PAY_DESIGN,
    label: 'KBZPay Design',
    icon: CreditCard,
    iconColor: '#2563eb',
    activeColor: '#1d4ed8',
    borderColor: '#2563eb',
    bgColor: '#eff6ff',
    description: 'Specialist access: manage KBZPay asset library; read-only on other libraries.'
  },
  {
    role: ROLES.COMMS_DESIGN,
    label: 'KBZBank Comms Design',
    icon: Megaphone,
    iconColor: '#d97706',
    activeColor: '#b45309',
    borderColor: '#d97706',
    bgColor: '#fffbeb',
    description: 'Specialist access: manage Comms PR & media asset library; read-only on others.'
  },
  {
    role: ROLES.PROCUREMENT_OFFICER,
    label: 'Procurement Officer',
    icon: Truck,
    iconColor: '#059669',
    activeColor: '#047857',
    borderColor: '#059669',
    bgColor: '#ecfdf5',
    description: 'Supply chain management: full CRUD on Supplier Directory and Production Order Matrix.'
  },
  {
    role: ROLES.ADMIN,
    label: 'Administrator',
    icon: Shield,
    iconColor: '#6366f1',
    activeColor: '#4338ca',
    borderColor: '#6366f1',
    bgColor: '#eef2ff',
    description: 'Operations manager: manage Subscriptions, AI Tokens, Assets, Suppliers, and Orders.'
  },
  {
    role: ROLES.VIEWER,
    label: 'Viewer',
    icon: Eye,
    iconColor: '#64748b',
    activeColor: '#334155',
    borderColor: '#94a3b8',
    bgColor: '#f8fafc',
    description: 'Universal read-only access: view dashboard, KPI analytics, assets, and export reports.'
  }
];

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
        role: isSuperAdmin ? ROLES.VIEWER : ROLES.VIEWER
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
      <div className="modal-card" style={{ maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>{editingUser ? 'Edit User Account & Role' : 'Provision User Account'}</h3>
            <p>Assign designated Role-Based Access Control (RBAC) permissions across Marcomms modules.</p>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ margin: 0 }}>Assigned Role (RBAC) *</label>
                {!isSuperAdmin && (
                  <span style={{ fontSize: '11px', color: '#b45309', background: '#fef3c7', padding: '2px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Lock size={11} /> Admin can only assign Viewer role
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                {isSuperAdmin ? (
                  ROLE_DEFINITIONS.map((def) => {
                    const isSelected = formData.role === def.role;
                    const Icon = def.icon;
                    return (
                      <label
                        key={def.role}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '9px 12px',
                          border: isSelected ? `2px solid ${def.borderColor}` : '1px solid #e2e8f0',
                          borderRadius: '8px',
                          background: isSelected ? def.bgColor : '#ffffff',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <input
                          type="radio"
                          name="role"
                          value={def.role}
                          checked={isSelected}
                          onChange={() => setFormData({ ...formData, role: def.role })}
                          style={{ margin: 0 }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '12.5px', color: def.activeColor }}>
                            <Icon size={13} color={def.iconColor} /> {def.label}
                          </div>
                          <span style={{ fontSize: '11px', color: '#64748b', lineHeight: '1.3', display: 'block' }}>
                            {def.description}
                          </span>
                        </div>
                      </label>
                    );
                  })
                ) : (
                  // Viewer option for standard Admin
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 14px',
                      border: '2px solid #3b82f6',
                      borderRadius: '8px',
                      background: '#eff6ff',
                      cursor: 'pointer'
                    }}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={ROLES.VIEWER}
                      checked={true}
                      readOnly
                      style={{ margin: 0 }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '13px', color: '#1d4ed8' }}>
                        <Eye size={14} color="#3b82f6" /> Viewer
                      </div>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>
                        Read-only access across dashboard, KPI metrics, asset libraries, and report generation.
                      </span>
                    </div>
                  </label>
                )}
              </div>
            </div>
          </div>

          <div className="modal-footer" style={{ marginTop: '16px' }}>
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
