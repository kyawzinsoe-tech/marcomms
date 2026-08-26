import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Printer,
  DollarSign,
  AlertCircle,
  Loader2,
  Calendar
} from 'lucide-react';
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
    quantity: 1000,
    unitCost: 0,
    totalCost: 0,
    orderDate: new Date().toISOString().slice(0, 10),
    deliveryDeadline: '',
    status: 'Draft',
    notes: '',
    approveProof: false
  });

  const [validationErrors, setValidationErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const canApproveProof = useMemo(() => {
    if (!user) return false;
    return hasPermission(user, PERMISSIONS.PRODUCTION_ORDER_APPROVE_PROOF);
  }, [user]);

  useEffect(() => {
    setValidationErrors({});
    setIsSaving(false);

    if (order) {
      const supId = order.supplier?.id || (typeof order.supplier === 'string' ? order.supplier : (suppliers[0]?.id || ''));
      const assetId = order.assetRef?.id || (typeof order.assetRef === 'string' ? order.assetRef : '');
      const qty = order.quantity !== undefined ? Number(order.quantity) : 1;
      const uCost = order.unitCost !== undefined ? Number(order.unitCost) : 0;
      const tCost = order.totalCost !== undefined ? Number(order.totalCost) : qty * uCost;

      setFormData({
        orderNumber: order.orderNumber || '',
        campaignName: order.campaignName || '',
        supplier: supId,
        assetRef: assetId,
        itemDescription: order.itemDescription || '',
        specification: order.specification || '',
        quantity: qty,
        unitCost: uCost,
        totalCost: tCost,
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

    const cleanCampaign = (formData.campaignName || '').trim();
    const cleanSupplier = formData.supplier;
    const cleanItem = (formData.itemDescription || '').trim();
    const qty = Number(formData.quantity);

    if (!cleanCampaign) {
      errors.campaignName = 'Campaign / project name is required.';
    }

    if (!cleanSupplier) {
      errors.supplier = 'Please select a production supplier.';
    }

    if (!cleanItem) {
      errors.itemDescription = 'Item description is required.';
    }

    if (isNaN(qty) || qty < 1) {
      errors.quantity = 'Quantity must be at least 1.';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setIsSaving(true);

    const payload = {
      ...formData,
      campaignName: cleanCampaign,
      supplier: cleanSupplier,
      itemDescription: cleanItem,
      specification: (formData.specification || '').trim(),
      quantity: qty || 1,
      unitCost: Number(formData.unitCost) || 0,
      totalCost: Number(formData.totalCost) || 0,
      orderDate: formData.orderDate || new Date().toISOString().slice(0, 10),
      deliveryDeadline: (formData.deliveryDeadline || '').trim(),
      status: formData.status || 'Draft',
      notes: (formData.notes || '').trim()
    };

    if (!payload.assetRef) {
      delete payload.assetRef;
    }

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
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-modal-title"
      >
        {/* Header */}
        <div className="modal-header">
          <div>
            <h3 id="order-modal-title">
              {order ? `Edit Production Order (${order.orderNumber})` : 'New Printing / Production Order'}
            </h3>
            <p>Issue purchase specs, link creative brand assets, and track fabrication milestones.</p>
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
          {/* Section 1: Campaign & Production Item */}
          <div className="modal-form-section">
            <div className="modal-section-title">
              <Printer size={15} />
              <span>1. Campaign & Production Item</span>
            </div>

            <div className="form-grid">
              <div className="form-group col-span-2">
                <label htmlFor="order-campaign">Campaign / Project Title *</label>
                <input
                  id="order-campaign"
                  type="text"
                  required
                  placeholder="e.g. KBZPay Thingyan Promo 2026"
                  value={formData.campaignName}
                  onChange={(e) => handleChange('campaignName', e.target.value)}
                  disabled={isSaving}
                  autoFocus
                  aria-invalid={!!validationErrors.campaignName}
                />
                {validationErrors.campaignName && (
                  <span className="field-error-msg" role="alert">
                    <AlertCircle size={12} /> {validationErrors.campaignName}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="order-supplier">Production Supplier *</label>
                <select
                  id="order-supplier"
                  required
                  value={formData.supplier}
                  onChange={(e) => handleChange('supplier', e.target.value)}
                  disabled={isSaving}
                  aria-invalid={!!validationErrors.supplier}
                >
                  <option value="">-- Select Printing / Production Supplier --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.code ? `(${s.code})` : ''}
                    </option>
                  ))}
                </select>
                {validationErrors.supplier && (
                  <span className="field-error-msg" role="alert">
                    <AlertCircle size={12} /> {validationErrors.supplier}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="order-asset">Linked Brand Asset (Optional)</label>
                <select
                  id="order-asset"
                  value={formData.assetRef}
                  onChange={(e) => handleChange('assetRef', e.target.value)}
                  disabled={isSaving}
                >
                  <option value="">-- No Linked Asset (Standalone PO) --</option>
                  {assets.map((a) => (
                    <option key={a.id} value={a.id}>
                      [{a.library?.toUpperCase().replace(/_/g, ' ')}] {a.title} ({a.category})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group col-span-2">
                <label htmlFor="order-item">Item Description *</label>
                <input
                  id="order-item"
                  type="text"
                  required
                  placeholder="e.g. A2 Wall Posters / Acrylic QR Standees / Merchant Welcome Kits"
                  value={formData.itemDescription}
                  onChange={(e) => handleChange('itemDescription', e.target.value)}
                  disabled={isSaving}
                  aria-invalid={!!validationErrors.itemDescription}
                />
                {validationErrors.itemDescription && (
                  <span className="field-error-msg" role="alert">
                    <AlertCircle size={12} /> {validationErrors.itemDescription}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Print Specifications & Quantity Financials */}
          <div className="modal-form-section">
            <div className="modal-section-title">
              <DollarSign size={15} />
              <span>2. Material Specifications & Financials</span>
            </div>

            <div className="form-grid">
              <div className="form-group col-span-2">
                <label htmlFor="order-spec">Material & Print Specifications</label>
                <input
                  id="order-spec"
                  type="text"
                  placeholder="e.g. 260gsm Art Card, 4C x 0C, Matt Lamination, Spot UV on Logo"
                  value={formData.specification}
                  onChange={(e) => handleChange('specification', e.target.value)}
                  disabled={isSaving}
                />
              </div>

              <div className="form-group">
                <label htmlFor="order-qty">Quantity (Units) *</label>
                <input
                  id="order-qty"
                  type="number"
                  required
                  min="1"
                  placeholder="1000"
                  value={formData.quantity}
                  onChange={(e) => handleChange('quantity', e.target.value)}
                  disabled={isSaving}
                  aria-invalid={!!validationErrors.quantity}
                />
                {validationErrors.quantity && (
                  <span className="field-error-msg" role="alert">
                    <AlertCircle size={12} /> {validationErrors.quantity}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="order-unit-cost">Unit Cost (MMK / USD)</label>
                <input
                  id="order-unit-cost"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="250"
                  value={formData.unitCost}
                  onChange={(e) => handleChange('unitCost', e.target.value)}
                  disabled={isSaving}
                />
              </div>

              <div className="form-group col-span-2">
                <label htmlFor="order-total-cost">Total Estimated Cost (Auto-calculated: Qty × Unit Cost)</label>
                <input
                  id="order-total-cost"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="250000"
                  value={formData.totalCost}
                  onChange={(e) => handleChange('totalCost', e.target.value)}
                  disabled={isSaving}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Schedule, Workflow Status & Proof Sign-off */}
          <div className="modal-form-section" style={{ borderBottom: 'none', paddingBottom: 0 }}>
            <div className="modal-section-title">
              <Calendar size={15} />
              <span>3. Schedule, Workflow Status & Sign-off</span>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="order-status">Workflow Status</label>
                <select
                  id="order-status"
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  disabled={isSaving}
                >
                  {PRODUCTION_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="order-date">Order Date</label>
                <input
                  id="order-date"
                  type="date"
                  value={formData.orderDate}
                  onChange={(e) => handleChange('orderDate', e.target.value)}
                  disabled={isSaving}
                />
              </div>

              <div className="form-group col-span-2">
                <label htmlFor="order-deadline">Delivery Deadline Date</label>
                <input
                  id="order-deadline"
                  type="date"
                  value={formData.deliveryDeadline}
                  onChange={(e) => handleChange('deliveryDeadline', e.target.value)}
                  disabled={isSaving}
                />
              </div>

              {canApproveProof && (
                <div
                  className="form-group col-span-2"
                  style={{
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    padding: '12px',
                    borderRadius: 'var(--radius-md)'
                  }}
                >
                  <label
                    htmlFor="order-approve-proof"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      margin: 0,
                      fontWeight: 600,
                      color: '#166534'
                    }}
                  >
                    <input
                      id="order-approve-proof"
                      type="checkbox"
                      checked={formData.approveProof}
                      onChange={(e) => handleChange('approveProof', e.target.checked)}
                      disabled={isSaving}
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

              <div className="form-group col-span-2">
                <label htmlFor="order-notes">Production Notes & Delivery Instructions</label>
                <textarea
                  id="order-notes"
                  rows={2}
                  placeholder="Packaging instructions, delivery warehouse address, branch distribution contact..."
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  disabled={isSaving}
                />
              </div>
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
                  <Printer size={15} /> Save Production Order
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
