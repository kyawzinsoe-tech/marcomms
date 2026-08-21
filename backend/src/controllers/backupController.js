const Subscription = require('../models/Subscription');
const TokenEntry = require('../models/TokenEntry');
const Setting = require('../models/Setting');
const { uploadBackupToS3 } = require('../services/s3Service');

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
    const subscriptions = await Subscription.find();
    const tokenEntries = await TokenEntry.find();
    const setting = await Setting.findOne({ key: 'dashboard_config' });

    const backupData = {
      version: '3.0',
      exportedAt: new Date().toISOString(),
      reportMonth: setting?.reportMonth || '2026-08',
      subscriptions: subscriptions.map((s) => ({
        id: s._id,
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
        id: t._id,
        date: t.date,
        account: t.account,
        project: t.project,
        tokens: t.tokens,
        cost: t.cost,
        notes: t.notes,
        archived: t.archived
      }))
    };

    // Optionally upload to AWS S3 if configured
    const dateStr = new Date().toISOString().slice(0, 10);
    const key = `creative-hub-backup-${dateStr}-${Date.now()}.json`;
    const s3Result = await uploadBackupToS3(key, backupData);

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
    const { subscriptions, tokenEntries, reportMonth } = req.body;

    if (!Array.isArray(subscriptions)) {
      return res.status(400).json({ error: 'Invalid backup file: subscriptions array required.' });
    }

    // Clear existing collection records and insert imported
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

    if (reportMonth) {
      await Setting.findOneAndUpdate(
        { key: 'dashboard_config' },
        { reportMonth },
        { upsert: true, new: true }
      );
    }

    res.status(200).json({
      success: true,
      message: 'Backup imported successfully into MongoDB.'
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

    res.status(200).json({
      success: true,
      message: 'Database reset to demo records.'
    });
  } catch (error) {
    next(error);
  }
};
