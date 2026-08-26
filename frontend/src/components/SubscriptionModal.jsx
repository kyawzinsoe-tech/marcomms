import React, { useState, useEffect } from 'react';
import { X, Loader2, Layers, Calendar, Mail, FileText, AlertCircle } from 'lucide-react';

export function SubscriptionModal({ isOpen, onClose, onSave, subscription }) {
  const [formData, setFormData] = useState({
    product: '',
    tool: '',
    plan: 'Monthly',
    status: 'Active',
    start: '',
    expiry: '',
    cost: '',
    email: '',
    reminderEmail: '',
    alertDays: 7,
    initialTokens: '',
    purchaseNote: ''
  });

  const [validationErrors, setValidationErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (subscription) {
      setFormData({
        product: subscription.product || '',
        tool: subscription.tool || '',
        plan: subscription.plan || 'Monthly',
        status: subscription.status || 'Active',
        start: subscription.start || '',
        expiry: subscription.expiry || '',
        cost: subscription.cost !== undefined ? String(subscription.cost) : '',
        email: subscription.email || '',
        reminderEmail: subscription.reminderEmail || '',
        alertDays: subscription.alertDays ?? 7,
        initialTokens: subscription.initialTokens !== undefined ? String(subscription.initialTokens) : '',
        purchaseNote: subscription.purchaseNote || ''
      });
    } else {
      setFormData({
        product: '',
        tool: '',
        plan: 'Monthly',
        status: 'Active',
        start: '',
        expiry: '',
        cost: '',
        email: '',
        reminderEmail: '',
        alertDays: 7,
        initialTokens: '',
        purchaseNote: ''
      });
    }
    setValidationErrors({});
    setIsSaving(false);
  }, [subscription, isOpen]);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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

    if (!formData.product.trim()) {
      errors.product = 'Product name is required.';
    }
    if (!formData.tool.trim()) {
      errors.tool = 'Tool / Service category is required.';
    }
    if (formData.cost !== '' && formData.cost !== undefined && formData.cost !== null) {
      const numCost = Number(formData.cost);
      if (isNaN(numCost) || numCost < 0) {
        errors.cost = 'Monthly cost must be a positive number.';
      }
    }
    if (formData.initialTokens !== '' && formData.initialTokens !== undefined && formData.initialTokens !== null) {
      const numTokens = Number(formData.initialTokens);
      if (isNaN(numTokens) || numTokens < 0) {
        errors.initialTokens = 'Initial tokens must be a positive number.';
      }
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch {
      // Error handled by parent handler
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card modal-card-lg" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="sub-modal-title">
        <div className="modal-header">
          <div>
            <h3 id="sub-modal-title">{subscription ? 'Edit Subscription' : 'Add Subscription'}</h3>
            <p>Configure tool license specifications, renewal intervals, and alert settings.</p>
          </div>
          <button type="button" className="btn-close-modal" onClick={onClose} aria-label="Close dialog" disabled={isSaving}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Section 1: License & Tool Details */}
          <div className="modal-form-section">
            <div className="modal-section-title">
              <Layers size={15} />
              <span>1. License & Tool Details</span>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="sub-product">Product Name *</label>
                <input
                  id="sub-product"
                  type="text"
                  required
                  placeholder="e.g. Magnific, Midjourney, ChatGPT"
                  value={formData.product}
                  onChange={(e) => handleChange('product', e.target.value)}
                  disabled={isSaving}
                  autoFocus
                  aria-invalid={!!validationErrors.product}
                />
                {validationErrors.product && (
                  <span className="field-error-msg">
                    <AlertCircle size={12} /> {validationErrors.product}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="sub-tool">Tool / Service *</label>
                <input
                  id="sub-tool"
                  type="text"
                  required
                  placeholder="e.g. AI Upscaler, Content Creation"
                  value={formData.tool}
                  onChange={(e) => handleChange('tool', e.target.value)}
                  disabled={isSaving}
                  aria-invalid={!!validationErrors.tool}
                />
                {validationErrors.tool && (
                  <span className="field-error-msg">
                    <AlertCircle size={12} /> {validationErrors.tool}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="sub-plan">Billing Plan</label>
                <select
                  id="sub-plan"
                  value={formData.plan}
                  onChange={(e) => handleChange('plan', e.target.value)}
                  disabled={isSaving}
                >
                  <option value="Monthly">Monthly</option>
                  <option value="Yearly">Yearly</option>
                  <option value="Pay As You Go">Pay As You Go</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="sub-status">Status</label>
                <select
                  id="sub-status"
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  disabled={isSaving}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Timeline & Cost */}
          <div className="modal-form-section">
            <div className="modal-section-title">
              <Calendar size={15} />
              <span>2. Timeline & Costs</span>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="sub-start">Start Date</label>
                <input
                  id="sub-start"
                  type="date"
                  value={formData.start}
                  onChange={(e) => handleChange('start', e.target.value)}
                  disabled={isSaving}
                />
              </div>

              <div className="form-group">
                <label htmlFor="sub-expiry">Expiry / Renewal Date</label>
                <input
                  id="sub-expiry"
                  type="date"
                  value={formData.expiry}
                  onChange={(e) => handleChange('expiry', e.target.value)}
                  disabled={isSaving}
                />
              </div>

              <div className="form-group">
                <label htmlFor="sub-cost">Cost (USD)</label>
                <input
                  id="sub-cost"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 24.00"
                  value={formData.cost}
                  onChange={(e) => handleChange('cost', e.target.value)}
                  disabled={isSaving}
                  aria-invalid={!!validationErrors.cost}
                />
                {validationErrors.cost && (
                  <span className="field-error-msg">
                    <AlertCircle size={12} /> {validationErrors.cost}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="sub-tokens">Magnific Initial AI Tokens</label>
                <input
                  id="sub-tokens"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="e.g. 2500"
                  value={formData.initialTokens}
                  onChange={(e) => handleChange('initialTokens', e.target.value)}
                  disabled={isSaving}
                  aria-invalid={!!validationErrors.initialTokens}
                />
                {validationErrors.initialTokens && (
                  <span className="field-error-msg">
                    <AlertCircle size={12} /> {validationErrors.initialTokens}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Notification & Account Settings */}
          <div className="modal-form-section">
            <div className="modal-section-title">
              <Mail size={15} />
              <span>3. Notification & Account Settings</span>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="sub-email">Account Email</label>
                <input
                  id="sub-email"
                  type="email"
                  placeholder="e.g. creative.team@company.com"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  disabled={isSaving}
                />
              </div>

              <div className="form-group">
                <label htmlFor="sub-reminder">Reminder Notification Email</label>
                <input
                  id="sub-reminder"
                  type="email"
                  placeholder="e.g. manager@company.com"
                  value={formData.reminderEmail}
                  onChange={(e) => handleChange('reminderEmail', e.target.value)}
                  disabled={isSaving}
                />
              </div>

              <div className="form-group col-span-2">
                <label htmlFor="sub-alert-days">Alert Window Before Expiry (Days)</label>
                <input
                  id="sub-alert-days"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="7"
                  value={formData.alertDays}
                  onChange={(e) => handleChange('alertDays', e.target.value)}
                  disabled={isSaving}
                />
              </div>
            </div>
          </div>

          {/* Section 4: Procurement Reference */}
          <div className="modal-form-section" style={{ borderBottom: 'none', paddingBottom: 0 }}>
            <div className="modal-section-title">
              <FileText size={15} />
              <span>4. Notes & Procurement Reference</span>
            </div>
            <div className="form-group">
              <label htmlFor="sub-notes">Purchase / Billing Note</label>
              <input
                id="sub-notes"
                type="text"
                placeholder="e.g. Purchase Order #KBZ-2026-08 / Credit Card ****4242"
                value={formData.purchaseNote}
                onChange={(e) => handleChange('purchaseNote', e.target.value)}
                disabled={isSaving}
              />
            </div>
          </div>

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
                'Save Subscription'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
