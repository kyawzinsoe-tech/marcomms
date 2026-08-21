const Subscription = require('../models/Subscription');

// GET /api/subscriptions
exports.getSubscriptions = async (req, res, next) => {
  try {
    const includeArchived = req.query.archived === 'true';
    const query = includeArchived ? {} : { archived: false };
    const subscriptions = await Subscription.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      count: subscriptions.length,
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
        archived: s.archived,
        createdAt: s.createdAt
      }))
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/subscriptions (Admin only)
exports.createSubscription = async (req, res, next) => {
  try {
    const subData = {
      ...req.body,
      createdBy: req.user._id
    };
    const subscription = await Subscription.create(subData);

    res.status(201).json({
      subscription: {
        id: subscription._id,
        product: subscription.product,
        tool: subscription.tool,
        plan: subscription.plan,
        status: subscription.status,
        start: subscription.start,
        expiry: subscription.expiry,
        cost: subscription.cost,
        email: subscription.email,
        reminderEmail: subscription.reminderEmail,
        alertDays: subscription.alertDays,
        initialTokens: subscription.initialTokens,
        purchaseNote: subscription.purchaseNote,
        archived: subscription.archived
      }
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/subscriptions/:id (Admin only)
exports.updateSubscription = async (req, res, next) => {
  try {
    const subscription = await Subscription.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found.' });
    }

    res.status(200).json({
      subscription: {
        id: subscription._id,
        product: subscription.product,
        tool: subscription.tool,
        plan: subscription.plan,
        status: subscription.status,
        start: subscription.start,
        expiry: subscription.expiry,
        cost: subscription.cost,
        email: subscription.email,
        reminderEmail: subscription.reminderEmail,
        alertDays: subscription.alertDays,
        initialTokens: subscription.initialTokens,
        purchaseNote: subscription.purchaseNote,
        archived: subscription.archived
      }
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/subscriptions/:id/archive (Admin only)
exports.archiveSubscription = async (req, res, next) => {
  try {
    const subscription = await Subscription.findById(req.params.id);
    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found.' });
    }

    subscription.archived = true;
    await subscription.save();

    res.status(200).json({ message: 'Subscription archived.', id: subscription._id });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/subscriptions/:id (Admin only)
exports.deleteSubscription = async (req, res, next) => {
  try {
    const subscription = await Subscription.findByIdAndDelete(req.params.id);
    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found.' });
    }

    res.status(200).json({ message: 'Subscription permanently deleted.', id: req.params.id });
  } catch (error) {
    next(error);
  }
};
