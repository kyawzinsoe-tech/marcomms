const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true, maxlength: 120 },
  code: { type: String, required: true, unique: true, trim: true, uppercase: true, maxlength: 30 },
  status: { type: String, enum: ['active', 'disabled', 'archived'], default: 'active' },
  hrOwner: { type: String, trim: true, maxlength: 160, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });
module.exports = mongoose.model('RecruitmentBusinessUnit', schema);
