import React, { useState, useEffect } from 'react';
import {
  X,
  Printer,
  DollarSign,
  AlertCircle,
  Loader2,
  Calendar
} from 'lucide-react';
import { ProductionProcessLine } from './ProductionProcessLine';

const EMPTY_TEAM_MEMBERS = [];

export function ProductionOrderModal({
  isOpen,
  onClose,
  onSave,
  order,
  suppliers = [],
  assets = [],
  initialDesign=null,
  teamMembers=EMPTY_TEAM_MEMBERS,
  user
}) {
  const [formData, setFormData] = useState({
    orderNumber: '',
    campaignName: '',
    supplier: '',
    assetRef: '',
    itemDescription: '',
    itemCategory: '',
    itemType: '',
    supplierDriveUrl: '',
    printFileUrl: '',
    specification: '',
    quantity: 1000,
    remainingQuantity: 0,
    unitCost: 0,
    totalCost: 0,
    orderDate: new Date().toISOString().slice(0, 10),
    deliveryDeadline: '',
    status: 'Draft',
    notes: '',
  });

  const [validationErrors, setValidationErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

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
        sourceWork:order.sourceWork||'',productionOwner:order.productionOwner||'',
        orderNumber: order.orderNumber || '',
        campaignName: order.campaignName || '',
        supplier: supId,
        assetRef: assetId,
        itemDescription: order.itemDescription || '',
        itemCategory: order.itemCategory || '',
        itemType: order.itemType || '',
        supplierDriveUrl: order.supplierDriveUrl || order.supplier?.driveUrl || '',
        printFileUrl: order.printFileUrl || '',
        specification: order.specification || '',
        quantity: qty,
        remainingQuantity: Number(order.remainingQuantity || 0),
        unitCost: uCost,
        totalCost: tCost,
        orderDate: order.orderDate || new Date().toISOString().slice(0, 10),
        deliveryDeadline: order.deliveryDeadline || '',
        status: order.status || 'Draft',
        notes: order.notes || '',
      });
    } else {
      setFormData({
        sourceWork:initialDesign?._id||'',productionOwner:String(teamMembers.find(m=>m.email===initialDesign?.merchandisingEmail)?._id||teamMembers.find(m=>m.email===initialDesign?.merchandisingEmail)?.id||''),
        orderNumber: '',
        campaignName: initialDesign?.title||'',
        supplier: suppliers[0]?.id || '',
        supplierDriveUrl: suppliers[0]?.driveUrl || '',
        assetRef: '',
        itemDescription: initialDesign?.title||'',
        itemCategory: '',
        itemType: '',
    printFileUrl: initialDesign?.designDriveUrl||'',
        specification: '',
        quantity: 1000,
        remainingQuantity: 0,
        unitCost: 0,
        totalCost: 0,
        orderDate: new Date().toISOString().slice(0, 10),
        deliveryDeadline: '',
        status: 'Draft',
        notes: '',
      });
    }
  }, [order, suppliers, isOpen, initialDesign, teamMembers]);

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
      if(field==='supplier') next.supplierDriveUrl = suppliers.find(s=>s.id===value)?.driveUrl || '';
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
    } else if (cleanCampaign.length > 160) {
      errors.campaignName = 'Campaign / project title cannot exceed 160 characters.';
    }

    if (!cleanSupplier) {
      errors.supplier = 'Please select a production supplier.';
    }

    if (!cleanItem) {
      errors.itemDescription = 'Item description is required.';
    } else if (cleanItem.length > 300) {
      errors.itemDescription = 'Item description cannot exceed 300 characters.';
    }

    if (isNaN(qty) || qty < 1) {
      errors.quantity = 'Quantity must be at least 1.';
    }

    if (formData.printFileUrl) { try { const url = new URL(formData.printFileUrl); if (url.protocol !== 'https:' || url.username || url.password) throw new Error(); } catch { errors.printFileUrl = 'Enter the full HTTPS print file link.'; } }

    if(formData.sourceWork&&!formData.productionOwner)errors.productionOwner='Select a Production owner.';
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
                  maxLength={160}
                  required
                  placeholder="e.g. KBZPay Thingyan Promo 2026"
                  readOnly={!!formData.sourceWork} value={formData.campaignName}
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

              <div className="form-group col-span-2"><label htmlFor="order-supplier-drive">Supplier Drive Link (Auto)</label><textarea id="order-supplier-drive" rows={2} readOnly value={formData.supplierDriveUrl||''} placeholder="Supplier ရွေးလျှင် သိမ်းထားသော Drive Link ပေါ်မည်။"/><small>Supplier ဖိုင်များအတွက်ဖြစ်ပြီး အောက်က Print-ready File Link နှင့် သီးခြားဖြစ်သည်။</small>{formData.supplierDriveUrl&&<a href={formData.supplierDriveUrl} target="_blank" rel="noopener noreferrer">Open Supplier Folder ↗</a>}</div>
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
                  maxLength={300}
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
              <div className="form-group"><label htmlFor="order-category">Item Category</label><input id="order-category" list="production-categories" placeholder="Select or type manually" value={formData.itemCategory} onChange={(e) => handleChange('itemCategory', e.target.value)} disabled={isSaving} /><datalist id="production-categories"><option value="Printing"/><option value="Signage"/><option value="Merchandise"/><option value="Event Material"/><option value="Digital Asset"/><option value="Office Supply"/></datalist></div>
              <div className="form-group"><label htmlFor="order-type">Item Type</label><input id="order-type" list="production-types" placeholder="Select or type manually" value={formData.itemType} onChange={(e) => handleChange('itemType', e.target.value)} disabled={isSaving} /><datalist id="production-types"><option value="Poster"/><option value="Standee"/><option value="Banner"/><option value="Sticker"/><option value="Gift Item"/><option value="Uniform"/></datalist></div>
            </div>
          </div>

          {/* Section 2: Print Specifications & Quantity Financials */}
          <div className="modal-form-section">
            <div className="modal-section-title">
              <DollarSign size={15} />
              <span>2. Material Specifications & Financials</span>
            </div>

            <div className="form-grid">
              <div className="form-group col-span-2"><h4>Production Process</h4><div className="form-group"><label htmlFor="production-owner">Production Project Owner{formData.sourceWork?' *':''}</label><select aria-invalid={!!validationErrors.productionOwner} id="production-owner" required={!!formData.sourceWork} value={formData.productionOwner||''} onChange={e=>handleChange('productionOwner',e.target.value)}><option value="">Select Production member</option>{teamMembers.map(m=><option key={m._id||m.id} value={m._id||m.id}>{m.name}</option>)}</select><small>Project တစ်ခုလျှင် Team member တစ်ယောက်ကို တာဝန်ခံသတ်မှတ်ပါ။</small></div>
              <ProductionProcessLine currentStep={order?.workflowStep || (initialDesign?'quotations':'artwork')} history={order?.workflowHistory || []}/><small>Save ပြီးနောက် View Process မှာ အဆင့်တစ်ခုချင်း ဆက်လုပ်ပါ။ Status ကို Process မှ Auto ပြောင်းပေးပါသည်။</small></div>
              <div className="form-group col-span-2"><label htmlFor="order-print-file">Print-ready File Link</label><textarea id="order-print-file" rows={3} maxLength={2000} placeholder="https://drive.google.com/file/d/FILE_ID/view?usp=sharing" readOnly={!!formData.sourceWork} value={formData.printFileUrl} onChange={e=>handleChange('printFileUrl',e.target.value)} disabled={isSaving}/><small>ပရင့်ထုတ်မည့်ဖိုင်၏ Link အပြည့်ထည့်ပါ။ Restricted ဖိုင်ကို Access ရှိသူသာ ဖွင့်နိုင်ပါသည်။</small>{validationErrors.printFileUrl&&<span role="alert" className="field-error-msg">{validationErrors.printFileUrl}</span>}</div>
              <div className="form-group col-span-2">
                <label htmlFor="order-spec">Material & Print Specifications</label>
                <input
                  id="order-spec"
                  type="text"
                  maxLength={1000}
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
                <small>မှာယူထုတ်လုပ်မည့် စုစုပေါင်းအရေအတွက်။ ဥပမာ 1,000 ထည်။</small>
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
                <small>တစ်ခုချင်းစျေးနှုန်း။ ဥပမာ 5,000 ကျပ်။ Order တစ်ခုအတွင်း ငွေကြေးတစ်မျိုးတည်းသုံးပါ။</small>
              </div>
              <div className="form-group"><label htmlFor="order-remaining">Remaining Quantity</label><input id="order-remaining" type="number" min="0" value={formData.remainingQuantity} onChange={(e) => handleChange('remainingQuantity', e.target.value)} disabled={isSaving} /><small>ထုတ်ယူ/သုံးပြီးနောက် ကျန်ရှိသည့်အရေအတွက်။ 1,000 ထဲက 200 သုံးလျှင် 800။ Store လက်ကျန်နှင့် Auto မချိတ်ပါ။</small></div>

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
                /><small>Quantity × Unit Cost ကို Auto တွက်ပါသည်။ 1,000 × 5,000 = 5,000,000 ကျပ်။ သဘောတူထားသော စုစုပေါင်းစျေးရှိလျှင် ပြင်နိုင်ပါသည်။</small>
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

              <div className="form-group col-span-2">
                <label htmlFor="order-notes">Production Notes & Delivery Instructions</label>
                <textarea
                  id="order-notes"
                  rows={2}
                  maxLength={2000}
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
