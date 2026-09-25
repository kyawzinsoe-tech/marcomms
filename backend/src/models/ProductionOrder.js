const mongoose = require('mongoose');

const WORKFLOW_STEPS = [
  'quotations', 'sample_approval', 'vendor_procedure', 'invoice_head_approval',
  'bulk_production', 'delivery_confirmation', 'invoice_delivery_order',
  'final_payment', 'closed'
];

const productionOrderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: [true, 'Order number is required'],
      unique: true,
      trim: true
    },
    campaignName: {
      type: String,
      required: [true, 'Campaign or project name is required'],
      trim: true
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: [true, 'Supplier reference is required']
    },
    assetRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Asset'
    },
    itemDescription: {
      type: String,
      required: [true, 'Item description is required'],
      trim: true
    },
    specification: {
      type: String,
      default: ''
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1']
    },
    unitCost: {
      type: Number,
      default: 0
    },
    totalCost: {
      type: Number,
      default: 0
    },
    orderDate: {
      type: String,
      default: () => new Date().toISOString().slice(0, 10)
    },
    deliveryDeadline: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ['Draft', 'Submitted', 'Sample Proofing', 'In Production', 'Delivered', 'Cancelled'],
      default: 'Draft'
    },
    workflowStep: {
      type: String,
      enum: WORKFLOW_STEPS,
      default: 'quotations'
    },
    workflowHistory: [{
      step: { type: String, enum: WORKFLOW_STEPS, required: true },
      action: { type: String, enum: ['CREATED', 'COMPLETED', 'APPROVED', 'REJECTED'], required: true },
      actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      actorName: { type: String, required: true },
      actorRole: { type: String, required: true },
      note: { type: String, default: '' },
      at: { type: Date, default: Date.now }
    }],
    proofApprovedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    proofApprovedAt: {
      type: Date
    },
    notes: {
      type: String,
      default: ''
    },
    archived: {
      type: Boolean,
      default: false
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

productionOrderSchema.index({ orderNumber: 1, supplier: 1, status: 1 });
productionOrderSchema.index({ campaignName: 'text', itemDescription: 'text', notes: 'text' });

module.exports = mongoose.model('ProductionOrder', productionOrderSchema);
module.exports.WORKFLOW_STEPS = WORKFLOW_STEPS;
