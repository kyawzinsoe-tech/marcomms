import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
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
  }, [tokenEntry, defaultMonth, isOpen]);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.date || !formData.account.trim() || !formData.project.trim() || !formData.tokens) {
      alert('Please fill out all required fields marked with *.');
      return;
    }
    onSave(formData);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>{tokenEntry ? 'Edit Magnific AI Token Entry' : 'New Magnific AI Token Entry'}</h3>
            <p>Log AI token consumption and associate with accounts and projects.</p>
          </div>
          <button type="button" className="btn-close-modal" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label>Usage Date *</label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => handleChange('date', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Account / Email *</label>
              <input
                type="text"
                required
                placeholder="e.g. creative.team1010@gmail.com"
                value={formData.account}
                onChange={(e) => handleChange('account', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Project / Usage Description *</label>
              <input
                type="text"
                required
                placeholder="e.g. 2026 Brand Campaign Upscales"
                value={formData.project}
                onChange={(e) => handleChange('project', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Tokens Used *</label>
              <input
                type="number"
                min="1"
                step="1"
                required
                placeholder="e.g. 150"
                value={formData.tokens}
                onChange={(e) => handleChange('tokens', e.target.value)}
              />
            </div>

            <div className="form-group col-span-2">
              <label>Estimated Cost (USD)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 5.50"
                value={formData.cost}
                onChange={(e) => handleChange('cost', e.target.value)}
              />
            </div>

            <div className="form-group col-span-2">
              <label>Notes & Details</label>
              <textarea
                rows={3}
                placeholder="Optional reference links, prompt details, or resolution targets"
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
              />
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
              Save Token Entry
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
