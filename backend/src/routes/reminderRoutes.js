const express = require('express');
const { sendReminder } = require('../controllers/reminderController');
const { protect } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/adminMiddleware');

const router = express.Router();

router.post('/send', protect, requireAdmin, sendReminder);

module.exports = router;
