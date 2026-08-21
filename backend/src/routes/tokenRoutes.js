const express = require('express');
const {
  getTokenEntries,
  createTokenEntry,
  updateTokenEntry,
  archiveTokenEntry,
  deleteTokenEntry
} = require('../controllers/tokenController');
const { protect } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/adminMiddleware');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getTokenEntries)
  .post(requireAdmin, createTokenEntry);

router.route('/:id')
  .put(requireAdmin, updateTokenEntry)
  .delete(requireAdmin, deleteTokenEntry);

router.patch('/:id/archive', requireAdmin, archiveTokenEntry);

module.exports = router;
