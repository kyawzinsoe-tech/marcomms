const express = require('express');
const { getExecutiveSummary } = require('../controllers/dashboardController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();
router.get('/summary', protect, getExecutiveSummary);
module.exports = router;
