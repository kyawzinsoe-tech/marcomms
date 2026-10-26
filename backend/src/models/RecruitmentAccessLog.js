const mongoose = require('mongoose');

const recruitmentAccessLogSchema = new mongoose.Schema({
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  actorRole: { type: String, required: true },
  actorDepartment: { type: String, default: '' },
  recruitmentCaseId: { type: mongoose.Schema.Types.ObjectId, ref: 'RecruitmentCase', required: true, index: true },
  caseDepartment: { type: String, required: true, index: true },
  action: { type: String, enum: ['VIEW', 'LIST', 'CREATE', 'UPDATE', 'STAGE_CHANGE', 'DELETE'], required: true },
  crossDepartment: { type: Boolean, default: false, index: true },
  clientIp: { type: String, default: '' },
  userAgent: { type: String, default: '', maxlength: 500 },
  notification: {
    attempted: { type: Boolean, default: false },
    recipientCount: { type: Number, default: 0 },
    deliveredCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    suppressedByCooldown: { type: Boolean, default: false }
  }
}, { timestamps: true });

recruitmentAccessLogSchema.index({ actorId: 1, recruitmentCaseId: 1, createdAt: -1 });
module.exports = mongoose.model('RecruitmentAccessLog', recruitmentAccessLogSchema);
