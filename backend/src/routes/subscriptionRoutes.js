const express = require('express');
const {
  getSubscriptions,
  createSubscription,
  updateSubscription,
  archiveSubscription,
  deleteSubscription
} = require('../controllers/subscriptionController');
const { protect } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/adminMiddleware');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getSubscriptions)
  .post(requireAdmin, createSubscription);

router.route('/:id')
  .put(requireAdmin, updateSubscription)
  .delete(requireAdmin, deleteSubscription);

router.patch('/:id/archive', requireAdmin, archiveSubscription);

module.exports = router;
