const RecruitmentCase = require('../models/RecruitmentCase');
const RecruitmentAccessLog = require('../models/RecruitmentAccessLog');
const User = require('../models/User');
const { sendRecruitmentAccessAlert } = require('../services/emailService');
const { logAuditEvent } = require('../utils/auditLogger');
const { LEADERSHIP_LEVELS, canAccessRecruitment, isCrossDepartmentSuperAdmin } = require('../utils/recruitmentAccess');

const NOTIFICATION_COOLDOWN_MS = 30 * 60 * 1000;

function clientIp(req) {
  return String(req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim();
}

async function recordView(req, record) {
  const actorDepartment = (req.user.department || '').trim();
  const crossDepartment = isCrossDepartmentSuperAdmin(req.user, record.department);
  const notification = { attempted: false, recipientCount: 0, deliveredCount: 0, failedCount: 0, suppressedByCooldown: false };

  if (crossDepartment) {
    const recent = await RecruitmentAccessLog.exists({
      actorId: req.user._id,
      recruitmentCaseId: record._id,
      crossDepartment: true,
      'notification.attempted': true,
      createdAt: { $gte: new Date(Date.now() - NOTIFICATION_COOLDOWN_MS) }
    });
    if (recent) {
      notification.suppressedByCooldown = true;
    } else {
      const recipients = await User.find({ department: record.department, jobLevel: { $in: LEADERSHIP_LEVELS } }).select('email').lean();
      notification.attempted = true;
      notification.recipientCount = recipients.length;
      const results = await Promise.allSettled(recipients.map(({ email }) => sendRecruitmentAccessAlert({
        to: email,
        department: record.department,
        candidateName: record.candidateName,
        position: record.position,
        viewedBy: req.user.name,
        viewedAt: new Date().toISOString()
      })));
      notification.deliveredCount = results.filter((result) => result.status === 'fulfilled').length;
      notification.failedCount = results.length - notification.deliveredCount;
    }
  }

  const entry = await RecruitmentAccessLog.create({
    actorId: req.user._id,
    actorRole: req.user.role,
    actorDepartment,
    recruitmentCaseId: record._id,
    caseDepartment: record.department,
    action: 'VIEW',
    crossDepartment,
    clientIp: clientIp(req),
    userAgent: String(req.headers['user-agent'] || '').slice(0, 500),
    notification
  });
  logAuditEvent({ actorId: req.user._id, actorRole: req.user.role, action: 'RECRUITMENT_RECORD_VIEW', targetEntity: 'RecruitmentCase', targetId: record._id, ip: clientIp(req), metadata: { department: record.department, crossDepartment, accessLogId: entry._id, notification } });
}

exports.list = async (req, res, next) => {
  try {
    if (!canAccessRecruitment(req.user)) return res.status(403).json({ error: 'People & Recruitment access is limited to authorized management.' });
    const filter = req.user.role === 'super_admin' ? {} : { department: req.user.department };
    const records = await RecruitmentCase.find(filter).sort({ updatedAt: -1 }).lean();
    res.json({ records });
  } catch (error) { next(error); }
};

exports.getOne = async (req, res, next) => {
  try {
    if (!canAccessRecruitment(req.user)) return res.status(403).json({ error: 'People & Recruitment access is limited to authorized management.' });
    const record = await RecruitmentCase.findById(req.params.id);
    if (!record) return res.status(404).json({ error: 'Recruitment record not found.' });
    const sameDepartment = (req.user.department || '').toLowerCase() === record.department.toLowerCase();
    if (req.user.role !== 'super_admin' && !sameDepartment) return res.status(403).json({ error: 'You do not have access to this department.' });
    await recordView(req, record);
    res.json({ record });
  } catch (error) { next(error); }
};

exports.create = async (req, res, next) => {
  try {
    if (!canAccessRecruitment(req.user)) return res.status(403).json({ error: 'People & Recruitment access is limited to authorized management.' });
    const { candidateName, position, department, selectedStages = [], firstInterviewPanel = [], interviewNotes = '' } = req.body;
    if (!candidateName || !position || !department) return res.status(400).json({ error: 'Candidate, position and department are required.' });
    if (req.user.role !== 'super_admin' && String(req.user.department || '').trim().toLowerCase() !== String(department).trim().toLowerCase()) {
      return res.status(403).json({ error: 'You may only create recruitment records for your own department.' });
    }
    const allowedInterviewers = new Set(['Design Manager', 'Art Director', 'Creative Director', 'Deputy Head', 'HOD', 'HR', 'Other']);
    const panel = Array.isArray(firstInterviewPanel) ? firstInterviewPanel.filter((role) => allowedInterviewers.has(role)) : [];
    const record = await RecruitmentCase.create({ candidateName, position, department, selectedStages, firstInterviewPanel: panel, interviewNotes: String(interviewNotes).trim().slice(0, 1000), createdBy: req.user._id });
    res.status(201).json({ record });
  } catch (error) { next(error); }
};

exports.audit = async (req, res, next) => {
  try {
    if (req.user.role !== 'super_admin') return res.status(403).json({ error: 'Super Admin access required.' });
    const logs = await RecruitmentAccessLog.find().sort({ createdAt: -1 }).limit(500).lean();
    res.json({ logs });
  } catch (error) { next(error); }
};
