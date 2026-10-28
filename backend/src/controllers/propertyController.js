const mongoose = require('mongoose');
const PropertyItem = require('../models/PropertyItem');
const { PERMISSIONS, hasPermission } = require('../config/rbac');
const { logAuditEvent } = require('../utils/auditLogger');

const {UNITS, teamOf, managedUnits, viewUnits} = require('../utils/menuAccess');
const BUSINESS_UNITS = new Set(UNITS);
const CONDITIONS = new Set(['New', 'Good', 'Fair', 'Needs Repair', 'Damaged', 'Disposed']);
const clean = (value, max = 200) => String(value || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max);
const can = (user, permission) => hasPermission(user, permission);
const actor = (req) => ({ actorId: req.user?._id, actorRole: req.user?.role, ip: req.ip });
const unitFor = teamOf;
const allowedUnit = (user, unit) => managedUnits(user).includes(unit);

function payload(body = {}) {
  const quantity = Number(body.quantity);
  const date = new Date(body.date);
  const businessUnit = clean(body.businessUnit, 40);
  const condition = clean(body.condition, 40);
  const itemType = clean(body.itemType, 120);
  const customType = itemType === 'Other' ? clean(body.customType, 120) : '';
  if (!clean(body.propertyNo, 60) || !clean(body.productName, 180) || !itemType || !clean(body.owner, 160)) throw Object.assign(new Error('No., product name, property type and owner are required.'), { status: 400 });
  if (!BUSINESS_UNITS.has(businessUnit)) throw Object.assign(new Error('Select a valid Business Unit.'), { status: 400 });
  if (!CONDITIONS.has(condition)) throw Object.assign(new Error('Select a valid condition.'), { status: 400 });
  if (!Number.isInteger(quantity) || quantity < 1) throw Object.assign(new Error('Quantity must be a whole number of at least 1.'), { status: 400 });
  if (Number.isNaN(date.getTime())) throw Object.assign(new Error('A valid date is required.'), { status: 400 });
  const includedAccessories = Array.isArray(body.includedAccessories) ? body.includedAccessories.map((v) => clean(v, 80)).filter(Boolean).slice(0, 12) : [];
  const detailKeys = ['team', 'deviceNo', 'keyboard', 'mouse', 'charger', 'specification', 'brand', 'drive', 'mainData', 'description', 'mediaType'];
  const details = Object.fromEntries(detailKeys.map((key) => [key, clean(body.details?.[key], 1000)]));
  return { propertyNo: clean(body.propertyNo, 60).toUpperCase(), date, businessUnit, category: clean(body.category, 80), itemType, customType, productName: clean(body.productName, 180), quantity, condition, owner: clean(body.owner, 160), includedAccessories, details, note: clean(body.note, 1500) };
}

exports.list = async (req, res, next) => { try {
  if (!can(req.user, PERMISSIONS.PROPERTY_READ)) return res.status(403).json({ error: 'Access denied.' });
  const items = await PropertyItem.find({businessUnit: {$in:viewUnits(req.user, 'properties')}}).sort({ date: -1, createdAt: -1 });
  logAuditEvent({...actor(req),action:'PROPERTY_VIEW',targetEntity:'property',metadata:{count:items.length}});
  res.json({ items: items.map((item) => ({ ...item.toObject({flattenMaps:true}), id: String(item._id) })) });
} catch (error) { next(error); } };

exports.create = async (req, res, next) => { try {
  if (!can(req.user, PERMISSIONS.PROPERTY_CREATE)) return res.status(403).json({ error: 'Access denied.' });
  if (!allowedUnit(req.user, req.body.businessUnit)) return res.status(403).json({ error: 'You can only manage your own team properties.' });
  const item = await PropertyItem.create({ ...payload(req.body), createdBy: req.user._id, updatedBy: req.user._id });
  logAuditEvent({ ...actor(req), action: 'PROPERTY_CREATE', targetEntity: 'property', targetId: item._id, metadata: { propertyNo: item.propertyNo, businessUnit: item.businessUnit } });
  res.status(201).json({ item: { ...item.toObject({flattenMaps:true}), id: String(item._id) } });
} catch (error) { if (error?.code === 11000) return res.status(409).json({ error: 'This property No. already exists.' }); if (error.status) return res.status(error.status).json({ error: error.message }); next(error); } };

exports.update = async (req, res, next) => { try {
  if (!can(req.user, PERMISSIONS.PROPERTY_UPDATE)) return res.status(403).json({ error: 'Access denied.' });
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'Invalid property ID.' });
  const item = await PropertyItem.findById(req.params.id);
  if (!item) return res.status(404).json({ error: 'Property not found.' });
  if (!allowedUnit(req.user, item.businessUnit) || !allowedUnit(req.user, req.body.businessUnit)) return res.status(403).json({ error: 'Access denied for this team.' });
  const before = { propertyNo: item.propertyNo, businessUnit: item.businessUnit, quantity: item.quantity, condition: item.condition };
  Object.assign(item, payload(req.body), { updatedBy: req.user._id });
  await item.save();
  logAuditEvent({ ...actor(req), action: 'PROPERTY_UPDATE', targetEntity: 'property', targetId: item._id, metadata: { before, after: { propertyNo: item.propertyNo, businessUnit: item.businessUnit, quantity: item.quantity, condition: item.condition } } });
  res.json({ item: { ...item.toObject({flattenMaps:true}), id: String(item._id) } });
} catch (error) { if (error?.code === 11000) return res.status(409).json({ error: 'This property No. already exists.' }); if (error.status) return res.status(error.status).json({ error: error.message }); next(error); } };

exports.remove = async (req, res, next) => { try {
  if (!can(req.user, PERMISSIONS.PROPERTY_DELETE)) return res.status(403).json({ error: 'Access denied.' });
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'Invalid property ID.' });
  const item = await PropertyItem.findById(req.params.id);
  if (!item) return res.status(404).json({ error: 'Property not found.' });
  if (!allowedUnit(req.user, item.businessUnit)) return res.status(403).json({ error: 'Access denied for this team.' });
  await item.deleteOne();
  logAuditEvent({ ...actor(req), action: 'PROPERTY_DELETE', targetEntity: 'property', targetId: item._id, metadata: { propertyNo: item.propertyNo, businessUnit: item.businessUnit } });
  res.json({ success: true });
} catch (error) { next(error); } };

exports._propertyValidation = { payload, unitFor, allowedUnit };
