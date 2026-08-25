const mongoose = require('mongoose');
const Asset = require('../models/Asset');
const { PERMISSIONS, hasPermission } = require('../config/rbac');

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

    const assets = await Asset.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      count: assets.length,
      assets: assets.map((a) => ({
        id: String(a._id),
        title: a.title,
        library: a.library,
        category: a.category,
        fileUrl: a.fileUrl,
        thumbnailUrl: a.thumbnailUrl,
        fileType: a.fileType,
        fileSize: a.fileSize,
        version: a.version,
        tags: a.tags,
        description: a.description,
        archived: a.archived,
        createdBy: a.createdBy,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt
      }))
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

    const asset = await Asset.findById(req.params.id);
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
    const { title, library, category, fileUrl, thumbnailUrl, fileType, fileSize, version, tags, description } = req.body;

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

    if (!fileUrl || !fileUrl.trim()) {
      return res.status(400).json({ error: 'File URL or asset URI is required.' });
    }

    const asset = await Asset.create({
      title: title.trim(),
      library: targetLibrary,
      category: (category || 'General').trim(),
      fileUrl: fileUrl.trim(),
      thumbnailUrl: (thumbnailUrl || '').trim(),
      fileType: (fileType || 'PNG').toUpperCase().trim(),
      fileSize: Number(fileSize || 0),
      version: (version || '1.0').trim(),
      tags: Array.isArray(tags) ? tags : typeof tags === 'string' ? tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      description: (description || '').trim(),
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

    const updated = await Asset.findByIdAndUpdate(
      req.params.id,
      req.body,
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

    const asset = await Asset.findById(req.params.id);
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found.' });
    }

    if (!canWriteLibrary(req.user, asset.library, 'delete')) {
      return res.status(403).json({ error: `Access denied. Insufficient permissions to delete ${asset.library} assets.` });
    }

    await Asset.findByIdAndDelete(req.params.id);

    res.status(200).json({
      message: 'Asset permanently deleted.',
      id: req.params.id
    });
  } catch (error) {
    next(error);
  }
};
