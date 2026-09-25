const mongoose = require('mongoose');
const crypto = require('crypto');
const Subscription = require('../models/Subscription');
const { createPrivateUploadUrl, readPrivateFileSignature, createPrivateDownloadUrl, deleteAssetObject } = require('../services/s3Service');
const { logAuditEvent } = require('../utils/auditLogger');

const INVOICE_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg']);
const MAX_INVOICE_BYTES = 10 * 1024 * 1024;

function safeText(value, max = 200) {
  return String(value || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max);
}

function encryptCredential(password) {
  if (!password) return '';
  if (typeof password !== 'string' || password.length < 8 || password.length > 200) {
    const error = new Error('Account password must contain between 8 and 200 characters.');
    error.statusCode = 400;
    throw error;
  }
  const key = Buffer.from(process.env.SUBSCRIPTION_CREDENTIAL_KEY || '', 'base64');
  if (key.length !== 32) throw new Error('SUBSCRIPTION_CREDENTIAL_KEY must be a 32-byte base64 value.');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(String(password), 'utf8'), cipher.final()]);
  return `${iv.toString('base64')}.${cipher.getAuthTag().toString('base64')}.${encrypted.toString('base64')}`;
}

function publicSubscription(s) {
  return {
    id: String(s._id), product: s.product, tool: s.tool, plan: s.plan, status: s.status,
    start: s.start, expiry: s.expiry, cost: s.cost, email: s.email,
    reminderEmail: s.reminderEmail, alertDays: s.alertDays, initialTokens: s.initialTokens,
    purchaseNote: s.purchaseNote, archived: s.archived,
    hasPassword: Boolean(s.credentialCiphertext),
    invoice: s.invoice?.uploadStatus === 'ready' ? {
      originalName: s.invoice.originalName, mimeType: s.invoice.mimeType,
      fileSize: s.invoice.fileSize, uploadedAt: s.invoice.uploadedAt
    } : null,
    createdAt: s.createdAt
  };
}

function editableFields(body) {
  const allowedPlans = new Set(['Monthly', 'Yearly', 'Pay As You Go', 'Other']);
  return {
    product: safeText(body.product, 120), tool: safeText(body.tool, 120),
    plan: allowedPlans.has(body.plan) ? body.plan : 'Monthly', status: body.status === 'Inactive' ? 'Inactive' : 'Active',
    start: safeText(body.start, 20), expiry: safeText(body.expiry, 20), cost: safeText(body.cost, 30),
    email: safeText(body.email, 254).toLowerCase(), reminderEmail: safeText(body.reminderEmail, 254).toLowerCase(),
    alertDays: Math.max(0, Math.min(365, Number(body.alertDays ?? 7))),
    initialTokens: safeText(body.initialTokens, 30), purchaseNote: safeText(body.purchaseNote, 500)
  };
}

function validSignature(bytes, mimeType) {
  if (mimeType === 'application/pdf') return bytes.subarray(0, 5).toString() === '%PDF-';
  if (mimeType === 'image/png') return bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  return mimeType === 'image/jpeg' && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

exports._securityTestHelpers = { encryptCredential, validSignature };

// GET /api/subscriptions
exports.getSubscriptions = async (req, res, next) => {
  try {
    const includeArchived = req.query.archived === 'true';
    const query = includeArchived ? {} : { archived: false };
    const subscriptions = await Subscription.find(query).select('+credentialCiphertext').sort({ createdAt: -1 });

    res.status(200).json({
      count: subscriptions.length,
      subscriptions: subscriptions.map(publicSubscription)
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/subscriptions (Admin only)
exports.createSubscription = async (req, res, next) => {
  try {
    const subData = { ...editableFields(req.body), createdBy: req.user._id };
    if (req.body.accountPassword) subData.credentialCiphertext = encryptCredential(req.body.accountPassword);
    const subscription = await Subscription.create(subData);

    res.status(201).json({
      subscription: publicSubscription(subscription)
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/subscriptions/:id (Admin only)
exports.updateSubscription = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid subscription ID format.' });
    }

    const changes = editableFields(req.body);
    if (req.body.accountPassword) changes.credentialCiphertext = encryptCredential(req.body.accountPassword);
    const subscription = await Subscription.findByIdAndUpdate(
      req.params.id,
      changes,
      { new: true, runValidators: true }
    ).select('+credentialCiphertext');

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found.' });
    }

    res.status(200).json({
      subscription: publicSubscription(subscription)
    });
  } catch (error) {
    next(error);
  }
};

exports.beginInvoiceUpload = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'Invalid subscription ID format.' });
    const { originalName, mimeType, fileSize } = req.body;
    if (!INVOICE_TYPES.has(mimeType)) return res.status(400).json({ error: 'Invoice must be PDF, PNG, or JPEG.' });
    if (!Number.isFinite(Number(fileSize)) || Number(fileSize) < 1 || Number(fileSize) > MAX_INVOICE_BYTES) return res.status(400).json({ error: 'Invoice must be between 1 byte and 10 MB.' });
    const subscription = await Subscription.findById(req.params.id).select('+invoice.storageKey');
    if (!subscription) return res.status(404).json({ error: 'Subscription not found.' });
    if (subscription.invoice?.uploadStatus === 'ready') return res.status(409).json({ error: 'Existing invoice replacement is disabled to protect audit integrity.' });
    const ext = mimeType === 'application/pdf' ? '.pdf' : mimeType === 'image/png' ? '.png' : '.jpg';
    const filename = `${safeText(originalName, 100).replace(/[^a-zA-Z0-9._-]/g, '_').replace(/\.(pdf|png|jpe?g)$/i, '') || 'invoice'}${ext}`;
    const key = `subscription-invoices/${subscription._id}/${crypto.randomUUID()}${ext}`;
    subscription.invoice = { storageKey: key, originalName: filename, mimeType, fileSize: Number(fileSize), uploadStatus: 'pending', uploadedBy: req.user._id };
    await subscription.save();
    const uploadUrl = await createPrivateUploadUrl({ key, mimeType, metadata: { purpose: 'subscription-invoice' } });
    res.status(201).json({ uploadUrl, subscriptionId: String(subscription._id) });
  } catch (error) { next(error); }
};

exports.completeInvoiceUpload = async (req, res, next) => {
  try {
    const subscription = await Subscription.findById(req.params.id).select('+invoice.storageKey +credentialCiphertext');
    if (!subscription || !subscription.invoice?.storageKey) return res.status(404).json({ error: 'Pending invoice upload not found.' });
    const { bytes, contentType } = await readPrivateFileSignature(subscription.invoice.storageKey);
    if (contentType !== subscription.invoice.mimeType || !validSignature(bytes, subscription.invoice.mimeType)) {
      await deleteAssetObject(subscription.invoice.storageKey).catch(() => {});
      subscription.invoice = undefined;
      await subscription.save();
      return res.status(400).json({ error: 'Invoice file signature does not match its declared type.' });
    }
    subscription.invoice.uploadStatus = 'ready'; subscription.invoice.uploadedAt = new Date();
    await subscription.save();
    logAuditEvent({ actorId: req.user?._id, actorRole: req.user?.role, action: 'SUBSCRIPTION_INVOICE_UPLOADED', targetEntity: 'Subscription', targetId: subscription._id, ip: req.ip });
    res.json({ subscription: publicSubscription(subscription) });
  } catch (error) { next(error); }
};

exports.downloadInvoice = async (req, res, next) => {
  try {
    const subscription = await Subscription.findById(req.params.id).select('+invoice.storageKey');
    if (!subscription || subscription.invoice?.uploadStatus !== 'ready') return res.status(404).json({ error: 'Invoice not found.' });
    const url = await createPrivateDownloadUrl(subscription.invoice.storageKey, subscription.invoice.originalName);
    logAuditEvent({ actorId: req.user?._id, actorRole: req.user?.role, action: 'SUBSCRIPTION_INVOICE_DOWNLOADED', targetEntity: 'Subscription', targetId: subscription._id, ip: req.ip });
    res.json({ url, expiresIn: 300 });
  } catch (error) { next(error); }
};

// PATCH /api/subscriptions/:id/archive (Admin only)
exports.archiveSubscription = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid subscription ID format.' });
    }

    const subscription = await Subscription.findById(req.params.id);
    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found.' });
    }

    subscription.archived = true;
    await subscription.save();

    res.status(200).json({ message: 'Subscription archived.', id: String(subscription._id) });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/subscriptions/:id (Admin only)
exports.deleteSubscription = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid subscription ID format.' });
    }

    const subscription = await Subscription.findById(req.params.id).select('+invoice.storageKey');
    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found.' });
    }
    await subscription.deleteOne();
    if (subscription.invoice?.storageKey) deleteAssetObject(subscription.invoice.storageKey).catch(() => {});

    res.status(200).json({ message: 'Subscription permanently deleted.', id: req.params.id });
  } catch (error) {
    next(error);
  }
};
