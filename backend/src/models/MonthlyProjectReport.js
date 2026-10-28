const mongoose = require('mongoose');

const monthlyProjectReportSchema = new mongoose.Schema({
  month: { type: String, required: true, match: /^\d{4}-\d{2}$/, unique: true, index: true },
  originalName: { type: String, required: true },
  sourceType: { type: String, enum: ['upload', 'google-sheet'], default: 'upload' },
  sourceUrl: { type: String, default: '' },
  payAliasRestored: { type: Boolean, default: false },
  sheets: [{
    key: { type: String, required: true },
    name: { type: String, required: true },
    title: { type: String, default: '' },
    columns: [{ type: String }],
    rows: [{ type: mongoose.Schema.Types.Mixed }]
  }],
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('MonthlyProjectReport', monthlyProjectReportSchema);
