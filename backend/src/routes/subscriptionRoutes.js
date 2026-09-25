const express = require('express');
const {
  getSubscriptions,
  createSubscription,
  updateSubscription,
  archiveSubscription,
  deleteSubscription,
  beginInvoiceUpload,
  completeInvoiceUpload,
  downloadInvoice
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
router.post('/:id/invoice/upload', requireAdmin, beginInvoiceUpload);
router.post('/:id/invoice/complete', requireAdmin, completeInvoiceUpload);
router.get('/:id/invoice/download', requireAdmin, downloadInvoice);

module.exports = router;
