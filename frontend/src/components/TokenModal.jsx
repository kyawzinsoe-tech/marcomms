import React, { useState, useEffect } from 'react';
import { X, Loader2, Zap, FileText, AlertCircle, Calendar } from 'lucide-react';
import { getTodayISO } from '../utils/formatters';

export function TokenModal({ isOpen, onClose, onSave, tokenEntry, defaultMonth }) {
  const [formData, setFormData] = useState({
    date: '',
    account: '',
    project: '',
    tokens: '',
    cost: '',
    notes: ''
  });

  const [validationErrors, setValidationErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (tokenEntry) {
      setFormData({
        date: tokenEntry.date || '',
        account: tokenEntry.account || '',
        project: tokenEntry.project || '',
        tokens: tokenEntry.tokens !== undefined ? String(tokenEntry.tokens) : '',
        cost: tokenEntry.cost !== undefined ? String(tokenEntry.cost) : '',
        notes: tokenEntry.notes || ''
      });
    } else {
      const today = getTodayISO();
      const initialDate =
        defaultMonth && today.startsWith(defaultMonth)
          ? today
          : `${defaultMonth || today.slice(0, 7)}-01`;

      setFormData({
        date: initialDate,
        account: '',
        project: '',
        tokens: '',
        cost: '',
        notes: ''
      });
    }
    setValidationErrors({});
    setIsSaving(false);
  }, [tokenEntry, defaultMonth, isOpen]);

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

    if (!formData.date) {
      errors.date = 'Usage date is required.';
    }
    if (!formData.account.trim()) {
      errors.account = 'Account or email is required.';
    }
    if (!formData.project.trim()) {
      errors.project = 'Project or usage description is required.';
    }
    if (!formData.tokens || isNaN(Number(formData.tokens)) || Number(formData.tokens) <= 0) {
      errors.tokens = 'Tokens used must be a positive number greater than 0.';
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
      <div
        className="modal-card modal-card-lg"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="token-modal-title"
      >
        <div className="modal-header">
          <div>
            <h3 id="token-modal-title">
              {tokenEntry ? 'Edit Magnific AI Token Entry' : 'New Magnific AI Token Entry'}
            </h3>
            <p>Log AI generation/upscaling usage and assign to active accounts and creative campaigns.</p>
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

        <form onSubmit={handleSubmit}>
          {/* Section 1: Entry & Project Details */}
          <div className="modal-form-section">
            <div className="modal-section-title">
              <Calendar size={15} />
              <span>1. Project & Account Assignment</span>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="token-date">Usage Date *</label>
                <input
                  id="token-date"
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => handleChange('date', e.target.value)}
                  disabled={isSaving}
                  autoFocus
                  aria-invalid={!!validationErrors.date}
                />
                {validationErrors.date && (
                  <span className="field-error-msg">
                    <AlertCircle size={12} /> {validationErrors.date}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="token-account">Account / Email *</label>
                <input
                  id="token-account"
                  type="text"
                  required
                  placeholder="e.g. creative.team1010@gmail.com"
                  value={formData.account}
                  onChange={(e) => handleChange('account', e.target.value)}
                  disabled={isSaving}
                  aria-invalid={!!validationErrors.account}
                />
                {validationErrors.account && (
                  <span className="field-error-msg">
                    <AlertCircle size={12} /> {validationErrors.account}
                  </span>
                )}
              </div>

              <div className="form-group col-span-2">
                <label htmlFor="token-project">Project / Campaign Description *</label>
                <input
                  id="token-project"
                  type="text"
                  required
                  placeholder="e.g. 2026 Brand Campaign Upscales / Product KV Renders"
                  value={formData.project}
                  onChange={(e) => handleChange('project', e.target.value)}
                  disabled={isSaving}
                  aria-invalid={!!validationErrors.project}
                />
                {validationErrors.project && (
                  <span className="field-error-msg">
                    <AlertCircle size={12} /> {validationErrors.project}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Consumption & Valuation Metrics */}
          <div className="modal-form-section" style={{ borderBottom: 'none', paddingBottom: 0 }}>
            <div className="modal-section-title">
              <Zap size={15} />
              <span>2. Token Consumption & Valuation</span>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="token-count">Tokens Used *</label>
                <input
                  id="token-count"
                  type="number"
                  min="1"
                  step="1"
                  required
                  placeholder="e.g. 150"
                  value={formData.tokens}
                  onChange={(e) => handleChange('tokens', e.target.value)}
                  disabled={isSaving}
                  aria-invalid={!!validationErrors.tokens}
                />
                {validationErrors.tokens && (
                  <span className="field-error-msg">
                    <AlertCircle size={12} /> {validationErrors.tokens}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="token-cost">Estimated Cost (USD)</label>
                <input
                  id="token-cost"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 5.50"
                  value={formData.cost}
                  onChange={(e) => handleChange('cost', e.target.value)}
                  disabled={isSaving}
                />
              </div>

              <div className="form-group col-span-2">
                <label htmlFor="token-notes">Notes & Generation Details</label>
                <textarea
                  id="token-notes"
                  rows={3}
                  placeholder="Optional prompt settings, output resolution, or billing references..."
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  disabled={isSaving}
                />
              </div>
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
                'Save Token Entry'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
