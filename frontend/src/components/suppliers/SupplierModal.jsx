import React, { useState, useEffect } from 'react';
import { X, Building, Star } from 'lucide-react';

const COMMON_CATEGORIES = [
  'Offset Printing',
  'Digital Printing',
  'Signage & Branding',
  'Merchandise & Gifts',
  'Packaging & Boxes',
  'Event Setup & Stage',
  'Media Production & Video',
  'Courier & Logistics'
];

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

  useEffect(() => {
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
        rating: supplier.rating ?? 5,
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

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCategoryPillClick = (category) => {
    const current = formData.categories
      ? formData.categories.split(',').map((c) => c.trim()).filter(Boolean)
      : [];
    if (current.includes(category)) {
      const updated = current.filter((c) => c !== category);
      setFormData((prev) => ({ ...prev, categories: updated.join(', ') }));
    } else {
      const updated = [...current, category];
      setFormData((prev) => ({ ...prev, categories: updated.join(', ') }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Supplier name is required.');
      return;
    }

    const payload = {
      ...formData,
      name: formData.name.trim(),
      code: formData.code.trim(),
      categories: formData.categories
        ? formData.categories.split(',').map((c) => c.trim()).filter(Boolean)
        : [],
      contactPerson: formData.contactPerson.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim().toLowerCase(),
      address: formData.address.trim(),
      rating: Number(formData.rating || 5),
      status: formData.status,
      notes: formData.notes.trim()
    };

    onSave(payload);
    onClose();
  };

  const currentCategoryList = formData.categories
    ? formData.categories.split(',').map((c) => c.trim()).filter(Boolean)
    : [];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
        <div className="modal-header">
          <div>
            <h3>{supplier ? 'Edit Supplier Profile' : 'Add Procurement Supplier'}</h3>
            <p>Register or update printing houses, signage fabricators, and event production partners.</p>
          </div>
          <button type="button" className="btn-close-modal" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label>Supplier Company Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Royal Printing & Media Co., Ltd."
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Supplier Code / Vendor ID</label>
              <input
                type="text"
                placeholder="e.g. SUP-PRINT-01"
                value={formData.code}
                onChange={(e) => handleChange('code', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Status</label>
              <select
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
              >
                <option value="Active">Active</option>
                <option value="Under Review">Under Review</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label>Service Categories</label>
              <input
                type="text"
                placeholder="Offset Printing, Signage & Branding, Merchandise..."
                value={formData.categories}
                onChange={(e) => handleChange('categories', e.target.value)}
                style={{ marginBottom: '6px' }}
              />
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {COMMON_CATEGORIES.map((cat) => {
                  const isSelected = currentCategoryList.includes(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => handleCategoryPillClick(cat)}
                      style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        border: isSelected ? '1px solid #6366f1' : '1px solid var(--border-light)',
                        background: isSelected ? '#eef2ff' : '#f8fafc',
                        color: isSelected ? '#4338ca' : '#64748b',
                        cursor: 'pointer'
                      }}
                    >
                      {isSelected ? `✓ ${cat}` : `+ ${cat}`}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="form-group">
              <label>Contact Person</label>
              <input
                type="text"
                placeholder="e.g. U Kyaw Min (Sales Director)"
                value={formData.contactPerson}
                onChange={(e) => handleChange('contactPerson', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Phone Number</label>
              <input
                type="text"
                placeholder="e.g. +95 9 123 456 789"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Official Email</label>
              <input
                type="email"
                placeholder="e.g. sales@royalprint.com.mm"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Performance Rating (1 to 5)</label>
              <select
                value={formData.rating}
                onChange={(e) => handleChange('rating', Number(e.target.value))}
              >
                <option value={5}>★★★★★ (5 - Excellent)</option>
                <option value={4}>★★★★☆ (4 - Very Good)</option>
                <option value={3}>★★★☆☆ (3 - Good)</option>
                <option value={2}>★★☆☆☆ (2 - Fair)</option>
                <option value={1}>★☆☆☆☆ (1 - Poor)</option>
              </select>
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label>Physical Address / Factory Location</label>
              <input
                type="text"
                placeholder="e.g. No. 45, Industrial Zone 1, Hlaing Tharyar, Yangon"
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
              />
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label>Procurement Notes / Contract Terms</label>
              <textarea
                rows={3}
                placeholder="Credit terms (30 days), proof turnaround time, delivery capabilities..."
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-light)',
                  fontFamily: 'inherit',
                  fontSize: '13px'
                }}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <Building size={16} /> Save Supplier
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
