import React, { useState, useEffect } from 'react';
import {
  X,
  Building2,
  Tag,
  AlertCircle,
  Loader2,
  UserCheck
} from 'lucide-react';

const COMMON_CATEGORIES = [
  'Offset Printing',
  'Digital Printing',
  'Signage & Branding',
  'POSM & Merchandising',
  'Corporate Gifts & Apparel',
  'Packaging & Boxes',
  'Event Setup & Stage',
  'Media Production & Video',
  'Courier & Logistics'
];

/**
 * Validates optional email format
 */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return true;
  const trimmed = email.trim();
  if (!trimmed) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

export function SupplierModal({ isOpen, onClose, onSave, supplier }) {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    categories: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    rating: 5,
    status: 'Active',
    notes: ''
  });

  const [validationErrors, setValidationErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setValidationErrors({});
    setIsSaving(false);

    if (supplier) {
      setFormData({
        name: supplier.name || '',
        code: supplier.code || '',
        categories: Array.isArray(supplier.categories)
          ? supplier.categories.join(', ')
          : (supplier.categories || ''),
        contactPerson: supplier.contactPerson || '',
        phone: supplier.phone || '',
        email: supplier.email || '',
        address: supplier.address || '',
        rating: supplier.rating !== undefined ? Number(supplier.rating) : 5,
        status: supplier.status || 'Active',
        notes: supplier.notes || ''
      });
    } else {
      setFormData({
        name: '',
        code: '',
        categories: '',
        contactPerson: '',
        phone: '',
        email: '',
        address: '',
        rating: 5,
        status: 'Active',
        notes: ''
      });
    }
  }, [supplier, isOpen]);

  // Escape key handler
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

  const handleCategoryPillToggle = (category) => {
    const current = formData.categories
      ? formData.categories.split(',').map((c) => c.trim()).filter(Boolean)
      : [];
    if (current.includes(category)) {
      const updated = current.filter((c) => c !== category);
      handleChange('categories', updated.join(', '));
    } else {
      const updated = [...current, category];
      handleChange('categories', updated.join(', '));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = {};

    const cleanName = (formData.name || '').trim();
    const cleanEmail = (formData.email || '').trim().toLowerCase();

    if (!cleanName) {
      errors.name = 'Supplier company name is required.';
    }

    if (cleanEmail && !isValidEmail(cleanEmail)) {
      errors.email = 'Please enter a valid email address (e.g. sales@vendor.com).';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setIsSaving(true);

    const payload = {
      ...formData,
      name: cleanName,
      code: (formData.code || '').trim(),
      categories: formData.categories
        ? formData.categories.split(',').map((c) => c.trim()).filter(Boolean)
        : [],
      contactPerson: (formData.contactPerson || '').trim(),
      phone: (formData.phone || '').trim(),
      email: cleanEmail,
      address: (formData.address || '').trim(),
      rating: Number(formData.rating || 5),
      status: formData.status || 'Active',
      notes: (formData.notes || '').trim()
    };

    try {
      await onSave(payload);
    } catch {
      // Error handled by parent component notification
    } finally {
      setIsSaving(false);
    }
  };

  const currentCategoryList = formData.categories
    ? formData.categories.split(',').map((c) => c.trim()).filter(Boolean)
    : [];

  return (
    <div className="modal-overlay" onClick={isSaving ? undefined : onClose}>
      <div
        className="modal-card modal-card-lg"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="supplier-modal-title"
      >
        {/* Header */}
        <div className="modal-header">
          <div>
            <h3 id="supplier-modal-title">
              {supplier ? 'Edit Supplier Profile' : 'Add Procurement Supplier'}
            </h3>
            <p>Register or update printing houses, signage fabricators, POSM vendors, and production partners.</p>
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
          {/* Section 1: Vendor Identity & Status */}
          <div className="modal-form-section">
            <div className="modal-section-title">
              <Building2 size={15} />
              <span>1. Vendor Identity & Status</span>
            </div>

            <div className="form-grid">
              <div className="form-group col-span-2">
                <label htmlFor="supplier-name">Supplier Company Name *</label>
                <input
                  id="supplier-name"
                  type="text"
                  required
                  placeholder="e.g. Royal Printing & Media Co., Ltd."
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

              <div className="form-group">
                <label htmlFor="supplier-code">Supplier Code / Vendor ID</label>
                <input
                  id="supplier-code"
                  type="text"
                  placeholder="e.g. SUP-PRINT-01"
                  value={formData.code}
                  onChange={(e) => handleChange('code', e.target.value)}
                  disabled={isSaving}
                />
              </div>

              <div className="form-group">
                <label htmlFor="supplier-status">Status</label>
                <select
                  id="supplier-status"
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  disabled={isSaving}
                >
                  <option value="Active">Active</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="form-group col-span-2">
                <label htmlFor="supplier-rating">Vendor Performance Rating</label>
                <select
                  id="supplier-rating"
                  value={formData.rating}
                  onChange={(e) => handleChange('rating', Number(e.target.value))}
                  disabled={isSaving}
                >
                  <option value={5}>★★★★★ 5 - Excellent (Tier 1 Preferred)</option>
                  <option value={4}>★★★★☆ 4 - Very Good (Consistent Quality)</option>
                  <option value={3}>★★★☆☆ 3 - Good (Standard Lead Times)</option>
                  <option value={2}>★★☆☆☆ 2 - Fair (Under Quality Review)</option>
                  <option value={1}>★☆☆☆☆ 1 - Poor (High Error Rate)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Contact Information & Location */}
          <div className="modal-form-section">
            <div className="modal-section-title">
              <UserCheck size={15} />
              <span>2. Contact Information & Facility Location</span>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="supplier-contact">Primary Contact Person</label>
                <input
                  id="supplier-contact"
                  type="text"
                  placeholder="e.g. U Kyaw Min (Sales Director)"
                  value={formData.contactPerson}
                  onChange={(e) => handleChange('contactPerson', e.target.value)}
                  disabled={isSaving}
                />
              </div>

              <div className="form-group">
                <label htmlFor="supplier-phone">Official Phone Number</label>
                <input
                  id="supplier-phone"
                  type="text"
                  placeholder="e.g. +95 9 123 456 789"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  disabled={isSaving}
                />
              </div>

              <div className="form-group col-span-2">
                <label htmlFor="supplier-email">Official Email Address</label>
                <input
                  id="supplier-email"
                  type="email"
                  placeholder="e.g. sales@royalprint.com.mm"
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
                <label htmlFor="supplier-address">Physical Address / Factory Location</label>
                <input
                  id="supplier-address"
                  type="text"
                  placeholder="e.g. No. 45, Industrial Zone 1, Hlaing Tharyar, Yangon"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  disabled={isSaving}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Service Categories & Procurement Notes */}
          <div className="modal-form-section" style={{ borderBottom: 'none', paddingBottom: 0 }}>
            <div className="modal-section-title">
              <Tag size={15} />
              <span>3. Service Categories & Contract Notes</span>
            </div>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label htmlFor="supplier-categories">Service Categories (Comma-separated or click quick chips below)</label>
              <input
                id="supplier-categories"
                type="text"
                placeholder="Offset Printing, Signage & Branding, Packaging..."
                value={formData.categories}
                onChange={(e) => handleChange('categories', e.target.value)}
                disabled={isSaving}
                style={{ marginBottom: '8px' }}
              />

              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }} aria-label="Suggested service categories">
                {COMMON_CATEGORIES.map((cat) => {
                  const isSelected = currentCategoryList.includes(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => handleCategoryPillToggle(cat)}
                      disabled={isSaving}
                      style={{
                        fontSize: '11px',
                        padding: '3px 9px',
                        borderRadius: 'var(--radius-full)',
                        border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-default)',
                        background: isSelected ? 'var(--primary-50)' : 'var(--bg-surface-secondary)',
                        color: isSelected ? 'var(--primary-active)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontWeight: isSelected ? 600 : 500,
                        transition: 'all var(--transition-fast)'
                      }}
                      title={isSelected ? `Remove ${cat}` : `Add ${cat}`}
                    >
                      {isSelected ? `✓ ${cat}` : `+ ${cat}`}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="supplier-notes">Procurement Notes / Terms & Capabilities</label>
              <textarea
                id="supplier-notes"
                rows={3}
                placeholder="Credit terms (e.g. 30 days net), sample approval turnaround time, delivery fleet capabilities, proof requirements..."
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                disabled={isSaving}
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="modal-footer">
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
                  <Building2 size={15} /> Save Supplier Profile
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
