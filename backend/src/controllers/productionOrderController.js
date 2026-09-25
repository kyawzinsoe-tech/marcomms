const mongoose = require('mongoose');
const ProductionOrder = require('../models/ProductionOrder');
const { WORKFLOW_STEPS } = require('../models/ProductionOrder');
const Supplier = require('../models/Supplier');
const ApprovalAudit = require('../models/ApprovalAudit');
const { ROLES, PERMISSIONS, normalizeRole, hasPermission } = require('../config/rbac');

const APPROVAL_STEPS = new Set(['sample_approval', 'invoice_head_approval']);
const STATUS_BY_STEP = {
  quotations: 'Draft', sample_approval: 'Sample Proofing', vendor_procedure: 'Submitted',
  invoice_head_approval: 'Submitted', bulk_production: 'In Production',
  delivery_confirmation: 'In Production', invoice_delivery_order: 'Delivered',
  final_payment: 'Delivered', closed: 'Delivered'
};

function isGoogleDriveUrl(value) {
  return /^https:\/\/(drive|docs)\.google\.com\//i.test(String(value || '').trim());
}

function publicHistory(history = [], includeActors = false) {
  return history.map((item) => ({
    step: item.step, action: item.action, note: item.note, evidenceUrl: item.evidenceUrl, at: item.at,
    ...(includeActors ? { actorName: item.actorName, actorRole: item.actorRole } : {})
  }));
}

function canApproveWorkflow(user, step) {
  return APPROVAL_STEPS.has(step) && normalizeRole(user?.role) === ROLES.HEAD_BRAND && user?.productionApprover === true;
}

exports._workflowSecurity = { canApproveWorkflow, isGoogleDriveUrl, APPROVAL_STEPS };

function canForceComplete(user) {
  return [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.HEAD_BRAND].includes(normalizeRole(user?.role));
}
exports._workflowSecurity.canForceComplete = canForceComplete;

// Generate unique order number helper: PO-YYYYMMDD-XXXX
function generateOrderNumber() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `PO-${dateStr}-${randomSuffix}`;
}

// GET /api/production-orders
exports.getProductionOrders = async (req, res, next) => {
  try {
    if (!hasPermission(req.user, PERMISSIONS.PRODUCTION_ORDER_READ)) {
      return res.status(403).json({ error: 'Access denied. Insufficient permissions to view production orders.' });
    }

    const { status, supplier, search, archived } = req.query;
    const query = {};

    if (archived !== 'true') {
      query.archived = false;
    }

    if (status && status !== 'All') {
      query.status = status;
    }

    if (supplier && supplier !== 'All') {
      if (mongoose.Types.ObjectId.isValid(supplier)) {
        query.supplier = supplier;
      }
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { orderNumber: regex },
        { campaignName: regex },
        { itemDescription: regex },
        { specification: regex },
        { notes: regex }
      ];
    }

    const orders = await ProductionOrder.find(query)
      .populate('supplier', 'name code contactPerson phone email')
      .populate('assetRef', 'title library fileUrl')
      .populate('proofApprovedBy', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      count: orders.length,
      productionOrders: orders.map((o) => ({
        id: String(o._id),
        orderNumber: o.orderNumber,
        campaignName: o.campaignName,
        supplier: o.supplier
          ? {
              id: String(o.supplier._id),
              name: o.supplier.name,
              code: o.supplier.code,
              contactPerson: o.supplier.contactPerson,
              phone: o.supplier.phone,
              email: o.supplier.email
            }
          : null,
        assetRef: o.assetRef
          ? {
              id: String(o.assetRef._id),
              title: o.assetRef.title,
              library: o.assetRef.library,
              fileUrl: o.assetRef.fileUrl
            }
          : null,
        itemDescription: o.itemDescription,
        specification: o.specification,
        quantity: o.quantity,
        unitCost: o.unitCost,
        totalCost: o.totalCost,
        orderDate: o.orderDate,
        deliveryDeadline: o.deliveryDeadline,
        status: o.status,
        workflowStep: o.workflowStep,
        workflowHistory: publicHistory(o.workflowHistory, [ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(normalizeRole(req.user.role))),
        completedAt: o.completedAt,
        completionMode: o.completionMode,
        completionReason: o.completionReason,
        proofApprovedBy: o.proofApprovedBy
          ? {
              id: String(o.proofApprovedBy._id),
              name: o.proofApprovedBy.name,
              email: o.proofApprovedBy.email
            }
          : null,
        proofApprovedAt: o.proofApprovedAt,
        notes: o.notes,
        archived: o.archived,
        createdBy: o.createdBy
          ? {
              id: String(o.createdBy._id),
              name: o.createdBy.name,
              email: o.createdBy.email
            }
          : null,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt
      }))
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/production-orders/:id
exports.getProductionOrderById = async (req, res, next) => {
  try {
    if (!hasPermission(req.user, PERMISSIONS.PRODUCTION_ORDER_READ)) {
      return res.status(403).json({ error: 'Access denied. Insufficient permissions to view production order details.' });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid production order ID format.' });
    }

    const order = await ProductionOrder.findById(req.params.id)
      .populate('supplier', 'name code contactPerson phone email')
      .populate('assetRef', 'title library fileUrl')
      .populate('proofApprovedBy', 'name email')
      .populate('createdBy', 'name email');

    if (!order) {
      return res.status(404).json({ error: 'Production order not found.' });
    }

    res.status(200).json({
      productionOrder: {
        id: String(order._id),
        orderNumber: order.orderNumber,
        campaignName: order.campaignName,
        supplier: order.supplier,
        assetRef: order.assetRef,
        itemDescription: order.itemDescription,
        specification: order.specification,
        quantity: order.quantity,
        unitCost: order.unitCost,
        totalCost: order.totalCost,
        orderDate: order.orderDate,
        deliveryDeadline: order.deliveryDeadline,
        status: order.status,
        workflowStep: order.workflowStep,
        workflowHistory: publicHistory(order.workflowHistory, [ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(normalizeRole(req.user.role))),
        completedAt: order.completedAt,
        completionMode: order.completionMode,
        completionReason: order.completionReason,
        proofApprovedBy: order.proofApprovedBy,
        proofApprovedAt: order.proofApprovedAt,
        notes: order.notes,
        archived: order.archived,
        createdBy: order.createdBy,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/production-orders
exports.createProductionOrder = async (req, res, next) => {
  try {
    if (!hasPermission(req.user, PERMISSIONS.PRODUCTION_ORDER_CREATE)) {
      return res.status(403).json({ error: 'Access denied. Only Procurement Officers or Administrators can create production orders.' });
    }

    const {
      orderNumber,
      campaignName,
      supplier,
      assetRef,
      itemDescription,
      specification,
      quantity,
      unitCost,
      totalCost,
      orderDate,
      deliveryDeadline,
      status,
      notes
    } = req.body;

    if (!campaignName || !campaignName.trim()) {
      return res.status(400).json({ error: 'Campaign / project name is required.' });
    }

    if (!supplier || !mongoose.Types.ObjectId.isValid(supplier)) {
      return res.status(400).json({ error: 'Valid supplier reference is required.' });
    }

    const supplierExists = await Supplier.findById(supplier);
    if (!supplierExists) {
      return res.status(404).json({ error: 'Referenced supplier not found.' });
    }

    if (!itemDescription || !itemDescription.trim()) {
      return res.status(400).json({ error: 'Item description is required.' });
    }
    if (campaignName.trim().length > 120 || itemDescription.trim().length > 300 || String(specification || '').trim().length > 1000 || String(notes || '').trim().length > 2000) {
      return res.status(400).json({ error: 'Production order text exceeds the allowed length.' });
    }

    const qty = Number(quantity || 1);
    if (qty < 1) {
      return res.status(400).json({ error: 'Quantity must be at least 1.' });
    }

    const uCost = Number(unitCost || 0);
    const calculatedTotal = totalCost !== undefined && totalCost !== null && totalCost !== ''
      ? Number(totalCost)
      : uCost * qty;

    const finalOrderNumber = (orderNumber && orderNumber.trim()) ? orderNumber.trim() : generateOrderNumber();

    const order = await ProductionOrder.create({
      orderNumber: finalOrderNumber,
      campaignName: campaignName.trim(),
      supplier,
      assetRef: assetRef && mongoose.Types.ObjectId.isValid(assetRef) ? assetRef : undefined,
      itemDescription: itemDescription.trim(),
      specification: (specification || '').trim(),
      quantity: qty,
      unitCost: uCost,
      totalCost: calculatedTotal,
      orderDate: orderDate || new Date().toISOString().slice(0, 10),
      deliveryDeadline: (deliveryDeadline || '').trim(),
      status: status || 'Draft',
      workflowStep: 'quotations',
      workflowHistory: [{ step: 'quotations', action: 'CREATED', actor: req.user._id, actorName: req.user.name, actorRole: req.user.role }],
      notes: (notes || '').trim(),
      createdBy: req.user._id
    });

    const populated = await ProductionOrder.findById(order._id)
      .populate('supplier', 'name code contactPerson phone email')
      .populate('assetRef', 'title library fileUrl')
      .populate('createdBy', 'name email');

    res.status(201).json({
      productionOrder: {
        id: String(populated._id),
        orderNumber: populated.orderNumber,
        campaignName: populated.campaignName,
        supplier: populated.supplier,
        assetRef: populated.assetRef,
        itemDescription: populated.itemDescription,
        specification: populated.specification,
        quantity: populated.quantity,
        unitCost: populated.unitCost,
        totalCost: populated.totalCost,
        orderDate: populated.orderDate,
        deliveryDeadline: populated.deliveryDeadline,
        status: populated.status,
        workflowStep: populated.workflowStep,
        workflowHistory: publicHistory(populated.workflowHistory),
        proofApprovedBy: populated.proofApprovedBy,
        proofApprovedAt: populated.proofApprovedAt,
        notes: populated.notes,
        archived: populated.archived,
        createdBy: populated.createdBy,
        createdAt: populated.createdAt
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Production order number must be unique.' });
    }
    next(error);
  }
};

// POST /api/production-orders/:id/workflow/advance
exports.advanceWorkflow = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'Invalid production order ID format.' });
    const order = await ProductionOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Production order not found.' });
    const currentStep = order.workflowStep || 'quotations';
    const currentIndex = WORKFLOW_STEPS.indexOf(currentStep);
    if (currentIndex < 0 || currentIndex === WORKFLOW_STEPS.length - 1) return res.status(409).json({ error: 'Workflow is already complete.' });

    const isApproval = APPROVAL_STEPS.has(currentStep);
    if (isApproval) {
      if (!canApproveWorkflow(req.user, currentStep)) {
        return res.status(403).json({ error: 'Only an Admin-designated Head approver can approve this step.' });
      }
    } else if (!hasPermission(req.user, PERMISSIONS.PRODUCTION_ORDER_UPDATE)) {
      return res.status(403).json({ error: 'Insufficient permission to advance this workflow.' });
    }

    const note = String(req.body.note || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 1000);
    const skip = req.body.skip === true;
    const evidenceUrl = String(req.body.evidenceUrl || '').trim().slice(0, 1000);
    if (skip && currentStep !== 'quotations') {
      return res.status(400).json({ error: 'Only the Collect 3 Quotations step can be skipped.' });
    }
    if (skip && note.length < 5) {
      return res.status(400).json({ error: 'A reason is required when fewer than 3 quotations are available.' });
    }
    if (skip && !isGoogleDriveUrl(evidenceUrl)) {
      return res.status(400).json({ error: 'A valid Google Drive evidence link is required to skip the quotation step.' });
    }
    const action = skip ? 'SKIPPED' : isApproval ? 'APPROVED' : 'COMPLETED';
    order.workflowHistory.push({ step: currentStep, action, actor: req.user._id, actorName: req.user.name, actorRole: req.user.role, note, evidenceUrl: skip ? evidenceUrl : '' });
    if (isApproval) {
      await ApprovalAudit.create({
        order: order._id, step: currentStep, decision: 'APPROVED', approver: req.user._id,
        approverName: req.user.name, approverEmail: req.user.email, approverRole: req.user.role,
        note, ip: String(req.ip || '').slice(0, 100), userAgent: String(req.headers['user-agent'] || '').slice(0, 300)
      });
      order.proofApprovedBy = req.user._id;
      order.proofApprovedAt = new Date();
    }
    order.workflowStep = WORKFLOW_STEPS[currentIndex + 1];
    order.status = order.workflowStep === 'closed' ? 'Completed' : STATUS_BY_STEP[order.workflowStep];
    if (order.workflowStep === 'closed') {
      order.completedBy = req.user._id;
      order.completedAt = new Date();
      order.completionMode = 'workflow';
      order.completionReason = 'All required production workflow steps completed.';
    }
    await order.save();
    if (order.workflowStep === 'closed') {
      await ApprovalAudit.create({
        order: order._id, step: 'closed', decision: 'COMPLETED', approver: req.user._id,
        approverName: req.user.name, approverEmail: req.user.email, approverRole: req.user.role,
        note: order.completionReason, ip: String(req.ip || '').slice(0, 100), userAgent: String(req.headers['user-agent'] || '').slice(0, 300)
      });
    }
    res.status(200).json({ productionOrder: { id: String(order._id), workflowStep: order.workflowStep, workflowHistory: publicHistory(order.workflowHistory), status: order.status } });
  } catch (error) { next(error); }
};

// POST /api/production-orders/:id/workflow/complete — controlled Admin/Head override
exports.completeWorkflow = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'Invalid production order ID format.' });
    if (!canForceComplete(req.user)) {
      return res.status(403).json({ error: 'Only Admin or Head accounts can complete a workflow early.' });
    }
    const reason = String(req.body.reason || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 1000);
    if (reason.length < 5) return res.status(400).json({ error: 'A completion reason of at least 5 characters is required.' });
    const order = await ProductionOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Production order not found.' });
    if (order.status === 'Completed' || order.workflowStep === 'closed') return res.status(409).json({ error: 'Production order is already complete.' });

    order.workflowHistory.push({ step: order.workflowStep || 'quotations', action: 'COMPLETED', actor: req.user._id, actorName: req.user.name, actorRole: req.user.role, note: reason });
    order.workflowStep = 'closed';
    order.status = 'Completed';
    order.completedBy = req.user._id;
    order.completedAt = new Date();
    order.completionMode = 'authorized_override';
    order.completionReason = reason;
    await order.save();
    await ApprovalAudit.create({
      order: order._id, step: 'closed', decision: 'COMPLETED', approver: req.user._id,
      approverName: req.user.name, approverEmail: req.user.email, approverRole: req.user.role,
      note: reason, ip: String(req.ip || '').slice(0, 100), userAgent: String(req.headers['user-agent'] || '').slice(0, 300)
    });
    res.status(200).json({ productionOrder: { id: String(order._id), workflowStep: order.workflowStep, status: order.status, completedAt: order.completedAt, completionMode: order.completionMode, completionReason: order.completionReason } });
  } catch (error) { next(error); }
};

// GET /api/production-orders/approval-audit — deliberately Admin/Super Admin only
exports.getApprovalAudit = async (req, res, next) => {
  try {
    const role = normalizeRole(req.user.role);
    if (![ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(role)) return res.status(403).json({ error: 'Approval audit is restricted to Administrators.' });
    const rows = await ApprovalAudit.find().populate('order', 'orderNumber campaignName').sort({ createdAt: -1 }).limit(500);
    res.status(200).json({ count: rows.length, approvalAudit: rows.map((row) => ({
      id: String(row._id), order: row.order, step: row.step, decision: row.decision,
      approverName: row.approverName, approverEmail: row.approverEmail, approverRole: row.approverRole,
      note: row.note, createdAt: row.createdAt
    })) });
  } catch (error) { next(error); }
};

// PUT /api/production-orders/:id
exports.updateProductionOrder = async (req, res, next) => {
  try {
    if (!hasPermission(req.user, PERMISSIONS.PRODUCTION_ORDER_UPDATE)) {
      return res.status(403).json({ error: 'Access denied. Insufficient permissions to update production orders.' });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid production order ID format.' });
    }

    const existing = await ProductionOrder.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Production order not found.' });
    }

    const allowedFields = [
      'orderNumber', 'campaignName', 'supplier', 'assetRef', 'itemDescription', 'specification',
      'quantity', 'unitCost', 'totalCost', 'orderDate', 'deliveryDeadline', 'notes', 'archived'
    ];
    const updates = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowedFields.includes(key)));

    // Automatically recalculate totalCost if unitCost or quantity is updated
    if (updates.quantity !== undefined || updates.unitCost !== undefined) {
      const q = updates.quantity !== undefined ? Number(updates.quantity) : existing.quantity;
      const u = updates.unitCost !== undefined ? Number(updates.unitCost) : existing.unitCost;
      if (updates.totalCost === undefined) {
        updates.totalCost = q * u;
      }
    }

    const updated = await ProductionOrder.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    )
      .populate('supplier', 'name code contactPerson phone email')
      .populate('assetRef', 'title library fileUrl')
      .populate('proofApprovedBy', 'name email');

    res.status(200).json({
      productionOrder: {
        id: String(updated._id),
        orderNumber: updated.orderNumber,
        campaignName: updated.campaignName,
        supplier: updated.supplier,
        assetRef: updated.assetRef,
        itemDescription: updated.itemDescription,
        specification: updated.specification,
        quantity: updated.quantity,
        unitCost: updated.unitCost,
        totalCost: updated.totalCost,
        orderDate: updated.orderDate,
        deliveryDeadline: updated.deliveryDeadline,
        status: updated.status,
        proofApprovedBy: updated.proofApprovedBy,
        proofApprovedAt: updated.proofApprovedAt,
        notes: updated.notes,
        archived: updated.archived,
        updatedAt: updated.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/production-orders/:id
exports.deleteProductionOrder = async (req, res, next) => {
  try {
    if (!hasPermission(req.user, PERMISSIONS.PRODUCTION_ORDER_DELETE)) {
      return res.status(403).json({ error: 'Access denied. Only Procurement Officers or Administrators can delete production orders.' });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid production order ID format.' });
    }

    const order = await ProductionOrder.findByIdAndDelete(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Production order not found.' });
    }

    res.status(200).json({
      message: 'Production order permanently deleted.',
      id: req.params.id
    });
  } catch (error) {
    next(error);
  }
};
