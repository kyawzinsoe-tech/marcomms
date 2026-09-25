const mongoose = require('mongoose');

const importantWorkSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 160 },
  description: { type: String, default: '', trim: true, maxlength: 2000 },
  ownerName: { type: String, default: '', trim: true, maxlength: 120 },
  reminderEmail: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
  dueDate: { type: String, required: true },
  reminderDaysBefore: { type: Number, default: 3, min: 0, max: 90 },
  priority: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'High' },
  status: { type: String, enum: ['Planned', 'In Progress', 'Waiting', 'Completed', 'Cancelled'], default: 'Planned' },
  links: [{
    type: { type: String, enum: ['Excel', 'PDF', 'Google Slides'], required: true },
    label: { type: String, default: '', trim: true, maxlength: 120 },
    url: { type: String, required: true, trim: true, maxlength: 1000 }
  }],
  lastReminderSentAt: { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

importantWorkSchema.index({ dueDate: 1, status: 1, priority: 1 });
module.exports = mongoose.model('ImportantWork', importantWorkSchema);
