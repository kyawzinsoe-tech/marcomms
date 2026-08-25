import React, { useState, useEffect, useMemo } from 'react';
import { X, Printer, CheckCircle, FileText, Building, Image as ImageIcon } from 'lucide-react';
import { PRODUCTION_STATUSES } from '../../services/productionOrderService';
import { PERMISSIONS, hasPermission } from '../../config/rbac';

export function ProductionOrderModal({
  isOpen,
  onClose,
  onSave,
  order,
  suppliers = [],
  assets = [],
  user
}) {
  const [formData, setFormData] = useState({
    orderNumber: '',
    campaignName: '',
    supplier: '',
    assetRef: '',
    itemDescription: '',
    specification: '',
    quantity: 100,
    unitCost: 0,
    totalCost: 0,
    orderDate: new Date().toISOString().slice(0, 10),
    deliveryDeadline: '',
    status: 'Draft',
    notes: '',
    approveProof: false
  });

  const canApproveProof = useMemo(() => {
    if (!user) return false;
    return hasPermission(user, PERMISSIONS.PRODUCTION_ORDER_APPROVE_PROOF);
  }, [user]);

  useEffect(() => {
    if (order) {
      setFormData({
        orderNumber: order.orderNumber || '',
        campaignName: order.campaignName || '',
        supplier: order.supplier?.id || (typeof order.supplier === 'string' ? order.supplier : (suppliers[0]?.id || '')),
        assetRef: order.assetRef?.id || (typeof order.assetRef === 'string' ? order.assetRef : ''),
        itemDescription: order.itemDescription || '',
        specification: order.specification || '',
        quantity: order.quantity || 1,
        unitCost: order.unitCost || 0,
        totalCost: order.totalCost || (order.quantity * (order.unitCost || 0)),
        orderDate: order.orderDate || new Date().toISOString().slice(0, 10),
        deliveryDeadline: order.deliveryDeadline || '',
        status: order.status || 'Draft',
        notes: order.notes || '',
        approveProof: false
      });
    } else {
      setFormData({
        orderNumber: '',
        campaignName: '',
        supplier: suppliers[0]?.id || '',
        assetRef: '',
        itemDescription: '',
        specification: '',
        quantity: 1000,
        unitCost: 0,
        totalCost: 0,
        orderDate: new Date().toISOString().slice(0, 10),
        deliveryDeadline: '',
        status: 'Draft',
        notes: '',
        approveProof: false
      });
    }
  }, [order, suppliers, isOpen]);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      // Auto compute totalCost when quantity or unitCost changes
      if (field === 'quantity' || field === 'unitCost') {
        const qty = Number(field === 'quantity' ? value : next.quantity) || 0;
        const uCost = Number(field === 'unitCost' ? value : next.unitCost) || 0;
        next.totalCost = qty * uCost;
      }
      return next;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.campaignName.trim()) {
      alert('Campaign / Project name is required.');
      return;
    }
    if (!formData.supplier) {
      alert('Please select a supplier.');
      return;
    }
    if (!formData.itemDescription.trim()) {
      alert('Item description is required.');
      return;
    }

    const payload = {
      ...formData,
      campaignName: formData.campaignName.trim(),
      itemDescription: formData.itemDescription.trim(),
      specification: formData.specification.trim(),
      quantity: Number(formData.quantity) || 1,
      unitCost: Number(formData.unitCost) || 0,
      totalCost: Number(formData.totalCost) || 0,
      notes: formData.notes.trim()
    };

    if (!payload.assetRef) {
      delete payload.assetRef;
    }

    onSave(payload);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '680px' }}>
        <div className="modal-header">
          <div>
            <h3>{order ? `Edit Production Order (${order.orderNumber})` : 'New Printing / Production Order'}</h3>
            <p>Issue purchase specs, link creative brand assets, and track fabrication milestones.</p>
          </div>
          <button type="button" className="btn-close-modal" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label>Campaign / Project Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. KBZPay Thingyan Promo 2026"
                value={formData.campaignName}
                onChange={(e) => handleChange('campaignName', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Production Supplier *</label>
              <select
                required
                value={formData.supplier}
                onChange={(e) => handleChange('supplier', e.target.value)}
              >
                <option value="">-- Select Printing / Production Supplier --</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.code ? `(${s.code})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Linked Brand Asset (Optional)</label>
              <select
                value={formData.assetRef}
                onChange={(e) => handleChange('assetRef', e.target.value)}
              >
                <option value="">-- No Linked Asset (Standalone PO) --</option>
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>
                    [{a.library?.toUpperCase().replace(/_/g, ' ')}] {a.title} ({a.category})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Item Description *</label>
              <input
                type="text"
                required
                placeholder="e.g. A2 Wall Posters / QR Standees"
                value={formData.itemDescription}
                onChange={(e) => handleChange('itemDescription', e.target.value)}
              />
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label>Material & Print Specifications</label>
              <input
                type="text"
                placeholder="e.g. 260gsm Art Card, 4C x 0C, Matt Lamination, Spot UV on Logo"
                value={formData.specification}
                onChange={(e) => handleChange('specification', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Quantity *</label>
              <input
                type="number"
                required
                min="1"
                placeholder="1000"
                value={formData.quantity}
                onChange={(e) => handleChange('quantity', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Unit Cost (MMK / USD)</label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="250"
                value={formData.unitCost}
                onChange={(e) => handleChange('unitCost', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Total Cost (Estimated)</label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="250000"
                value={formData.totalCost}
                onChange={(e) => handleChange('totalCost', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Workflow Status</label>
              <select
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
              >
                {PRODUCTION_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Order Date</label>
              <input
                type="date"
                value={formData.orderDate}
                onChange={(e) => handleChange('orderDate', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Delivery Deadline</label>
              <input
                type="date"
                value={formData.deliveryDeadline}
                onChange={(e) => handleChange('deliveryDeadline', e.target.value)}
              />
            </div>

            {canApproveProof && (
              <div
                className="form-group"
                style={{
                  gridColumn: 'span 2',
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  padding: '12px',
                  borderRadius: 'var(--radius-sm)'
                }}
              >
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0, fontWeight: 600, color: '#166534' }}>
                  <input
                    type="checkbox"
                    checked={formData.approveProof}
                    onChange={(e) => handleChange('approveProof', e.target.checked)}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <span>Authorize & Sign-off Sample Proof (Head of Brand / Approver)</span>
                </label>
                {order?.proofApprovedBy && (
                  <div style={{ fontSize: '11.5px', color: '#15803d', marginTop: '6px' }}>
                    Currently approved by: <b>{order.proofApprovedBy.name || order.proofApprovedBy.email}</b>
                    {order.proofApprovedAt ? ` on ${new Date(order.proofApprovedAt).toLocaleDateString()}` : ''}
                  </div>
                )}
              </div>
            )}

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label>Production Notes & Delivery Instructions</label>
              <textarea
                rows={2}
                placeholder="Packaging instructions, delivery address, branch distribution contact..."
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
              <Printer size={16} /> Save Order
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
