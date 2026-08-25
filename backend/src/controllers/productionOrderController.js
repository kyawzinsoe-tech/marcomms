const mongoose = require('mongoose');
const ProductionOrder = require('../models/ProductionOrder');
const Supplier = require('../models/Supplier');
const { PERMISSIONS, hasPermission } = require('../config/rbac');

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

    const updates = { ...req.body };

    // Automatically recalculate totalCost if unitCost or quantity is updated
    if (updates.quantity !== undefined || updates.unitCost !== undefined) {
      const q = updates.quantity !== undefined ? Number(updates.quantity) : existing.quantity;
      const u = updates.unitCost !== undefined ? Number(updates.unitCost) : existing.unitCost;
      if (updates.totalCost === undefined) {
        updates.totalCost = q * u;
      }
    }

    // Proof Approval handling
    if (updates.approveProof === true || updates.status === 'Sample Proofing' || updates.status === 'In Production') {
      if (hasPermission(req.user, PERMISSIONS.PRODUCTION_ORDER_APPROVE_PROOF)) {
        updates.proofApprovedBy = req.user._id;
        updates.proofApprovedAt = new Date();
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
