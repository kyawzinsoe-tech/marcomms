const TokenEntry = require('../models/TokenEntry');

// GET /api/tokens
exports.getTokenEntries = async (req, res, next) => {
  try {
    const { month, year, includeArchived } = req.query;
    const query = includeArchived === 'true' ? {} : { archived: false };

    if (month) {
      query.date = { $regex: `^${month}` };
    } else if (year) {
      query.date = { $regex: `^${year}` };
    }

    const entries = await TokenEntry.find(query).sort({ date: 1 });

    res.status(200).json({
      count: entries.length,
      tokenEntries: entries.map((e) => ({
        id: e._id,
        date: e.date,
        account: e.account,
        project: e.project,
        tokens: e.tokens,
        cost: e.cost,
        notes: e.notes,
        archived: e.archived,
        createdAt: e.createdAt
      }))
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/tokens (Admin only)
exports.createTokenEntry = async (req, res, next) => {
  try {
    const entryData = {
      ...req.body,
      createdBy: req.user._id
    };
    const entry = await TokenEntry.create(entryData);

    res.status(201).json({
      tokenEntry: {
        id: entry._id,
        date: entry.date,
        account: entry.account,
        project: entry.project,
        tokens: entry.tokens,
        cost: entry.cost,
        notes: entry.notes,
        archived: entry.archived
      }
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/tokens/:id (Admin only)
exports.updateTokenEntry = async (req, res, next) => {
  try {
    const entry = await TokenEntry.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!entry) {
      return res.status(404).json({ error: 'Token entry not found.' });
    }

    res.status(200).json({
      tokenEntry: {
        id: entry._id,
        date: entry.date,
        account: entry.account,
        project: entry.project,
        tokens: entry.tokens,
        cost: entry.cost,
        notes: entry.notes,
        archived: entry.archived
      }
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/tokens/:id/archive (Admin only)
exports.archiveTokenEntry = async (req, res, next) => {
  try {
    const entry = await TokenEntry.findById(req.params.id);
    if (!entry) {
      return res.status(404).json({ error: 'Token entry not found.' });
    }

    entry.archived = true;
    await entry.save();

    res.status(200).json({ message: 'Token entry archived.', id: entry._id });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/tokens/:id (Admin only)
exports.deleteTokenEntry = async (req, res, next) => {
  try {
    const entry = await TokenEntry.findByIdAndDelete(req.params.id);
    if (!entry) {
      return res.status(404).json({ error: 'Token entry not found.' });
    }

    res.status(200).json({ message: 'Token entry permanently deleted.', id: req.params.id });
  } catch (error) {
    next(error);
  }
};
