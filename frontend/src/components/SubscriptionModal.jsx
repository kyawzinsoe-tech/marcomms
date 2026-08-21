import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

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
  }, [subscription, isOpen]);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.product.trim() || !formData.tool.trim()) {
      alert('Product and Tool / Service are required.');
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
            <h3>{subscription ? 'Edit Subscription' : 'Add Subscription'}</h3>
            <p>Configure subscription details, expiry window, and Magnific tokens.</p>
          </div>
          <button type="button" className="btn-close-modal" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label>Product *</label>
              <input
                type="text"
                required
                placeholder="e.g. Magnific, Midjourney, ChatGPT"
                value={formData.product}
                onChange={(e) => handleChange('product', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Tool / Service *</label>
              <input
                type="text"
                required
                placeholder="e.g. AI Upscaler, Content Creation"
                value={formData.tool}
                onChange={(e) => handleChange('tool', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Billing Plan</label>
              <select
                value={formData.plan}
                onChange={(e) => handleChange('plan', e.target.value)}
              >
                <option value="Monthly">Monthly</option>
                <option value="Yearly">Yearly</option>
                <option value="Pay As You Go">Pay As You Go</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label>Status</label>
              <select
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <div className="form-group">
              <label>Start Date</label>
              <input
                type="date"
                value={formData.start}
                onChange={(e) => handleChange('start', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Expiry / Renewal Date</label>
              <input
                type="date"
                value={formData.expiry}
                onChange={(e) => handleChange('expiry', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Cost (USD)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 24.00"
                value={formData.cost}
                onChange={(e) => handleChange('cost', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Account Email</label>
              <input
                type="email"
                placeholder="e.g. creative.team@company.com"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Reminder Email</label>
              <input
                type="email"
                placeholder="e.g. manager@company.com"
                value={formData.reminderEmail}
                onChange={(e) => handleChange('reminderEmail', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Alert Before Expiry (Days)</label>
              <input
                type="number"
                min="0"
                step="1"
                value={formData.alertDays}
                onChange={(e) => handleChange('alertDays', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Magnific Initial AI Token Allocation</label>
              <input
                type="number"
                min="0"
                step="1"
                placeholder="e.g. 2500"
                value={formData.initialTokens}
                onChange={(e) => handleChange('initialTokens', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Purchase / Token Note</label>
              <input
                type="text"
                placeholder="e.g. Invoice #1024 / Q3 Budget"
                value={formData.purchaseNote}
                onChange={(e) => handleChange('purchaseNote', e.target.value)}
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
              Save Subscription
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
