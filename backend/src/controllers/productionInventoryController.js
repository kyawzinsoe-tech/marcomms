const crypto = require('crypto');
const mongoose = require('mongoose');
const ProductionItem = require('../models/ProductionItem');
const { PERMISSIONS, hasPermission } = require('../config/rbac');
const { createAssetDownloadUrl } = require('../services/storageService');

const {viewUnits, managedUnits, canonicalUnit} = require('../utils/menuAccess');
const {logAuditEvent} = require('../utils/auditLogger');
const itemUnit = item => canonicalUnit(item.businessUnit) || 'Merchandising';
const ALLOWED = new Set(['image/png', 'image/jpeg']);
const MAX_BYTES = 8 * 1024 * 1024;
const clean = (value, max = 200) => String(value || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max);
const canRead = user => viewUnits(user,'posm').length > 0;
const canWrite = user => managedUnits(user).length > 0;
const isSuperAdmin = user => managedUnits(user).length > 0;
const movementValue = (movement) => movement.direction === 'IN' ? movement.quantity : -movement.quantity;
const recalculateStock = (item) => item.movements.reduce((sum, movement) => sum + movementValue(movement), 0);

function validSignature(buffer, type) {
  if (type === 'image/png') return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  return type === 'image/jpeg' && buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
}

async function serialize(item) {
  let imageUrl = '';
  if (item.imageData?.length) imageUrl = `/api/production-inventory/${item._id}/image`;
  else if (item.imageStorageKey) imageUrl = await createAssetDownloadUrl(item.imageStorageKey).catch(() => '');
  const received = item.movements.filter((m) => m.direction === 'IN').reduce((sum, m) => sum + m.quantity, 0);
  const issued = item.movements.filter((m) => m.direction === 'OUT').reduce((sum, m) => sum + m.quantity, 0);
  return { id: String(item._id), sku: item.sku, name: item.name, category: item.category, itemType: item.itemType, unit: item.unit, businessUnit: item.businessUnit, stockDepartment: item.stockDepartment, quantityOnHand: item.quantityOnHand, reorderLevel: item.reorderLevel, imageUrl, received, issued, archived: item.archived,
    movements: [...item.movements].sort((a, b) => new Date(b.at) - new Date(a.at)).map((m) => ({ id: String(m._id), direction: m.direction, quantity: m.quantity, date: m.date, businessUnit: m.businessUnit, fromDepartment: m.fromDepartment, toDepartment: m.toDepartment, functionName: m.functionName, eventName: m.eventName, reference: m.reference, note: m.note, actorName: m.actorName, at: m.at })), createdAt: item.createdAt, updatedAt: item.updatedAt };
}

exports.getItems = async (req, res, next) => { try {
  if (!canRead(req.user)) return res.status(403).json({ error: 'Access denied.' });
  const query = req.query.archived === 'true' ? {} : { archived: false };
  const items = await ProductionItem.find(query).select('+imageStorageKey +imageData').sort({ name: 1 });
  res.json({ items: await Promise.all(items.filter(item => viewUnits(req.user,'posm').includes(itemUnit(item))).map(serialize)) });
} catch (error) { next(error); } };

exports.createItem = async (req, res, next) => { try {
  if (!canWrite(req.user)) return res.status(403).json({ error: 'Access denied.' });
  const { sku, name, unit, openingQuantity, reorderLevel, businessUnit, stockDepartment } = req.body;
  if (!clean(sku, 60) || !clean(name, 180)) return res.status(400).json({ error: 'SKU and item name are required.' });
  if (!managedUnits(req.user).includes(canonicalUnit(businessUnit) || 'Merchandising')) return res.status(403).json({error:'You can only add items for your own team.'});
  const opening = Number(openingQuantity || 0);
  if (!Number.isInteger(opening) || opening < 0) return res.status(400).json({ error: 'Opening quantity must be a whole number.' });
  const item = await ProductionItem.create({ sku: clean(sku, 60).toUpperCase(), name: clean(name, 180), category: 'General', itemType: '', unit: clean(unit || 'pcs', 40), businessUnit: clean(businessUnit, 120), stockDepartment: clean(stockDepartment, 160), quantityOnHand: opening, reorderLevel: Math.max(0, Number(reorderLevel || 0)), createdBy: req.user._id,
    movements: opening ? [{ direction: 'IN', quantity: opening, date: new Date().toISOString().slice(0, 10), businessUnit: clean(businessUnit, 120), fromDepartment: clean(stockDepartment, 160), toDepartment: clean(stockDepartment, 160), reference: 'Opening Balance', actor: req.user._id, actorName: req.user.name }] : [] });
  logAuditEvent({actorId:req.user._id,actorRole:req.user.role,action:'INVENTORY_CREATE',targetEntity:'production_item',targetId:item._id,ip:req.ip,metadata:{sku:item.sku}});
  res.status(201).json({ item: await serialize(await ProductionItem.findById(item._id).select('+imageStorageKey')) });
} catch (error) { if (error?.code === 11000) return res.status(409).json({ error: 'SKU already exists.' }); next(error); } };

exports.uploadImage = async (req, res, next) => { try {
  if (!canWrite(req.user)) return res.status(403).json({ error: 'Access denied.' });
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'Invalid item ID.' });
  const type = req.get('content-type');
  if (!ALLOWED.has(type) || !Buffer.isBuffer(req.body) || req.body.length < 1 || req.body.length > MAX_BYTES || !validSignature(req.body, type)) return res.status(400).json({ error: 'Upload a valid PNG or JPEG image up to 8 MB.' });
  const item = await ProductionItem.findById(req.params.id).select('+imageStorageKey');
  if (!item) return res.status(404).json({ error: 'Production item not found.' });
  if (!(req.method === 'GET' ? viewUnits(req.user,'posm') : managedUnits(req.user)).includes(itemUnit(item))) return res.status(403).json({error:'Access denied for this team.'});
  const ext = type === 'image/png' ? '.png' : '.jpg';
  const key = `production-items/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}${ext}`;
  item.imageData = req.body;
  item.imageStorageKey = key; item.imageMimeType = type; item.imageOriginalName = clean(req.get('x-file-name') || `item${ext}`, 140);
  await item.save();
  logAuditEvent({actorId:req.user._id,actorRole:req.user.role,action:'INVENTORY_'+req.method,targetEntity:'production_item',targetId:item._id,ip:req.ip,metadata:{sku:item.sku}}); res.json({ item: await serialize(item) });
} catch (error) { next(error); } };

exports.getImage = async (req, res, next) => { try {
  if (!canRead(req.user)) return res.status(403).json({ error: 'Access denied.' });
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'Invalid item ID.' });
  const item = await ProductionItem.findById(req.params.id).select('+imageData');
  if (!item) return res.status(404).json({ error: 'Production item not found.' });
  if (!(req.method === 'GET' ? viewUnits(req.user,'posm') : managedUnits(req.user)).includes(itemUnit(item))) return res.status(403).json({error:'Access denied for this team.'});
  if (!item.imageData?.length) return res.status(404).json({ error: 'Item photo not found.' });
  res.set('Content-Type', item.imageMimeType || 'application/octet-stream');
  res.set('Cache-Control', 'private, max-age=300');
  res.send(item.imageData);
} catch (error) { next(error); } };

exports.updateItem = async (req, res, next) => { try {
  if (!canWrite(req.user)) return res.status(403).json({ error: 'Access denied.' });
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'Invalid item ID.' });
  const item = await ProductionItem.findById(req.params.id).select('+imageStorageKey');
  if (!item) return res.status(404).json({ error: 'Production item not found.' });
  if (!(req.method === 'GET' ? viewUnits(req.user,'posm') : managedUnits(req.user)).includes(itemUnit(item))) return res.status(403).json({error:'Access denied for this team.'});
  if (req.body.sku !== undefined) item.sku = clean(req.body.sku, 60).toUpperCase();
  if (req.body.name !== undefined) item.name = clean(req.body.name, 180);
  if (req.body.unit !== undefined) item.unit = clean(req.body.unit || 'pcs', 40);
  if (req.body.businessUnit !== undefined) {
    if (!managedUnits(req.user).includes(canonicalUnit(req.body.businessUnit) || 'Merchandising')) return res.status(403).json({error:'Access denied for the destination team.'});
    item.businessUnit = clean(req.body.businessUnit, 120);
  }
  if (req.body.stockDepartment !== undefined) item.stockDepartment = clean(req.body.stockDepartment, 160);
  if (req.body.reorderLevel !== undefined) item.reorderLevel = Math.max(0, Number(req.body.reorderLevel || 0));
  if (!item.sku || !item.name) return res.status(400).json({ error: 'SKU and item name are required.' });
  await item.save();
  logAuditEvent({actorId:req.user._id,actorRole:req.user.role,action:'INVENTORY_'+req.method,targetEntity:'production_item',targetId:item._id,ip:req.ip,metadata:{sku:item.sku}});
  res.json({ item: await serialize(item) });
} catch (error) { if (error?.code === 11000) return res.status(409).json({ error: 'SKU already exists.' }); next(error); } };

exports.deleteItem = async (req, res, next) => { try {
  if (!isSuperAdmin(req.user)) return res.status(403).json({ error: 'Super Admin access is required to delete an item.' });
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'Invalid item ID.' });
  const item = await ProductionItem.findById(req.params.id);
  if (!item) return res.status(404).json({ error: 'Production item not found.' });
  if (!(req.method === 'GET' ? viewUnits(req.user,'posm') : managedUnits(req.user)).includes(itemUnit(item))) return res.status(403).json({error:'Access denied for this team.'});
  item.archived = true;
  await item.save();
  logAuditEvent({actorId:req.user._id,actorRole:req.user.role,action:'INVENTORY_'+req.method,targetEntity:'production_item',targetId:item._id,ip:req.ip,metadata:{sku:item.sku}});
  res.json({ success: true });
} catch (error) { next(error); } };

exports.addMovement = async (req, res, next) => { try {
  if (!canWrite(req.user)) return res.status(403).json({ error: 'Access denied.' });
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'Invalid item ID.' });
  const item = await ProductionItem.findById(req.params.id).select('+imageStorageKey');
  if (!item) return res.status(404).json({ error: 'Production item not found.' });
  if (!(req.method === 'GET' ? viewUnits(req.user,'posm') : managedUnits(req.user)).includes(itemUnit(item))) return res.status(403).json({error:'Access denied for this team.'});
  const direction = String(req.body.direction || '').toUpperCase(); const quantity = Number(req.body.quantity);
  if (!['IN', 'OUT'].includes(direction) || !Number.isInteger(quantity) || quantity < 1) return res.status(400).json({ error: 'Movement type and whole-number quantity are required.' });
  if (direction === 'OUT' && quantity > item.quantityOnHand) return res.status(409).json({ error: `Only ${item.quantityOnHand} ${item.unit} remain in stock.` });
  item.quantityOnHand += direction === 'IN' ? quantity : -quantity;
  item.movements.push({ direction, quantity, date: clean(req.body.date || new Date().toISOString().slice(0, 10), 10), businessUnit: clean(req.body.businessUnit, 120), fromDepartment: clean(req.body.fromDepartment, 160), toDepartment: clean(req.body.toDepartment, 160), functionName: clean(req.body.functionName, 160), eventName: clean(req.body.eventName, 200), reference: clean(req.body.reference, 120), note: clean(req.body.note, 1000), actor: req.user._id, actorName: req.user.name });
  await item.save();
  logAuditEvent({actorId:req.user._id,actorRole:req.user.role,action:'INVENTORY_'+req.method,targetEntity:'production_item',targetId:item._id,ip:req.ip,metadata:{sku:item.sku}}); res.json({ item: await serialize(item) });
} catch (error) { next(error); } };

exports.updateMovement = async (req, res, next) => { try {
  if (!isSuperAdmin(req.user)) return res.status(403).json({ error: 'Super Admin access is required.' });
  const item = await ProductionItem.findById(req.params.id).select('+imageStorageKey');
  const movement = item?.movements.id(req.params.movementId);
  if (!movement) return res.status(404).json({ error: 'Stock ledger entry not found.' });
  if (!managedUnits(req.user).includes(itemUnit(item))) return res.status(403).json({error:'Access denied for this team.'});
  const direction = String(req.body.direction || movement.direction).toUpperCase();
  const quantity = Number(req.body.quantity ?? movement.quantity);
  if (!['IN', 'OUT'].includes(direction) || !Number.isInteger(quantity) || quantity < 1) return res.status(400).json({ error: 'A valid movement and quantity are required.' });
  Object.assign(movement, { direction, quantity, date: clean(req.body.date ?? movement.date, 10), businessUnit: clean(req.body.businessUnit ?? movement.businessUnit, 120), fromDepartment: clean(req.body.fromDepartment ?? movement.fromDepartment, 160), toDepartment: clean(req.body.toDepartment ?? movement.toDepartment, 160), functionName: clean(req.body.functionName ?? movement.functionName, 160), eventName: clean(req.body.eventName ?? movement.eventName, 200), reference: clean(req.body.reference ?? movement.reference, 120), note: clean(req.body.note ?? movement.note, 1000) });
  const stock = recalculateStock(item);
  if (stock < 0) return res.status(409).json({ error: 'This change would make remaining stock negative.' });
  item.quantityOnHand = stock; await item.save();
  logAuditEvent({actorId:req.user._id,actorRole:req.user.role,action:'INVENTORY_'+req.method,targetEntity:'production_item',targetId:item._id,ip:req.ip,metadata:{sku:item.sku}}); res.json({ item: await serialize(item) });
} catch (error) { next(error); } };

exports.deleteMovement = async (req, res, next) => { try {
  if (!isSuperAdmin(req.user)) return res.status(403).json({ error: 'Super Admin access is required.' });
  const item = await ProductionItem.findById(req.params.id).select('+imageStorageKey');
  const movement = item?.movements.id(req.params.movementId);
  if (!movement) return res.status(404).json({ error: 'Stock ledger entry not found.' });
  if (!managedUnits(req.user).includes(itemUnit(item))) return res.status(403).json({error:'Access denied for this team.'});
  movement.deleteOne();
  const stock = recalculateStock(item);
  if (stock < 0) return res.status(409).json({ error: 'This deletion would make remaining stock negative.' });
  item.quantityOnHand = stock; await item.save();
  logAuditEvent({actorId:req.user._id,actorRole:req.user.role,action:'INVENTORY_'+req.method,targetEntity:'production_item',targetId:item._id,ip:req.ip,metadata:{sku:item.sku}}); res.json({ item: await serialize(item) });
} catch (error) { next(error); } };

exports._inventoryValidation = { validSignature, MAX_BYTES };
