const mongoose = require('mongoose');

const WORKFLOW_STEPS = ['artwork', 'quotations', 'sample_approval', 'invoice_head_approval', 'bulk_production', 'quality_check', 'delivery_confirmation', 'final_payment', 'closed'];
const HISTORICAL_STEPS = [...WORKFLOW_STEPS, 'vendor_procedure', 'invoice_delivery_order'];

const productionOrderSchema = new mongoose.Schema(
  {
    designApprovals:[{_id:false,slot:String,name:String,email:String,at:Date,actor:{type:mongoose.Schema.Types.ObjectId,ref:'User'}}],
  sourceWork: {type:mongoose.Schema.Types.ObjectId,ref:'ImportantWork'},
    productionOwner: {type:mongoose.Schema.Types.ObjectId,ref:'User'},
    productionOwnerName: {type:String,default:''},
    orderNumber: {
      type: String,
      required: [true, 'Order number is required'],
      unique: true,
      trim: true,
      maxlength: [40, 'Order number cannot exceed 40 characters']
    },
    campaignName: {
      type: String,
      required: [true, 'Campaign or project name is required'],
      trim: true,
      maxlength: [160, 'Campaign name cannot exceed 160 characters']
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
      trim: true,
      maxlength: [300, 'Item description cannot exceed 300 characters']
    },
    supplierDriveUrl: { type: String, trim: true, maxlength: 2000, default: '' },
    printFileUrl: { type: String, trim: true, maxlength: 2000, default: '', validate: { validator: value => { if (!value) return true; try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; } }, message: 'Print file link must be a full HTTPS URL.' } },
    itemCategory: { type: String, trim: true, maxlength: 120, default: '' },
    itemType: { type: String, trim: true, maxlength: 120, default: '' },
    specification: {
      type: String,
      default: '',
      maxlength: [1000, 'Specification cannot exceed 1000 characters']
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1']
    },
    remainingQuantity: { type: Number, min: 0, default: 0 },
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
      enum: ['Draft', 'Submitted', 'Sample Proofing', 'In Production', 'Delivered', 'Completed', 'Cancelled'],
      default: 'Draft'
    },
    workflowStep: {
      type: String,
      enum: HISTORICAL_STEPS,
      default: 'artwork'
    },
    sampleStatus: { type: String, enum: ['Awaiting Print', 'In Review', 'Approved', 'Revise'], default: 'Awaiting Print' },
    workflowHistory: [{
      step: { type: String, enum: HISTORICAL_STEPS, required: true },
      action: { type: String, enum: ['CREATED', 'COMPLETED', 'SKIPPED', 'APPROVED', 'REJECTED', 'SAMPLE_PRINTED', 'REVISION_REQUESTED'], required: true },
      actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      actorName: { type: String, required: true },
      actorRole: { type: String, required: true },
      note: { type: String, default: '' },
      evidenceUrl: { type: String, default: '' },
      at: { type: Date, default: Date.now }
    }],
    workflowEvidence: {
      type: Map,
      of: String,
      default: {}
    },
    proofApprovedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    proofApprovedAt: {
      type: Date
    },
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    completedAt: { type: Date },
    completionMode: { type: String, enum: ['workflow', 'authorized_override'], default: undefined },
    completionReason: { type: String, default: '', maxlength: 1000 },
    notes: {
      type: String,
      default: '',
      maxlength: [2000, 'Notes cannot exceed 2000 characters']
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

productionOrderSchema.index({sourceWork:1},{unique:true,partialFilterExpression:{sourceWork:{$type:'objectId'}}});
module.exports = mongoose.model('ProductionOrder', productionOrderSchema);
module.exports.WORKFLOW_STEPS = WORKFLOW_STEPS;
