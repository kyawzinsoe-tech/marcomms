const mongoose = require('mongoose');

const recruitmentCaseSchema = new mongoose.Schema({
  candidateName: { type: String, required: true, trim: true, maxlength: 160 },
  businessUnit: { type: String, trim: true, maxlength: 120, default: 'Creative', index: true },
  position: { type: String, required: true, trim: true, maxlength: 160 },
  department: { type: String, required: true, trim: true, maxlength: 120, index: true },
  currentStage: {
    type: String,
    enum: ['cv_review', 'shortlisted', 'sent_to_hr', 'interview_scheduled', 'interview_completed', 'assessment_assigned', 'assessment_submitted', 'hod_interview', 'assessment_review', 'hod_recommendation', 'pending_final_approval', 'approved', 'on_hold', 'not_approved', 'offer', 'closed', 'application_screening', 'first_interview', 'head_review', 'second_interview', 'practical_test', 'test_review', 'final_interview', 'reference_check', 'hr_alignment', 'final_approval', 'onboarding'],
    default: 'cv_review'
  },
  selectedStages: [{ type: String, trim: true, maxlength: 80 }],
  firstInterviewPanel: [{ type: String, enum: ['Design Manager', 'Art Director', 'Creative Director', 'Deputy Head', 'HOD', 'HR', 'Other'] }],
  interviewNotes: { type: String, trim: true, maxlength: 1000, default: '' },
  hrOwner: { type: String, trim: true, maxlength: 160, default: '' },
  assessmentType: { type: String, enum: ['', 'Design Test', 'Portfolio Review', 'Writing / Communication Assessment', 'Marketing Case Study', 'Content Assessment', 'Product Assessment', 'Technical Test', 'Research Case Study', 'Data Analysis', 'Other'], default: '' },
  cvUrl: { type: String, trim: true, maxlength: 1000, default: '' },
  portfolioUrl: { type: String, trim: true, maxlength: 1000, default: '' },
  interviewAt: { type: Date },
  hodRecommendation: { type: String, enum: ['', 'Proceed', 'Hold', 'Not Recommended'], default: '' },
  finalDecision: { type: String, enum: ['', 'Pending', 'Approved', 'On Hold', 'Not Approved'], default: 'Pending' },
  evaluationScore: { type: Number, min: 0, max: 100 },
  status: { type: String, enum: ['active', 'hired', 'rejected', 'withdrawn', 'closed'], default: 'active' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('RecruitmentCase', recruitmentCaseSchema);
