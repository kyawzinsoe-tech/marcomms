const Subscription = require('../models/Subscription');
const TokenEntry = require('../models/TokenEntry');
const Asset = require('../models/Asset');
const Supplier = require('../models/Supplier');
const ProductionOrder = require('../models/ProductionOrder');
const Setting = require('../models/Setting');
const { uploadBackupToS3 } = require('../services/s3Service');
const { logAuditEvent } = require('../utils/auditLogger');

const DEMO_SUBSCRIPTIONS = [
  {
    product: 'Magnific',
    tool: 'AI + Photo Download',
    plan: 'Yearly',
    status: 'Inactive',
    start: '2026-08-19',
    expiry: '',
    cost: '',
    email: 'creative.team1010@gmail.com',
    reminderEmail: '',
    alertDays: 7,
    initialTokens: '',
    purchaseNote: '',
    archived: false
  },
  {
    product: 'Magnific',
    tool: 'AI + Photo Download',
    plan: 'Yearly',
    status: 'Inactive',
    start: '2026-08-19',
    expiry: '',
    cost: '',
    email: 'creative.team.kbz999@gmail.com',
    reminderEmail: '',
    alertDays: 7,
    initialTokens: '',
    purchaseNote: '',
    archived: false
  },
  {
    product: 'ChatGPT',
    tool: 'AI + Content Creation',
    plan: 'Monthly',
    status: 'Active',
    start: '2026-08-19',
    expiry: '2026-09-19',
    cost: '24',
    email: 'creative.team.kbz111@gmail.com',
    reminderEmail: '',
    alertDays: 7,
    initialTokens: '',
    purchaseNote: '',
    archived: false
  }
];

// GET /api/backup/export
exports.exportBackup = async (req, res, next) => {
  try {
    const [subscriptions, tokenEntries, assets, suppliers, productionOrders, setting] = await Promise.all([
      Subscription.find(),
      TokenEntry.find(),
      Asset.find(),
      Supplier.find(),
      ProductionOrder.find().populate('supplier', 'name code').populate('assetRef', 'title library'),
      Setting.findOne({ key: 'dashboard_config' })
    ]);

    const backupData = {
      version: '3.5',
      exportedAt: new Date().toISOString(),
      reportMonth: setting?.reportMonth || '2026-08',
      counts: {
        subscriptions: subscriptions.length,
        tokenEntries: tokenEntries.length,
        assets: assets.length,
        suppliers: suppliers.length,
        productionOrders: productionOrders.length
      },
      subscriptions: subscriptions.map((s) => ({
        id: String(s._id),
        product: s.product,
        tool: s.tool,
        plan: s.plan,
        status: s.status,
        start: s.start,
        expiry: s.expiry,
        cost: s.cost,
        email: s.email,
        reminderEmail: s.reminderEmail,
        alertDays: s.alertDays,
        initialTokens: s.initialTokens,
        purchaseNote: s.purchaseNote,
        archived: s.archived
      })),
      tokenEntries: tokenEntries.map((t) => ({
        id: String(t._id),
        date: t.date,
        account: t.account,
        project: t.project,
        tokens: t.tokens,
        cost: t.cost,
        notes: t.notes,
        archived: t.archived
      })),
      assets: assets.map((a) => ({
        id: String(a._id),
        library: a.library,
        title: a.title,
        category: a.category,
        fileUrl: a.fileUrl,
        fileType: a.fileType,
        fileSize: a.fileSize,
        dimensions: a.dimensions,
        tags: a.tags,
        description: a.description,
        archived: a.archived
      })),
      suppliers: suppliers.map((sup) => ({
        id: String(sup._id),
        name: sup.name,
        code: sup.code,
        categories: sup.categories,
        contactPerson: sup.contactPerson,
        phone: sup.phone,
        email: sup.email,
        address: sup.address,
        rating: sup.rating,
        status: sup.status,
        notes: sup.notes,
        archived: sup.archived
      })),
      productionOrders: productionOrders.map((po) => ({
        id: String(po._id),
        orderNumber: po.orderNumber,
        campaignName: po.campaignName,
        supplierId: po.supplier ? String(po.supplier._id || po.supplier) : null,
        supplierName: po.supplier?.name || null,
        assetRefId: po.assetRef ? String(po.assetRef._id || po.assetRef) : null,
        itemDescription: po.itemDescription,
        specification: po.specification,
        quantity: po.quantity,
        unitCost: po.unitCost,
        totalCost: po.totalCost,
        orderDate: po.orderDate,
        deliveryDeadline: po.deliveryDeadline,
        status: po.status,
        notes: po.notes,
        archived: po.archived
      }))
    };

    // Upload snapshot to AWS S3 if configured
    const dateStr = new Date().toISOString().slice(0, 10);
    const key = `creative-hub-backup-${dateStr}-${Date.now()}.json`;
    const s3Result = await uploadBackupToS3(key, backupData).catch((err) => {
      console.warn('[S3 Backup Notice]', err.message);
      return null;
    });

    res.status(200).json({
      success: true,
      backup: backupData,
      s3: s3Result
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/backup/import (Admin only)
exports.importBackup = async (req, res, next) => {
  try {
    const { subscriptions, tokenEntries, assets, suppliers, productionOrders, reportMonth } = req.body;

    if (!Array.isArray(subscriptions) && !Array.isArray(assets) && !Array.isArray(suppliers)) {
      return res.status(400).json({ error: 'Invalid backup file: structured array collections required.' });
    }

    // 1. Subscriptions
    if (Array.isArray(subscriptions)) {
      await Subscription.deleteMany({});
      if (subscriptions.length > 0) {
        const subDocs = subscriptions.map((s) => ({
          product: s.product,
          tool: s.tool,
          plan: s.plan || 'Monthly',
          status: s.status || 'Active',
          start: s.start || '',
          expiry: s.expiry || '',
          cost: s.cost || '',
          email: s.email || '',
          reminderEmail: s.reminderEmail || '',
          alertDays: Number(s.alertDays ?? 7),
          initialTokens: s.initialTokens || '',
          purchaseNote: s.purchaseNote || '',
          archived: !!s.archived,
          createdBy: req.user._id
        }));
        await Subscription.insertMany(subDocs);
      }
    }

    // 2. Token Entries
    if (Array.isArray(tokenEntries)) {
      await TokenEntry.deleteMany({});
      if (tokenEntries.length > 0) {
        const tokenDocs = tokenEntries.map((t) => ({
          date: t.date,
          account: t.account,
          project: t.project,
          tokens: Number(t.tokens || 0),
          cost: t.cost || '',
          notes: t.notes || '',
          archived: !!t.archived,
          createdBy: req.user._id
        }));
        await TokenEntry.insertMany(tokenDocs);
      }
    }

    // 3. Assets (if included)
    if (Array.isArray(assets) && assets.length > 0) {
      await Asset.deleteMany({});
      const assetDocs = assets.map((a) => ({
        library: a.library || 'kbz_bank',
        title: a.title,
        category: a.category || 'Logos',
        fileUrl: a.fileUrl || '',
        fileType: a.fileType || 'PNG',
        fileSize: a.fileSize || '',
        dimensions: a.dimensions || '',
        tags: Array.isArray(a.tags) ? a.tags : [],
        description: a.description || '',
        archived: !!a.archived,
        createdBy: req.user._id
      }));
      await Asset.insertMany(assetDocs);
    }

    // 4. Suppliers (if included)
    if (Array.isArray(suppliers) && suppliers.length > 0) {
      await Supplier.deleteMany({});
      const supDocs = suppliers.map((s) => ({
        name: s.name,
        code: s.code || '',
        categories: Array.isArray(s.categories) ? s.categories : [],
        contactPerson: s.contactPerson || '',
        phone: s.phone || '',
        email: s.email || '',
        address: s.address || '',
        rating: Number(s.rating || 5),
        status: s.status || 'Active',
        notes: s.notes || '',
        archived: !!s.archived,
        createdBy: req.user._id
      }));
      await Supplier.insertMany(supDocs);
    }

    // 5. Setting
    if (reportMonth) {
      await Setting.findOneAndUpdate(
        { key: 'dashboard_config' },
        { reportMonth },
        { upsert: true, new: true }
      );
    }

    logAuditEvent({
      actorId: req.user?._id || req.user?.id,
      actorRole: req.user?.role,
      action: 'DATABASE_BACKUP_IMPORTED',
      targetEntity: 'Database',
      ip: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
      outcome: 'SUCCESS',
      metadata: {
        subscriptionsCount: subscriptions.length,
        tokenEntriesCount: tokenEntries.length,
        assetsCount: assets.length,
        suppliersCount: suppliers.length
      }
    });

    res.status(200).json({
      success: true,
      message: 'System backup imported successfully into MongoDB.'
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/backup/reset (Admin only)
exports.resetDemoData = async (req, res, next) => {
  try {
    await Subscription.deleteMany({});
    await TokenEntry.deleteMany({});

    const subDocs = DEMO_SUBSCRIPTIONS.map((s) => ({
      ...s,
      createdBy: req.user._id
    }));
    await Subscription.insertMany(subDocs);

    await Setting.findOneAndUpdate(
      { key: 'dashboard_config' },
      { reportMonth: '2026-08' },
      { upsert: true }
    );

    logAuditEvent({
      actorId: req.user?._id || req.user?.id,
      actorRole: req.user?.role,
      action: 'DATABASE_RESET_DEMO',
      targetEntity: 'Database',
      ip: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
      outcome: 'SUCCESS'
    });

    res.status(200).json({
      success: true,
      message: 'Database reset to demo records.'
    });
  } catch (error) {
    next(error);
  }
};
