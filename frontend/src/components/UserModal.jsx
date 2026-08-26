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
  Sparkles,
  User,
  AlertCircle,
  Loader2
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
    description: 'Full system authority: provision all roles, manage backups, configure system data.'
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

  const [validationErrors, setValidationErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setValidationErrors({});
    setIsSaving(false);

    if (editingUser) {
      setFormData({
        name: editingUser.name || '',
        email: editingUser.email || '',
        password: '',
        role: normalizeRole(editingUser.role)
      });
    } else {
      setFormData({
        name: '',
        email: '',
        password: '',
        role: ROLES.VIEWER
      });
    }
  }, [editingUser, isOpen]);

  // Global Escape key listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isSaving) {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSaving, onClose]);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = {};

    const cleanName = (formData.name || '').trim();
    const cleanEmail = (formData.email || '').trim().toLowerCase();
    const cleanPassword = (formData.password || '').trim();

    if (!cleanName) {
      errors.name = 'Full name is required.';
    }

    if (!cleanEmail) {
      errors.email = 'Work email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      errors.email = 'Please enter a valid email address.';
    }

    if (!editingUser) {
      if (!cleanPassword) {
        errors.password = 'Account password is required for new accounts.';
      } else if (cleanPassword.length < 6) {
        errors.password = 'Password must be at least 6 characters long.';
      }
    } else if (cleanPassword && cleanPassword.length < 6) {
      errors.password = 'Password must be at least 6 characters long if being changed.';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    // Role enforcement based on creator privileges
    let finalRole = formData.role;
    if (!isSuperAdmin && !editingUser) {
      finalRole = ROLES.VIEWER;
    }

    const payload = {
      name: cleanName,
      email: cleanEmail,
      role: finalRole
    };

    if (cleanPassword) {
      payload.password = cleanPassword;
    }

    setIsSaving(true);
    try {
      await onSave(payload);
    } catch {
      // Error handled by parent
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={isSaving ? undefined : onClose}>
      <div
        className="modal-card modal-card-lg"
        style={{ maxWidth: '620px' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-modal-title"
      >
        {/* Header */}
        <div className="modal-header">
          <div>
            <h3 id="user-modal-title">
              {editingUser ? `Edit Account (${editingUser.name})` : 'Provision New User Account'}
            </h3>
            <p>Assign designated Role-Based Access Control (RBAC) permissions across Marcomms modules.</p>
          </div>
          <button
            type="button"
            className="btn-close-modal"
            onClick={onClose}
            aria-label="Close dialog"
            disabled={isSaving}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {/* Section 1: User Identity & Credentials */}
          <div className="modal-form-section">
            <div className="modal-section-title">
              <User size={15} />
              <span>1. User Identity & Credentials</span>
            </div>

            <div className="form-grid">
              <div className="form-group col-span-2">
                <label htmlFor="user-name">Full Name *</label>
                <input
                  id="user-name"
                  type="text"
                  required
                  placeholder="e.g. Kyaw Zin Soe"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  disabled={isSaving}
                  autoFocus
                  aria-invalid={!!validationErrors.name}
                />
                {validationErrors.name && (
                  <span className="field-error-msg" role="alert">
                    <AlertCircle size={12} /> {validationErrors.name}
                  </span>
                )}
              </div>

              <div className="form-group col-span-2">
                <label htmlFor="user-email">Work Email *</label>
                <input
                  id="user-email"
                  type="email"
                  required
                  placeholder="e.g. name@kbzbank.com"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  disabled={isSaving}
                  aria-invalid={!!validationErrors.email}
                />
                {validationErrors.email && (
                  <span className="field-error-msg" role="alert">
                    <AlertCircle size={12} /> {validationErrors.email}
                  </span>
                )}
              </div>

              <div className="form-group col-span-2">
                <label htmlFor="user-password">
                  Account Password {editingUser ? '(leave blank to keep unchanged)' : '*'}
                </label>
                <input
                  id="user-password"
                  type="password"
                  required={!editingUser}
                  placeholder={editingUser ? 'Leave blank to keep existing password' : '•••••••• (min. 6 characters)'}
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  disabled={isSaving}
                  aria-invalid={!!validationErrors.password}
                />
                {validationErrors.password && (
                  <span className="field-error-msg" role="alert">
                    <AlertCircle size={12} /> {validationErrors.password}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Role Assignment (RBAC) */}
          <div className="modal-form-section" style={{ borderBottom: 'none', paddingBottom: 0 }}>
            <div className="modal-section-title">
              <Shield size={15} />
              <span>2. Assigned Role & Access Level (RBAC)</span>
            </div>

            <div style={{ marginTop: '8px' }}>
              {!isSuperAdmin && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    background: 'var(--warning-light)',
                    color: 'var(--warning-text)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '12px',
                    marginBottom: '12px',
                    border: '1px solid var(--warning-border)'
                  }}
                >
                  <Lock size={13} />
                  <span>Standard Administrators can only provision Viewer accounts. Super Admin required for higher roles.</span>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {isSuperAdmin ? (
                  ROLE_DEFINITIONS.map((def) => {
                    const isSelected = formData.role === def.role;
                    const Icon = def.icon;
                    return (
                      <label
                        key={def.role}
                        htmlFor={`role-option-${def.role}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '10px 14px',
                          border: isSelected ? `2px solid ${def.borderColor}` : '1px solid var(--border-light)',
                          borderRadius: 'var(--radius-md)',
                          background: isSelected ? def.bgColor : 'var(--bg-surface)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <input
                          id={`role-option-${def.role}`}
                          type="radio"
                          name="role"
                          value={def.role}
                          checked={isSelected}
                          onChange={() => handleChange('role', def.role)}
                          disabled={isSaving}
                          style={{ margin: 0, width: '16px', height: '16px' }}
                        />
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontWeight: 700,
                              fontSize: '12.5px',
                              color: def.activeColor
                            }}
                          >
                            <Icon size={14} color={def.iconColor} /> {def.label}
                          </div>
                          <span
                            style={{
                              fontSize: '11px',
                              color: 'var(--text-muted)',
                              lineHeight: '1.3',
                              display: 'block',
                              marginTop: '2px'
                            }}
                          >
                            {def.description}
                          </span>
                        </div>
                      </label>
                    );
                  })
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 14px',
                      border: '2px solid #3b82f6',
                      borderRadius: 'var(--radius-md)',
                      background: '#eff6ff'
                    }}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={ROLES.VIEWER}
                      checked={true}
                      readOnly
                      style={{ margin: 0, width: '16px', height: '16px' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontWeight: 700,
                          fontSize: '13px',
                          color: '#1d4ed8'
                        }}
                      >
                        <Eye size={14} color="#3b82f6" /> Viewer (Read-only)
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', display: 'block' }}>
                        Universal read-only access: view executive dashboard, KPI analytics, brand asset libraries, and export reports.
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="modal-footer" style={{ marginTop: '20px' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Shield size={14} /> {editingUser ? 'Save Changes' : 'Create Account'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
