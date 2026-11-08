const roster=require('../services/creativeRoster');
const DesignTeams=require('../models/DesignTeams');
const ImportantWork=require('../models/ImportantWork');
const ProductionTeam=require('../models/ProductionTeam');
const User=require('../models/User');
const mongoose = require('mongoose');
const ProductionOrder = require('../models/ProductionOrder');
const { WORKFLOW_STEPS } = require('../models/ProductionOrder');
const Supplier = require('../models/Supplier');
const ApprovalAudit = require('../models/ApprovalAudit');
const { ROLES, PERMISSIONS, normalizeRole, hasPermission } = require('../config/rbac');

const APPROVAL_STEPS = new Set(['sample_approval', 'invoice_head_approval']);
const STATUS_BY_STEP = {artwork:'Draft',quotations:'Draft',sample_approval:'Sample Proofing',invoice_head_approval:'Submitted',bulk_production:'In Production',quality_check:'In Production',delivery_confirmation:'Delivered',final_payment:'Delivered',closed:'Completed'};
function canonicalStep(step) { return ({vendor_procedure:'invoice_head_approval',invoice_delivery_order:'final_payment'})[step] || step || 'artwork'; }
function sampleApproved(order) { return order.sampleStatus === 'Approved' || (order.workflowHistory || []).some(h=>h.step==='sample_approval' && h.action==='APPROVED'); }

function isGoogleDriveUrl(value) {
  return /^https:\/\/(drive|docs)\.google\.com\//i.test(String(value || '').trim());
}

function publicHistory(history = [], includeActors = false) {
  return history.map((item) => ({
    step: item.step, action: item.action, note: item.note, evidenceUrl: item.evidenceUrl, at: item.at,
    ...(includeActors ? { actorName: item.actorName, actorRole: item.actorRole } : {})
  }));
}

function isWorkflowApprover(user) {
  const role = normalizeRole(user?.role);
  return role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN || (role === ROLES.HEAD_BRAND && user?.productionApprover === true);
}

function canApproveWorkflow(user, step) {
  return APPROVAL_STEPS.has(step) && isWorkflowApprover(user);
}

exports._workflowSecurity = { canApproveWorkflow, isWorkflowApprover, isGoogleDriveUrl, APPROVAL_STEPS, canonicalStep, sampleApproved };

function canForceComplete(user) {
  return isWorkflowApprover(user);
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
      .populate('supplier', 'name code contactPerson phone email driveUrl')
      .populate('assetRef', 'title library fileUrl')
      .populate('proofApprovedBy', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      count: orders.length,
      productionOrders: orders.map((o) => ({
        id: String(o._id),
        designApprovals:o.designApprovals||[], sourceWork: o.sourceWork, productionOwner: o.productionOwner, productionOwnerName: o.productionOwnerName,
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
        itemCategory: o.itemCategory,
        itemType: o.itemType,
        supplierDriveUrl: o.supplierDriveUrl || '',
        printFileUrl: o.printFileUrl || '',
        specification: o.specification,
        quantity: o.quantity,
        remainingQuantity: o.remainingQuantity,
        unitCost: o.unitCost,
        totalCost: o.totalCost,
        orderDate: o.orderDate,
        deliveryDeadline: o.deliveryDeadline,
        status: o.status,
        workflowStep: canonicalStep(o.workflowStep),
        sampleStatus: o.sampleStatus || 'Awaiting Print',
        workflowHistory: publicHistory(o.workflowHistory, [ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(normalizeRole(req.user.role))),
        workflowEvidence: Object.fromEntries(o.workflowEvidence || []),
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
      .populate('supplier', 'name code contactPerson phone email driveUrl')
      .populate('assetRef', 'title library fileUrl')
      .populate('proofApprovedBy', 'name email')
      .populate('createdBy', 'name email');

    if (!order) {
      return res.status(404).json({ error: 'Production order not found.' });
    }

    res.status(200).json({
      productionOrder: {
        id: String(order._id),
        designApprovals:order.designApprovals||[], sourceWork: order.sourceWork, productionOwner: order.productionOwner, productionOwnerName: order.productionOwnerName,
        orderNumber: order.orderNumber,
        campaignName: order.campaignName,
        supplier: order.supplier,
        assetRef: order.assetRef,
        itemDescription: order.itemDescription,
        itemCategory: order.itemCategory,
        itemType: order.itemType,
        supplierDriveUrl: order.supplierDriveUrl || '',
        printFileUrl: order.printFileUrl || '',
        specification: order.specification,
        quantity: order.quantity,
        remainingQuantity: order.remainingQuantity,
        unitCost: order.unitCost,
        totalCost: order.totalCost,
        orderDate: order.orderDate,
        deliveryDeadline: order.deliveryDeadline,
        status: order.status,
        workflowStep: canonicalStep(order.workflowStep),
        sampleStatus: order.sampleStatus || 'Awaiting Print',
        workflowHistory: publicHistory(order.workflowHistory, [ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(normalizeRole(req.user.role))),
        workflowEvidence: Object.fromEntries(order.workflowEvidence || []),
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
      return res.status(403).json({ error: 'Access denied. Only Procurement & Merchandising Officers or Administrators can create production orders.' });
    }

    const {
      orderNumber,
      campaignName,
      supplier,
      assetRef,
      itemDescription,
      itemCategory,
      itemType,
      printFileUrl,
      specification,
      quantity,
      remainingQuantity,
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
    if (campaignName.trim().length > 160 || itemDescription.trim().length > 300 || String(specification || '').trim().length > 1000 || String(notes || '').trim().length > 2000) {
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

    let sourceWork=null;
    if(req.body.sourceWork){
      if(!mongoose.Types.ObjectId.isValid(req.body.sourceWork))return res.status(400).json({error:'Invalid design reference.'});
      sourceWork=await ImportantWork.findById(req.body.sourceWork);
      if(!sourceWork||sourceWork.approvalStatus!=='Approved'||sourceWork.handoffTo!=='Production'||sourceWork.designType!=='Print'||!(sourceWork.designApprovals||[]).some(a=>({'suhnin.phway@kbzbank.com':'Creative Head','kyawzin.soe@kbzbank.com':'Art Director'})[a.email]===a.slot))return res.status(409).json({error:'This print design is not approved for Production.'});
      if(!sourceWork.productionAcceptedAt)return res.status(409).json({error:'The assigned Merchandising member must accept this design before creating an order.'});
      if(await ProductionOrder.exists({sourceWork:sourceWork._id}))return res.status(409).json({error:'A Production order already exists for this design.'});
    }
    let owner=null;
    if(sourceWork?.merchandisingEmail){const assigned=await User.findOne({email:sourceWork.merchandisingEmail});if(!assigned)return res.status(400).json({error:'Assigned Merchandising member needs an existing Portal account.'});req.body.productionOwner=String(assigned._id);}
    if(req.body.productionOwner){
      const config=await DesignTeams.findById('design-teams');const member=await User.findById(req.body.productionOwner);
      if(!(await roster.groups()).Merchandising.includes(member?.email))return res.status(400).json({error:'Select a configured Production Team member.'});
      owner=await User.findById(req.body.productionOwner);
      if(!owner||!hasPermission(owner,PERMISSIONS.PRODUCTION_ORDER_UPDATE))return res.status(400).json({error:'Selected owner does not have Production edit access.'});
    }
    if(sourceWork&&!owner)return res.status(400).json({error:'Assign this project to the assigned Merchandising member.'});
    const order = await ProductionOrder.create({
      designApprovals:sourceWork?.designApprovals||[], sourceWork:sourceWork?._id, productionOwner:owner?._id, productionOwnerName:owner?.name||'',

      orderNumber: finalOrderNumber,
      campaignName: sourceWork?sourceWork.title:campaignName.trim(),
      supplier,
      assetRef: assetRef && mongoose.Types.ObjectId.isValid(assetRef) ? assetRef : undefined,
      itemDescription: itemDescription.trim(),
      itemCategory: String(itemCategory || '').trim().slice(0, 120),
      itemType: String(itemType || '').trim().slice(0, 120),
      supplierDriveUrl: supplierExists.driveUrl || '',
      printFileUrl: sourceWork?sourceWork.designDriveUrl:String(printFileUrl || '').trim(),
      specification: (specification || '').trim(),
      quantity: qty,
      remainingQuantity: Math.max(0, Number(remainingQuantity || 0)),
      unitCost: uCost,
      totalCost: calculatedTotal,
      orderDate: orderDate || new Date().toISOString().slice(0, 10),
      deliveryDeadline: (deliveryDeadline || '').trim(),
      status: 'Draft',
      workflowStep: sourceWork?'quotations':'artwork',
      workflowHistory: [{step:'artwork',action:sourceWork?'COMPLETED':'CREATED',actor:req.user._id,actorName:req.user.name,actorRole:req.user.role,note:sourceWork?'Final design approved in Important Work':'',evidenceUrl:sourceWork?.designDriveUrl||''}],
      notes: (notes || '').trim(),
      createdBy: req.user._id
    });

    if(sourceWork){sourceWork.productionOrder=order._id;sourceWork.history.push({action:'PRODUCTION_ORDER_CREATED',actor:req.user._id,actorName:req.user.name,note:order.orderNumber});await sourceWork.save();}
    const populated = await ProductionOrder.findById(order._id)
      .populate('supplier', 'name code contactPerson phone email driveUrl')
      .populate('assetRef', 'title library fileUrl')
      .populate('createdBy', 'name email');

    res.status(201).json({
      productionOrder: {
        id: String(populated._id),
        designApprovals:populated.designApprovals||[], sourceWork: populated.sourceWork, productionOwner: populated.productionOwner, productionOwnerName: populated.productionOwnerName,
        orderNumber: populated.orderNumber,
        campaignName: populated.campaignName,
        supplier: populated.supplier,
        assetRef: populated.assetRef,
        itemDescription: populated.itemDescription,
        itemCategory: populated.itemCategory,
        itemType: populated.itemType,
        supplierDriveUrl: populated.supplierDriveUrl || '',
        printFileUrl: populated.printFileUrl || '',
        specification: populated.specification,
        quantity: populated.quantity,
        remainingQuantity: populated.remainingQuantity,
        unitCost: populated.unitCost,
        totalCost: populated.totalCost,
        orderDate: populated.orderDate,
        deliveryDeadline: populated.deliveryDeadline,
        status: populated.status,
        workflowStep: canonicalStep(populated.workflowStep),
        sampleStatus: populated.sampleStatus || 'Awaiting Print',
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
      return res.status(400).json({ error: 'An order already exists for this design or order number.' });
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
    if(order.productionOwner&&!isWorkflowApprover(req.user)&&String(order.productionOwner)!==String(req.user._id))return res.status(403).json({error:'Only the assigned Production owner or an authorized Head / Administrator may continue this project.'});
    const currentStep = canonicalStep(order.workflowStep);
    order.workflowStep = currentStep;
    const currentIndex = WORKFLOW_STEPS.indexOf(currentStep);
    if (currentIndex < 0 || currentIndex === WORKFLOW_STEPS.length - 1) return res.status(409).json({ error: 'Workflow is already complete.' });

    const isApproval = APPROVAL_STEPS.has(currentStep);
    const sampleAction = req.body.sampleAction;
    const sampleOperation = currentStep === 'sample_approval' && sampleAction === 'print';
    if (isApproval && !sampleOperation) {
      if (!canApproveWorkflow(req.user, currentStep)) {
        return res.status(403).json({ error: 'Only an Administrator or designated Head approver can approve this step.' });
      }
    } else if (!hasPermission(req.user, PERMISSIONS.PRODUCTION_ORDER_UPDATE)) {
      return res.status(403).json({ error: 'Insufficient permission to advance this workflow.' });
    }

    const note = String(req.body.note || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 1000);
    const skip = req.body.skip === true;
    const evidenceUrl = String(req.body.evidenceUrl || '').trim().slice(0, 1000);
    if (skip && isApproval) return res.status(409).json({error:'Approval steps cannot be skipped.'});
    if (skip && !isWorkflowApprover(req.user)) {
      return res.status(403).json({ error: 'Only an Administrator or designated Head approver can skip a workflow step.' });
    }
    if (skip && evidenceUrl && !isGoogleDriveUrl(evidenceUrl)) {
      return res.status(400).json({ error: 'Evidence must be a valid Google Drive or Google Docs link.' });
    }
    if (!skip && currentStep === 'quotations' && !isGoogleDriveUrl(evidenceUrl)) {
      return res.status(400).json({ error: 'Add the Google Drive link containing the three quotations, or use Skip for an urgent exception.' });
    }
    if (evidenceUrl && !isGoogleDriveUrl(evidenceUrl)) {
      return res.status(400).json({ error: 'Evidence must be a valid Google Drive or Google Docs link.' });
    }
    if (currentStep === 'sample_approval') {
      if (skip) return res.status(409).json({error:'Sample approval cannot be skipped.'});
      if (!['print','approve','revise'].includes(sampleAction)) return res.status(400).json({error:'Choose Print, Approve or Revise for the sample.'});
      if (sampleAction === 'print') {
        if (!evidenceUrl) return res.status(400).json({error:'Add the sample image / Drive link for review.'});
        order.sampleStatus = 'In Review';
      } else {
        if (order.sampleStatus !== 'In Review') return res.status(409).json({error:'Submit a printed sample for review first.'});
        if (sampleAction === 'revise' && !note) return res.status(400).json({error:'Add the requested changes before returning the sample.'});
        order.sampleStatus = sampleAction === 'approve' ? 'Approved' : 'Revise';
      }
      if (sampleAction !== 'approve') {
        order.workflowHistory.push({step:currentStep,action:sampleAction==='print'?'SAMPLE_PRINTED':'REVISION_REQUESTED',actor:req.user._id,actorName:req.user.name,actorRole:req.user.role,note,evidenceUrl});
        if(evidenceUrl) order.workflowEvidence.set(currentStep,evidenceUrl);
        await order.save();
        if(sampleAction==='revise') await ApprovalAudit.create({order:order._id,step:currentStep,decision:'REJECTED',approver:req.user._id,approverName:req.user.name,approverEmail:req.user.email,approverRole:req.user.role,note});
        return res.status(200).json({productionOrder:{id:String(order._id),workflowStep:currentStep,sampleStatus:order.sampleStatus,status:order.status}});
      }
    }
    if (['invoice_head_approval','bulk_production','quality_check','delivery_confirmation','final_payment'].includes(currentStep) && !sampleApproved(order)) return res.status(409).json({error:'Sample approval is required before final production.'});
    const auditNote = skip ? (note || 'Step skipped as an authorized exception.') : note;
    const action = skip ? 'SKIPPED' : isApproval ? 'APPROVED' : 'COMPLETED';
    order.workflowHistory.push({ step: currentStep, action, actor: req.user._id, actorName: req.user.name, actorRole: req.user.role, note: auditNote, evidenceUrl });
    if (evidenceUrl) {
      if (!order.workflowEvidence) order.workflowEvidence = new Map();
      order.workflowEvidence.set(currentStep, evidenceUrl);
    }
    if (isApproval) {
      await ApprovalAudit.create({
        order: order._id, step: currentStep, decision: 'APPROVED', approver: req.user._id,
        approverName: req.user.name, approverEmail: req.user.email, approverRole: req.user.role,
        note, ip: String(req.ip || '').slice(0, 100), userAgent: String(req.headers['user-agent'] || '').slice(0, 300)
      });
      order.proofApprovedBy = req.user._id;
      order.proofApprovedAt = new Date();
    }
    if (skip) {
      await ApprovalAudit.create({
        order: order._id, step: currentStep, decision: 'SKIPPED', approver: req.user._id,
        approverName: req.user.name, approverEmail: req.user.email, approverRole: req.user.role,
        note: auditNote, ip: String(req.ip || '').slice(0, 100), userAgent: String(req.headers['user-agent'] || '').slice(0, 300)
      });
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
    res.status(200).json({ productionOrder: { id: String(order._id), workflowStep: canonicalStep(order.workflowStep),
        sampleStatus: order.sampleStatus || 'Awaiting Print', workflowHistory: publicHistory(order.workflowHistory), workflowEvidence: Object.fromEntries(order.workflowEvidence || []), status: order.status } });
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

    if(existing.productionOwner&&!isWorkflowApprover(req.user)&&String(existing.productionOwner)!==String(req.user._id))return res.status(403).json({error:'This project belongs to another Production owner.'});
    const allowedFields = [
      'orderNumber', 'campaignName', 'supplier', 'assetRef', 'itemDescription', 'itemCategory', 'itemType', 'printFileUrl', 'specification',
      'quantity', 'remainingQuantity', 'unitCost', 'totalCost', 'orderDate', 'deliveryDeadline', 'notes', 'archived'
    ];
    const updates = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowedFields.includes(key)));

    if(existing.sourceWork && (updates.printFileUrl !== undefined && updates.printFileUrl!==existing.printFileUrl || updates.campaignName !== undefined && updates.campaignName!==existing.campaignName))return res.status(409).json({error:'Approved design name and file are linked to Important Work and cannot be replaced here.'});
    if(req.body.productionOwner!==undefined && req.body.productionOwner!==String(existing.productionOwner||'')){
      if(!isWorkflowApprover(req.user))return res.status(403).json({error:'Only an authorized Head / Administrator may reassign the Production owner.'});
      const team=await ProductionTeam.findById('production');
      if(!team?.members.some(id=>String(id)===req.body.productionOwner))return res.status(400).json({error:'Select a configured Production member.'});
      const owner=await User.findById(req.body.productionOwner);if(!owner||!hasPermission(owner,PERMISSIONS.PRODUCTION_ORDER_UPDATE))return res.status(400).json({error:'Owner no longer has Production edit access.'});updates.productionOwner=owner._id;updates.productionOwnerName=owner.name;
    }
    if (updates.supplier) {
      if (!mongoose.Types.ObjectId.isValid(updates.supplier)) return res.status(400).json({error:'Valid supplier reference is required.'});
      const selectedSupplier = await Supplier.findById(updates.supplier);
      if (!selectedSupplier) return res.status(404).json({error:'Supplier not found.'});
      updates.supplierDriveUrl = selectedSupplier.driveUrl || '';
    }

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
      .populate('supplier', 'name code contactPerson phone email driveUrl')
      .populate('assetRef', 'title library fileUrl')
      .populate('proofApprovedBy', 'name email');

    res.status(200).json({
      productionOrder: {
        id: String(updated._id),
        sourceWork: updated.sourceWork, productionOwner: updated.productionOwner, productionOwnerName: updated.productionOwnerName,
        orderNumber: updated.orderNumber,
        campaignName: updated.campaignName,
        supplier: updated.supplier,
        assetRef: updated.assetRef,
        itemDescription: updated.itemDescription,
        itemCategory: updated.itemCategory,
        itemType: updated.itemType,
        supplierDriveUrl: updated.supplierDriveUrl || '',
        printFileUrl: updated.printFileUrl || '',
        specification: updated.specification,
        quantity: updated.quantity,
        remainingQuantity: updated.remainingQuantity,
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
      return res.status(403).json({ error: 'Access denied. Only Procurement & Merchandising Officers or Administrators can delete production orders.' });
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
