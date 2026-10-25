const mongoose = require('mongoose');

const recruitmentCaseSchema = new mongoose.Schema({
  candidateName: { type: String, required: true, trim: true, maxlength: 160 },
  position: { type: String, required: true, trim: true, maxlength: 160 },
  department: { type: String, required: true, trim: true, maxlength: 120, index: true },
  currentStage: {
    type: String,
    enum: ['application_screening', 'first_interview', 'head_review', 'second_interview', 'practical_test', 'test_review', 'final_interview', 'reference_check', 'hr_alignment', 'final_approval', 'offer', 'onboarding', 'closed'],
    default: 'application_screening'
  },
  selectedStages: [{ type: String, trim: true, maxlength: 80 }],
  firstInterviewPanel: [{ type: String, enum: ['Design Manager', 'Art Director', 'Creative Director', 'Deputy Head', 'HOD', 'HR', 'Other'] }],
  interviewNotes: { type: String, trim: true, maxlength: 1000, default: '' },
  status: { type: String, enum: ['active', 'hired', 'rejected', 'withdrawn', 'closed'], default: 'active' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('RecruitmentCase', recruitmentCaseSchema);
