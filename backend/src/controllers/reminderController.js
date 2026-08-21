const { sendReminderEmail } = require('../services/emailService');

// POST /api/reminders/send (Admin only)
exports.sendReminder = async (req, res, next) => {
  try {
    const { to, product, tool, expiry, status, account, days } = req.body;

    if (!to) {
      return res.status(400).json({ error: 'Recipient email is required.' });
    }

    const result = await sendReminderEmail({
      to,
      product,
      tool,
      expiry,
      status,
      account,
      days
    });

    res.status(200).json({
      success: true,
      message: `Reminder sent to ${to}`,
      details: result
    });
  } catch (error) {
    next(error);
  }
};
