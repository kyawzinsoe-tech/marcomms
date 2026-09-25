const mongoose = require('mongoose');

const approvalAuditSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductionOrder', required: true, index: true },
  step: { type: String, required: true },
  decision: { type: String, enum: ['APPROVED', 'REJECTED', 'COMPLETED'], required: true },
  approver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  approverName: { type: String, required: true },
  approverEmail: { type: String, required: true },
  approverRole: { type: String, required: true },
  note: { type: String, default: '' },
  ip: { type: String, default: '' },
  userAgent: { type: String, default: '' }
}, { timestamps: true, versionKey: false });

approvalAuditSchema.index({ createdAt: -1, order: 1 });
module.exports = mongoose.model('ApprovalAudit', approvalAuditSchema);
