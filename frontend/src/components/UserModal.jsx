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
import { UNITS, MENUS, MENU_DEFINITIONS } from '../utils/menuAccess';
import { ROLES, normalizeRole, canAssignRole } from '../config/rbac';

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
    label: 'KBZ Bank Marketing',
    icon: Building2,
    iconColor: '#0284c7',
    activeColor: '#0369a1',
    borderColor: '#0284c7',
    bgColor: '#f0f9ff',
    description: 'Specialist access: manage KBZ Bank asset library; read-only on other libraries.'
  },
  {
    role: ROLES.PAY_DESIGN,
    label: 'KBZPay Marketing',
    icon: CreditCard,
    iconColor: '#2563eb',
    activeColor: '#1d4ed8',
    borderColor: '#2563eb',
    bgColor: '#eff6ff',
    description: 'Specialist access: manage KBZPay asset library; read-only on other libraries.'
  },
  {
    role: ROLES.COMMS_DESIGN,
    label: 'Communication Team',
    icon: Megaphone,
    iconColor: '#d97706',
    activeColor: '#b45309',
    borderColor: '#d97706',
    bgColor: '#fffbeb',
    description: 'Specialist access: manage Comms PR & media asset library; read-only on others.'
  },
  {
    role: ROLES.PROCUREMENT_OFFICER,
    label: 'Procurement & Merchandising Officer',
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

export function UserModal({ isOpen, onClose, onSave, editingUser, currentUserRole }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: ROLES.VIEWER,
    department: '',
    jobLevel: '', menuAccess: [], assignedMenus: []
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
        role: normalizeRole(editingUser.role),
        department: /research/i.test(editingUser.department || '') ? '' : editingUser.department || '',
        jobLevel: editingUser.jobLevel || '',
        menuAccess: editingUser.menuAccess || [],
        assignedMenus: editingUser.assignedMenus ?? MENU_DEFINITIONS.map(([id])=>id)
      });
    } else {
      setFormData({
        name: '',
        email: '',
        password: '',
        role: ROLES.VIEWER,
        department: '',
        jobLevel: '', menuAccess: [], assignedMenus: []
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

  const assignableRoles = ROLE_DEFINITIONS.filter((definition) =>
    canAssignRole(currentUserRole, definition.role)
  );

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value,
      ...(field === 'menuAccess' ? {assignedMenus:[...new Set([...(prev.assignedMenus || []), ...value.filter(g=>g.units?.length).map(g=>g.menu==='posm'?'production-inventory':g.menu)])]} : {})
    }));
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

    const payload = {
      name: cleanName,
      email: cleanEmail,
      role: formData.role,
      department: formData.department.trim(),
      jobLevel: formData.jobLevel,
      ...(currentUserRole === 'super_admin' ? {menuAccess: formData.menuAccess || [], assignedMenus:formData.assignedMenus || []} : {})
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

              <div className="form-group">
                <label htmlFor="user-department">Business Unit / Department</label>
                <select id="user-department" value={formData.department} onChange={e=>handleChange('department',e.target.value)} disabled={isSaving}><option value="">Select Business Unit</option>{['Creative','KBZ Bank','KBZPay','Comms','Merchandising'].map(unit=><option key={unit}>{unit}</option>)}{formData.department && !['Creative','KBZ Bank','KBZPay','Comms','Merchandising'].includes(formData.department) && <option>{formData.department}</option>}</select><small>Properties List တွင် ကိုယ့် Business Unit နှင့် သက်ဆိုင်သော စာရင်းကိုသာ မြင်ရပါမည်။</small>
              </div>

              <div className="form-group">
                <label htmlFor="user-job-level">Job Level / Head Authority</label>
                <select
                  id="user-job-level"
                  value={formData.jobLevel}
                  onChange={(e) => handleChange('jobLevel', e.target.value)}
                  disabled={isSaving}
                >
                  <option value="">Not assigned</option>
                  <option value="head">Head</option>
                  <option value="deputy_head">Deputy Head</option>
                  <option value="manager">Manager</option>
                  <option value="staff">Staff (not notified)</option>
                </select>
                <small>Head ကိုရွေးထားပါက သက်ဆိုင်ရာ Team စာရင်းများကို Add/Edit/Delete လုပ်နိုင်ပါမည်။</small>
              </div>
            </div>
          </div>

          {currentUserRole === 'super_admin' && formData.role !== 'super_admin' && <div className="modal-form-section"><h3>Assigned Portal Menus</h3><p>Super Admin သာ Menu တစ်ခုချင်း ရွေးပေးနိုင်ပါသည်။ ရွေးပေးထားသော Menu အတွင်း လုပ်ပိုင်ခွင့်က Assigned Role အတိုင်းဖြစ်ပါမည်။</p><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:12}}>{MENU_DEFINITIONS.map(([id,label])=><label key={id} style={{display:'flex',alignItems:'center',gap:8}}><input type="checkbox" checked={(formData.assignedMenus || []).includes(id)} onChange={e=>handleChange('assignedMenus',e.target.checked?[...(formData.assignedMenus || []),id]:(formData.assignedMenus || []).filter(x=>x!==id))}/>{label}</label>)}</div></div>}
          {currentUserRole === 'super_admin' && <div className="modal-form-section"><h3>Additional Menu Access — View Only</h3><p>Head များ၏ ကိုယ့် Team စီမံခွင့်အပြင် အခြား Team ကို ကြည့်ခွင့်ပေးရန် ရွေးပါ။</p>{MENUS.map(menu => <fieldset key={menu} style={{marginBottom:12,padding:12,border:'1px solid #dbe3ee',borderRadius:10}}><legend>{{properties:'Properties List',posm:'POSM Item Store',reports:'Creative Team Reports'}[menu]}</legend><div style={{display:'flex',gap:12,flexWrap:'wrap'}}>{UNITS.map(unit => <label key={unit}><input type="checkbox" checked={(formData.menuAccess || []).some(g => g.menu === menu && g.units.includes(unit))} onChange={e => { const grants=formData.menuAccess || []; const units=grants.find(g=>g.menu===menu)?.units || []; handleChange('menuAccess',[...grants.filter(g=>g.menu!==menu),{menu,units:e.target.checked?[...units,unit]:units.filter(u=>u!==unit)}]); }}/>{unit}</label>)}</div></fieldset>)}</div>}
          {/* Section 2: Role Assignment (RBAC) */}
          <div className="modal-form-section" style={{ borderBottom: 'none', paddingBottom: 0 }}>
            <div className="modal-section-title">
              <Shield size={15} />
              <span>2. Assigned Role & Access Level (RBAC)</span>
            </div>

            <div style={{ marginTop: '8px' }}>
              {normalizeRole(currentUserRole) !== ROLES.SUPER_ADMIN && (
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
                  <span>You can assign Head, specialist, Procurement, and Viewer roles below Administrator level.</span>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {assignableRoles.length > 0 ? (
                  assignableRoles.map((def) => {
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
                  <div className="empty-state"><Lock size={18} /><span>No lower roles are assignable.</span></div>
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
