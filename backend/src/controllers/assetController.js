const mongoose = require('mongoose');
const crypto = require('crypto');
const Asset = require('../models/Asset');
const { PERMISSIONS, hasPermission } = require('../config/rbac');
const {
  createAssetUploadUrl,
  readAssetSignature,
  deleteAssetObject,
  createAssetDownloadUrl
} = require('../services/s3Service');

const ALLOWED_IMAGE_TYPES = { 'image/png': 'PNG', 'image/jpeg': 'JPEG' };
const MAX_ASSET_BYTES = 10 * 1024 * 1024;

function safeText(value, max = 200) {
  return String(value || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max);
}

function safeOriginalName(value, mimeType) {
  const ext = mimeType === 'image/png' ? '.png' : '.jpg';
  const base = safeText(value, 120).replace(/[^a-zA-Z0-9._-]/g, '_').replace(/\.{2,}/g, '.');
  return `${(base.replace(/\.(png|jpe?g)$/i, '') || 'asset').slice(0, 100)}${ext}`;
}

function hasValidSignature(bytes, mimeType) {
  if (mimeType === 'image/png') return bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  return mimeType === 'image/jpeg' && bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

function safeGoogleDriveUrl(value) {
  const url = String(value || '').trim();
  if (!url) return '';
  return /^https:\/\/(drive|docs)\.google\.com\//i.test(url) ? url.slice(0, 1000) : null;
}

exports._assetValidation = { hasValidSignature, safeOriginalName, safeGoogleDriveUrl, MAX_ASSET_BYTES };

// Helper to check read permission for a library
function canReadLibrary(user, library) {
  if (library === 'kbz_bank') return hasPermission(user, PERMISSIONS.ASSET_READ_BANK);
  if (library === 'kbz_pay') return hasPermission(user, PERMISSIONS.ASSET_READ_PAY);
  if (library === 'kbz_comms') return hasPermission(user, PERMISSIONS.ASSET_READ_COMMS);
  return false;
}

// Helper to check write permission for a library
function canWriteLibrary(user, library, action = 'create') {
  const permMap = {
    kbz_bank: {
      create: PERMISSIONS.ASSET_CREATE_BANK,
      update: PERMISSIONS.ASSET_UPDATE_BANK,
      delete: PERMISSIONS.ASSET_DELETE_BANK
    },
    kbz_pay: {
      create: PERMISSIONS.ASSET_CREATE_PAY,
      update: PERMISSIONS.ASSET_UPDATE_PAY,
      delete: PERMISSIONS.ASSET_DELETE_PAY
    },
    kbz_comms: {
      create: PERMISSIONS.ASSET_CREATE_COMMS,
      update: PERMISSIONS.ASSET_UPDATE_COMMS,
      delete: PERMISSIONS.ASSET_DELETE_COMMS
    }
  };

  const libPerms = permMap[library];
  if (!libPerms) return false;
  return hasPermission(user, libPerms[action]);
}

// GET /api/assets
exports.getAssets = async (req, res, next) => {
  try {
    const { library, category, search, archived } = req.query;
    const query = {};

    // Archive filter
    if (archived !== 'true') {
      query.archived = false;
    }

    // Library filter & RBAC check
    if (library) {
      if (!['kbz_bank', 'kbz_pay', 'kbz_comms'].includes(library)) {
        return res.status(400).json({ error: 'Invalid asset library specified.' });
      }
      if (!canReadLibrary(req.user, library)) {
        return res.status(403).json({ error: `Access denied. Insufficient permissions to view ${library} assets.` });
      }
      query.library = library;
    } else {
      // If no library specified, restrict query to libraries the user has permission to read
      const allowedLibraries = [];
      if (canReadLibrary(req.user, 'kbz_bank')) allowedLibraries.push('kbz_bank');
      if (canReadLibrary(req.user, 'kbz_pay')) allowedLibraries.push('kbz_pay');
      if (canReadLibrary(req.user, 'kbz_comms')) allowedLibraries.push('kbz_comms');

      if (allowedLibraries.length === 0) {
        return res.status(403).json({ error: 'Access denied. Insufficient permissions to view asset libraries.' });
      }
      query.library = { $in: allowedLibraries };
    }

    // Category filter
    if (category && category !== 'All') {
      query.category = category;
    }

    // Search query
    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [{ title: regex }, { description: regex }, { tags: regex }];
    }

    const assets = await Asset.find(query).select('+storageKey').sort({ createdAt: -1 });

    const serializedAssets = await Promise.all(assets.map(async (a) => {
      let securedUrl = '';
      if (a.uploadStatus === 'ready' && a.storageKey) securedUrl = await createAssetDownloadUrl(a.storageKey);
      return {
        id: String(a._id), title: a.title, library: a.library, category: a.category,
        fileUrl: securedUrl || a.fileUrl, thumbnailUrl: securedUrl || a.thumbnailUrl, downloadUrl: a.downloadUrl,
        fileType: a.fileType, fileSize: a.fileSize, version: a.version, tags: a.tags,
        description: a.description, archived: a.archived, uploadStatus: a.uploadStatus,
        originalName: a.originalName, createdBy: a.createdBy, createdAt: a.createdAt, updatedAt: a.updatedAt
      };
    }));

    res.status(200).json({
      count: assets.length,
      assets: serializedAssets
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/assets/:id
exports.getAssetById = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid asset ID format.' });
    }

    const asset = await Asset.findById(req.params.id).select('+storageKey');
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found.' });
    }

    if (!canReadLibrary(req.user, asset.library)) {
      return res.status(403).json({ error: `Access denied. Insufficient permissions to view ${asset.library} assets.` });
    }

    res.status(200).json({
      asset: {
        id: String(asset._id),
        title: asset.title,
        library: asset.library,
        category: asset.category,
        fileUrl: asset.fileUrl,
        thumbnailUrl: asset.thumbnailUrl,
        downloadUrl: asset.downloadUrl,
        fileType: asset.fileType,
        fileSize: asset.fileSize,
        version: asset.version,
        tags: asset.tags,
        description: asset.description,
        archived: asset.archived,
        createdBy: asset.createdBy,
        createdAt: asset.createdAt,
        updatedAt: asset.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/assets
exports.createAsset = async (req, res, next) => {
  try {
    const { title, library, category, fileUrl, thumbnailUrl, downloadUrl, fileType, fileSize, version, tags, description } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Asset title is required.' });
    }

    const targetLibrary = library || 'kbz_bank';
    if (!['kbz_bank', 'kbz_pay', 'kbz_comms'].includes(targetLibrary)) {
      return res.status(400).json({ error: 'Invalid asset library specified.' });
    }

    if (!canWriteLibrary(req.user, targetLibrary, 'create')) {
      return res.status(403).json({ error: `Access denied. Insufficient permissions to create assets in ${targetLibrary}.` });
    }

    if (!fileUrl || !/^https:\/\//i.test(fileUrl.trim())) {
      return res.status(400).json({ error: 'A secure HTTPS asset URL is required.' });
    }
    const safeDownloadUrl = safeGoogleDriveUrl(downloadUrl);
    if (safeDownloadUrl === null) return res.status(400).json({ error: 'Download link must be a Google Drive or Google Docs HTTPS URL.' });
    const normalizedType = String(fileType || '').toUpperCase().trim();
    if (!['PNG', 'JPG', 'JPEG'].includes(normalizedType)) {
      return res.status(400).json({ error: 'Only PNG and JPEG brand assets are allowed.' });
    }

    const asset = await Asset.create({
      title: safeText(title),
      library: targetLibrary,
      category: safeText(category || 'General', 100),
      fileUrl: fileUrl.trim(),
      thumbnailUrl: (thumbnailUrl || '').trim(),
      downloadUrl: safeDownloadUrl,
      fileType: normalizedType === 'JPG' ? 'JPEG' : normalizedType,
      fileSize: Number(fileSize || 0),
      version: safeText(version || '1.0', 30),
      tags: (Array.isArray(tags) ? tags : typeof tags === 'string' ? tags.split(',') : []).map((t) => safeText(t, 40)).filter(Boolean).slice(0, 20),
      description: safeText(description, 2000),
      createdBy: req.user._id
    });

    res.status(201).json({
      asset: {
        id: String(asset._id),
        title: asset.title,
        library: asset.library,
        category: asset.category,
        fileUrl: asset.fileUrl,
        thumbnailUrl: asset.thumbnailUrl,
        downloadUrl: asset.downloadUrl,
        fileType: asset.fileType,
        fileSize: asset.fileSize,
        version: asset.version,
        tags: asset.tags,
        description: asset.description,
        archived: asset.archived,
        createdBy: asset.createdBy,
        createdAt: asset.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.initializeAssetUpload = async (req, res, next) => {
  try {
    const { title, library, category, originalName, mimeType, fileSize, downloadUrl, version, tags, description } = req.body;
    const targetLibrary = library || 'kbz_bank';
    const size = Number(fileSize);
    if (!title || !safeText(title)) return res.status(400).json({ error: 'Asset title is required.' });
    if (!canWriteLibrary(req.user, targetLibrary, 'create')) return res.status(403).json({ error: 'Access denied.' });
    if (!ALLOWED_IMAGE_TYPES[mimeType]) return res.status(400).json({ error: 'Only PNG and JPEG images are allowed.' });
    if (!Number.isInteger(size) || size < 1 || size > MAX_ASSET_BYTES) return res.status(400).json({ error: 'Image size must be between 1 byte and 10 MB.' });
    const safeDownloadUrl = safeGoogleDriveUrl(downloadUrl);
    if (safeDownloadUrl === null) return res.status(400).json({ error: 'Download link must be a Google Drive or Google Docs HTTPS URL.' });

    const name = safeOriginalName(originalName, mimeType);
    const key = `brand-assets/${targetLibrary}/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}${mimeType === 'image/png' ? '.png' : '.jpg'}`;
    const asset = await Asset.create({
      title: safeText(title), library: targetLibrary, category: safeText(category || 'General', 100),
      fileType: ALLOWED_IMAGE_TYPES[mimeType], fileSize: size, storageKey: key,
      originalName: name, mimeType, uploadStatus: 'pending', version: safeText(version || '1.0', 30),
      downloadUrl: safeDownloadUrl,
      tags: (Array.isArray(tags) ? tags : []).map((t) => safeText(t, 40)).filter(Boolean).slice(0, 20),
      description: safeText(description, 2000), createdBy: req.user._id
    });
    const uploadUrl = await createAssetUploadUrl({ key, mimeType });
    res.status(201).json({ assetId: String(asset._id), uploadUrl, expiresIn: 300 });
  } catch (error) { next(error); }
};

exports.completeAssetUpload = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'Invalid asset ID.' });
    const asset = await Asset.findById(req.params.id).select('+storageKey');
    if (!asset) return res.status(404).json({ error: 'Asset not found.' });
    if (!canWriteLibrary(req.user, asset.library, 'create')) return res.status(403).json({ error: 'Access denied.' });
    if (asset.uploadStatus !== 'pending') return res.status(409).json({ error: 'Upload is not pending.' });
    const object = await readAssetSignature(asset.storageKey);
    const valid = object.contentType === asset.mimeType && hasValidSignature(object.bytes, asset.mimeType);
    if (!valid) {
      await deleteAssetObject(asset.storageKey).catch(() => {});
      asset.uploadStatus = 'rejected';
      await asset.save();
      return res.status(400).json({ error: 'Uploaded file signature does not match PNG/JPEG.' });
    }
    asset.uploadStatus = 'ready';
    await asset.save();
    const url = await createAssetDownloadUrl(asset.storageKey);
    res.status(200).json({ asset: { id: String(asset._id), title: asset.title, library: asset.library, fileType: asset.fileType, fileSize: asset.fileSize, fileUrl: url, thumbnailUrl: url, downloadUrl: asset.downloadUrl, uploadStatus: asset.uploadStatus } });
  } catch (error) { next(error); }
};

exports.getAssetDownloadUrl = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'Invalid asset ID.' });
    const asset = await Asset.findById(req.params.id).select('+storageKey');
    if (!asset) return res.status(404).json({ error: 'Asset not found.' });
    if (!canReadLibrary(req.user, asset.library)) return res.status(403).json({ error: 'Access denied.' });
    if (asset.uploadStatus !== 'ready' || !asset.storageKey) return res.status(409).json({ error: 'Asset is not ready.' });
    res.status(200).json({ url: await createAssetDownloadUrl(asset.storageKey), expiresIn: 300 });
  } catch (error) { next(error); }
};

// PUT /api/assets/:id
exports.updateAsset = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid asset ID format.' });
    }

    const asset = await Asset.findById(req.params.id);
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found.' });
    }

    if (!canWriteLibrary(req.user, asset.library, 'update')) {
      return res.status(403).json({ error: `Access denied. Insufficient permissions to update ${asset.library} assets.` });
    }

    const allowed = ['title', 'category', 'version', 'tags', 'description', 'downloadUrl', 'archived'];
    const safeUpdates = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
    if (Object.prototype.hasOwnProperty.call(safeUpdates, 'downloadUrl')) {
      const safeDownloadUrl = safeGoogleDriveUrl(safeUpdates.downloadUrl);
      if (safeDownloadUrl === null) return res.status(400).json({ error: 'Download link must be a Google Drive or Google Docs HTTPS URL.' });
      safeUpdates.downloadUrl = safeDownloadUrl;
    }
    const updated = await Asset.findByIdAndUpdate(
      req.params.id,
      safeUpdates,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      asset: {
        id: String(updated._id),
        title: updated.title,
        library: updated.library,
        category: updated.category,
        fileUrl: updated.fileUrl,
        thumbnailUrl: updated.thumbnailUrl,
        downloadUrl: updated.downloadUrl,
        fileType: updated.fileType,
        fileSize: updated.fileSize,
        version: updated.version,
        tags: updated.tags,
        description: updated.description,
        archived: updated.archived,
        updatedAt: updated.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/assets/:id
exports.deleteAsset = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid asset ID format.' });
    }

    const asset = await Asset.findById(req.params.id).select('+storageKey');
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found.' });
    }

    if (!canWriteLibrary(req.user, asset.library, 'delete')) {
      return res.status(403).json({ error: `Access denied. Insufficient permissions to delete ${asset.library} assets.` });
    }

    if (asset.storageKey) await deleteAssetObject(asset.storageKey).catch(() => {});
    await Asset.findByIdAndDelete(req.params.id);

    res.status(200).json({
      message: 'Asset permanently deleted.',
      id: req.params.id
    });
  } catch (error) {
    next(error);
  }
};
