const express = require('express');
const {
  exportBackup,
  importBackup,
  resetDemoData
} = require('../controllers/backupController');
const { protect } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/adminMiddleware');

const router = express.Router();

router.use(protect);

router.get('/export', exportBackup);
router.post('/import', requireAdmin, importBackup);
router.post('/reset', requireAdmin, resetDemoData);

module.exports = router;
