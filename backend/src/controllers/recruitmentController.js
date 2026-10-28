const RecruitmentCase = require('../models/RecruitmentCase');
const RecruitmentBusinessUnit = require('../models/RecruitmentBusinessUnit');
const RecruitmentAccessLog = require('../models/RecruitmentAccessLog');
const User = require('../models/User');
const { sendRecruitmentAccessAlert } = require('../services/emailService');
const { logAuditEvent } = require('../utils/auditLogger');
const { LEADERSHIP_LEVELS, canAccessRecruitment, isCrossDepartmentSuperAdmin } = require('../utils/recruitmentAccess');

const NOTIFICATION_COOLDOWN_MS = 30 * 60 * 1000;
const DEFAULT_UNITS = ['KBZ Bank', 'KBZPay', 'Comms', 'Creative'];
const unitCode = (value) => String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30);

exports.listBusinessUnits = async (req, res, next) => { try {
  if (!canAccessRecruitment(req.user)) return res.status(403).json({ error: 'Access denied.' });
  if (await RecruitmentBusinessUnit.countDocuments() === 0) await RecruitmentBusinessUnit.insertMany(DEFAULT_UNITS.map((name) => ({ name, code: unitCode(name), createdBy: req.user._id })), { ordered: false }).catch(() => {});
  res.json({ businessUnits: await RecruitmentBusinessUnit.find({ status: { $ne: 'archived' }, name:{$not:/research/i} }).sort({ name: 1 }).lean() });
} catch (error) { next(error); } };

exports.createBusinessUnit = async (req, res, next) => { try {
  if (!['super_admin', 'admin'].includes(req.user.role)) return res.status(403).json({ error: 'Only administrators can manage Business Units.' });
  const name = String(req.body.name || '').trim(); if (/research/i.test(name)) return res.status(400).json({error:'Select an available Business Unit.'}); if (!name) return res.status(400).json({ error: 'Business Unit name is required.' });
  const unit = await RecruitmentBusinessUnit.create({ name, code: unitCode(req.body.code || name), hrOwner: String(req.body.hrOwner || '').trim(), createdBy: req.user._id });
  logAuditEvent({ actorId: req.user._id, actorRole: req.user.role, action: 'RECRUITMENT_BUSINESS_UNIT_CREATED', targetEntity: 'RecruitmentBusinessUnit', targetId: unit._id, ip: clientIp(req), metadata: { name: unit.name, code: unit.code } });
  res.status(201).json({ businessUnit: unit });
} catch (error) { if (error?.code === 11000) return res.status(409).json({ error: 'Business Unit name or code already exists.' }); next(error); } };

exports.updateBusinessUnit = async (req, res, next) => { try {
  if (!['super_admin', 'admin'].includes(req.user.role)) return res.status(403).json({ error: 'Only administrators can manage Business Units.' });
  const updates = {}; ['name','hrOwner','status'].forEach((key) => { if (req.body[key] !== undefined) updates[key] = String(req.body[key]).trim(); }); if (req.body.code !== undefined) updates.code = unitCode(req.body.code);
  const before = await RecruitmentBusinessUnit.findById(req.params.id);
  if (!before) return res.status(404).json({ error: 'Business Unit not found.' });
  if (/research/i.test(updates.name || before.name)) return res.status(400).json({error:'This Business Unit is no longer available.'});
  const oldName = before.name;
  Object.assign(before, updates);
  await before.save();
  if (updates.name && updates.name !== oldName) await RecruitmentCase.updateMany({ businessUnit: oldName }, { $set: { businessUnit: updates.name } });
  logAuditEvent({ actorId: req.user._id, actorRole: req.user.role, action: 'RECRUITMENT_BUSINESS_UNIT_UPDATED', targetEntity: 'RecruitmentBusinessUnit', targetId: before._id, ip: clientIp(req), metadata: { oldName, name: before.name, code: before.code, status: before.status } });
  res.json({ businessUnit: before });
} catch (error) { next(error); } };

exports.deleteBusinessUnit = async (req, res, next) => { try {
  if (req.user.role !== 'super_admin') return res.status(403).json({ error: 'Only Super Admin can permanently delete a Business Unit.' });
  const unit = await RecruitmentBusinessUnit.findById(req.params.id);
  if (!unit) return res.status(404).json({ error: 'Business Unit not found.' });
  const dependentCount = await RecruitmentCase.countDocuments({ businessUnit: unit.name });
  if (dependentCount > 0) return res.status(409).json({ error: `This Business Unit has ${dependentCount} candidate record(s). Disable it instead of deleting it.` });
  await unit.deleteOne();
  logAuditEvent({ actorId: req.user._id, actorRole: req.user.role, action: 'RECRUITMENT_BUSINESS_UNIT_DELETED', targetEntity: 'RecruitmentBusinessUnit', targetId: unit._id, ip: clientIp(req), metadata: { name: unit.name, code: unit.code } });
  res.json({ success: true });
} catch (error) { next(error); } };

function clientIp(req) {
  return String(req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim();
}
const teamFor = (user) => String(user?.department || (user?.role === 'super_admin' ? 'Creative' : '')).trim();

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

async function recordAction(req, record, action) {
  return RecruitmentAccessLog.create({
    actorId: req.user._id,
    actorRole: req.user.role,
    actorDepartment: (req.user.department || '').trim(),
    recruitmentCaseId: record._id,
    caseDepartment: record.department,
    action,
    crossDepartment: false,
    clientIp: clientIp(req),
    userAgent: String(req.headers['user-agent'] || '').slice(0, 500)
  });
}

exports.list = async (req, res, next) => {
  try {
    if (!canAccessRecruitment(req.user)) return res.status(403).json({ error: 'People & Recruitment access is limited to authorized management.' });
    const department = teamFor(req.user);
    if (!department) return res.status(403).json({ error: 'Assign your Team / Department in User Management before opening Interview Process.' });
    const filter = { businessUnit:{$not:/research/i}, department: new RegExp(`^${department.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') };
    const records = await RecruitmentCase.find(filter).sort({ updatedAt: -1 }).lean();
    res.json({ records });
  } catch (error) { next(error); }
};

exports.getOne = async (req, res, next) => {
  try {
    if (!canAccessRecruitment(req.user)) return res.status(403).json({ error: 'People & Recruitment access is limited to authorized management.' });
    const record = await RecruitmentCase.findById(req.params.id);
    if (!record || /research/i.test(record.businessUnit || '')) return res.status(404).json({ error: 'Recruitment record not found.' });
    const sameDepartment = teamFor(req.user).toLowerCase() === record.department.toLowerCase();
    if (!sameDepartment) return res.status(403).json({ error: 'You may only view Interview Process records for your own Team / Department.' });
    await recordView(req, record);
    res.json({ record });
  } catch (error) { next(error); }
};

exports.create = async (req, res, next) => {
  try {
    if (!canAccessRecruitment(req.user)) return res.status(403).json({ error: 'People & Recruitment access is limited to authorized management.' });
    const { candidateName, businessUnit = 'Creative', position, department, selectedStages = [], firstInterviewPanel = [], interviewNotes = '', hrOwner = '', assessmentType = '', cvUrl = '', portfolioUrl = '', interviewAt } = req.body;
    if (/research/i.test(businessUnit || '')) return res.status(400).json({error:'Select an available Business Unit.'});
    if (!candidateName || !position || !department) return res.status(400).json({ error: 'Candidate, position and department are required.' });
    if (teamFor(req.user).toLowerCase() !== String(department).trim().toLowerCase()) {
      return res.status(403).json({ error: 'You may only create recruitment records for your own department.' });
    }
    const allowedInterviewers = new Set(['Design Manager', 'Art Director', 'Creative Director', 'Deputy Head', 'HOD', 'HR', 'Other']);
    const panel = Array.isArray(firstInterviewPanel) ? firstInterviewPanel.filter((role) => allowedInterviewers.has(role)).slice(0, 1) : [];
    const safeLink = (value) => !value || /^https:\/\//i.test(String(value).trim()) ? String(value || '').trim().slice(0, 1000) : '';
    const record = await RecruitmentCase.create({ candidateName, businessUnit, position, department, selectedStages, firstInterviewPanel: panel, interviewNotes: String(interviewNotes).trim().slice(0, 1000), hrOwner: String(hrOwner).trim().slice(0, 160), assessmentType, cvUrl: safeLink(cvUrl), portfolioUrl: safeLink(portfolioUrl), interviewAt: interviewAt || undefined, createdBy: req.user._id });
    await recordAction(req, record, 'CREATE');
    logAuditEvent({ actorId: req.user._id, actorRole: req.user.role, action: 'RECRUITMENT_RECORD_CREATED', targetEntity: 'RecruitmentCase', targetId: record._id, ip: clientIp(req), metadata: { candidateName: record.candidateName, department: record.department } });
    res.status(201).json({ record });
  } catch (error) { next(error); }
};

exports.update = async (req, res, next) => {
  try {
    if (!canAccessRecruitment(req.user)) return res.status(403).json({ error: 'People & Recruitment access is limited to authorized management.' });
    const record = await RecruitmentCase.findById(req.params.id);
    if (!record || /research/i.test(record.businessUnit || '')) return res.status(404).json({ error: 'Recruitment record not found.' });
    const sameDepartment = teamFor(req.user).toLowerCase() === String(record.department || '').toLowerCase();
    if (!sameDepartment) return res.status(403).json({ error: 'You may only update Interview Process records for your own Team / Department.' });
    const allowed = ['candidateName', 'businessUnit', 'position', 'currentStage', 'selectedStages', 'interviewAt', 'interviewNotes', 'hrOwner', 'assessmentType', 'cvUrl', 'portfolioUrl', 'hodRecommendation', 'evaluationScore', 'status'];
    if (/research/i.test(req.body.businessUnit || record.businessUnit || '')) return res.status(400).json({error:'Select an available Business Unit.'});
    for (const field of allowed) if (req.body[field] !== undefined) record[field] = req.body[field];
    const safeLink = (value) => !value || /^https:\/\//i.test(String(value).trim()) ? String(value || '').trim().slice(0, 1000) : '';
    if (req.body.cvUrl !== undefined) record.cvUrl = safeLink(req.body.cvUrl);
    if (req.body.portfolioUrl !== undefined) record.portfolioUrl = safeLink(req.body.portfolioUrl);
    if (req.body.firstInterviewPanel !== undefined) {
      const allowedInterviewers = new Set(['Design Manager', 'Art Director', 'Creative Director', 'Deputy Head', 'HOD', 'HR', 'Other']);
      record.firstInterviewPanel = Array.isArray(req.body.firstInterviewPanel) ? req.body.firstInterviewPanel.filter((role) => allowedInterviewers.has(role)).slice(0, 1) : [];
    }
    if (req.body.finalDecision !== undefined) {
      if (!['super_admin', 'admin'].includes(req.user.role)) return res.status(403).json({ error: 'HR / Management final approval is required.' });
      record.finalDecision = req.body.finalDecision;
      if (req.body.finalDecision === 'Approved') record.currentStage = 'approved';
      if (req.body.finalDecision === 'On Hold') record.currentStage = 'on_hold';
      if (req.body.finalDecision === 'Not Approved') record.currentStage = 'not_approved';
    }
    await record.save();
    await recordAction(req, record, 'UPDATE');
    logAuditEvent({ actorId: req.user._id, actorRole: req.user.role, action: 'RECRUITMENT_RECORD_UPDATED', targetEntity: 'RecruitmentCase', targetId: record._id, ip: clientIp(req), metadata: { currentStage: record.currentStage, finalDecision: record.finalDecision } });
    res.json({ record });
  } catch (error) { next(error); }
};

exports.remove = async (req, res, next) => {
  try {
    if (!['super_admin', 'admin'].includes(req.user.role)) return res.status(403).json({ error: 'Only Admin or Super Admin can delete candidate records.' });
    const record = await RecruitmentCase.findById(req.params.id);
    if (!record || /research/i.test(record.businessUnit || '')) return res.status(404).json({ error: 'Recruitment record not found.' });
    const sameDepartment = teamFor(req.user).toLowerCase() === String(record.department || '').toLowerCase();
    if (!sameDepartment) return res.status(403).json({ error: 'You may only delete records for your own Team / Department.' });
    const snapshot = { candidateName: record.candidateName, position: record.position, department: record.department, currentStage: record.currentStage };
    await recordAction(req, record, 'DELETE');
    await record.deleteOne();
    logAuditEvent({ actorId: req.user._id, actorRole: req.user.role, action: 'RECRUITMENT_RECORD_DELETED', targetEntity: 'RecruitmentCase', targetId: record._id, ip: clientIp(req), metadata: snapshot });
    res.json({ success: true });
  } catch (error) { next(error); }
};

exports.audit = async (req, res, next) => {
  try {
    if (req.user.role !== 'super_admin') return res.status(403).json({ error: 'Super Admin access required.' });
    const logs = await RecruitmentAccessLog.find().sort({ createdAt: -1 }).limit(500).lean();
    res.json({ logs });
  } catch (error) { next(error); }
};
