const { sendReminderEmail, isValidEmail } = require('../services/emailService');
const Subscription = require('../models/Subscription');

// POST /api/reminders/send (Admin only)
exports.sendReminder = async (req, res, next) => {
  try {
    const { to, product, tool, expiry, status, account, days, subscriptionId } = req.body;

    const recipient = (to || '').trim();
    if (!recipient) {
      return res.status(400).json({ error: 'Recipient email address ("to") is required.' });
    }

    if (!isValidEmail(recipient)) {
      return res.status(400).json({ error: 'Please provide a valid recipient email address format.' });
    }

    if (!product || !product.trim()) {
      return res.status(400).json({ error: 'Product or subscription name is required.' });
    }

    // Optional subscription validation if a MongoDB ID is provided
    if (subscriptionId && typeof subscriptionId === 'string' && subscriptionId.match(/^[0-9a-fA-F]{24}$/)) {
      const subExists = await Subscription.findById(subscriptionId).lean();
      if (!subExists) {
        console.warn(`[Reminder Controller] Subscription ID ${subscriptionId} not found in database, proceeding with provided payload.`);
      }
    }

    // Note: Sender is never accepted from req.body; emailService strictly enforces process.env.REMINDER_FROM_EMAIL
    const result = await sendReminderEmail({
      to: recipient,
      product: (product || '').trim(),
      tool: (tool || '').trim(),
      expiry: (expiry || '').trim(),
      status: (status || 'Due Soon').trim(),
      account: (account || '').trim(),
      days: days !== undefined && days !== null ? Number(days) : 0
    });

    return res.status(200).json({
      success: true,
      message: `Subscription renewal reminder sent to ${recipient}`,
      provider: result.provider,
      messageId: result.messageId
    });
  } catch (error) {
    console.error('[Reminder Controller] Error sending reminder:', error.message);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to dispatch subscription renewal reminder email.'
    });
  }
};

