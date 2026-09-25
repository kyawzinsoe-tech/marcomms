const mongoose = require('mongoose');
const ImportantWork = require('../models/ImportantWork');
const { ROLES, normalizeRole } = require('../config/rbac');

const EDIT_ROLES = new Set([ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HEAD_BRAND]);
const LINK_HOSTS = /^(drive\.google\.com|docs\.google\.com|1drv\.ms|[a-z0-9.-]+\.sharepoint\.com)$/i;
const safeText = (value, max) => String(value || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max);
const canEdit = (user) => EDIT_ROLES.has(normalizeRole(user?.role));

function sanitizeLinks(links) {
  if (!Array.isArray(links)) return [];
  return links.slice(0, 10).map((link) => {
    const type = ['Excel', 'PDF', 'Google Slides'].includes(link?.type) ? link.type : null;
    let parsed;
    try { parsed = new URL(String(link?.url || '')); } catch { return null; }
    if (!type || parsed.protocol !== 'https:' || !LINK_HOSTS.test(parsed.hostname)) return null;
    if (type === 'Google Slides' && parsed.hostname !== 'docs.google.com') return null;
    return { type, label: safeText(link.label || type, 120), url: parsed.toString().slice(0, 1000) };
  }).filter(Boolean);
}

function payload(body) {
  const dueDate = safeText(body.dueDate, 10);
  if (!safeText(body.title, 160)) throw Object.assign(new Error('Work title is required.'), { statusCode: 400 });
  if (!safeText(body.designerName, 120)) throw Object.assign(new Error('Designer name is required.'), { statusCode: 400 });
  if (!safeText(body.supervisorName, 120)) throw Object.assign(new Error('Supervising designer name is required.'), { statusCode: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) throw Object.assign(new Error('A valid due date is required.'), { statusCode: 400 });
  return {
    title: safeText(body.title, 160),
    designerName: safeText(body.designerName, 120),
    supervisorName: safeText(body.supervisorName, 120),
    process: ['Planned', 'Designing', 'Review', 'Revision', 'Approved', 'Completed'].includes(body.process) ? body.process : 'Planned',
    dueDate
  };
}

exports._importantWorkValidation = { sanitizeLinks, payload };
exports.list = async (req, res, next) => {
  try { res.json({ items: await ImportantWork.find().sort({ dueDate: 1, priority: -1 }).lean() }); } catch (error) { next(error); }
};
exports.create = async (req, res, next) => {
  try {
    if (!canEdit(req.user)) return res.status(403).json({ error: 'Only Admin or Head accounts can create important work reminders.' });
    const item = await ImportantWork.create({ ...payload(req.body), createdBy: req.user._id, updatedBy: req.user._id });
    res.status(201).json({ item });
  } catch (error) { next(error); }
};
exports.update = async (req, res, next) => {
  try {
    if (!canEdit(req.user)) return res.status(403).json({ error: 'Only Admin or Head accounts can update important work reminders.' });
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'Invalid work ID.' });
    const item = await ImportantWork.findByIdAndUpdate(req.params.id, { ...payload(req.body), updatedBy: req.user._id }, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ error: 'Important work item not found.' });
    res.json({ item });
  } catch (error) { next(error); }
};
exports.remove = async (req, res, next) => {
  try {
    if (!canEdit(req.user)) return res.status(403).json({ error: 'Only Admin or Head accounts can delete important work.' });
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'Invalid work ID.' });
    const item = await ImportantWork.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ error: 'Important work item not found.' });
    res.status(204).end();
  } catch (error) { next(error); }
};
