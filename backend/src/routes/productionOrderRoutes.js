const express = require('express');
const {
  getProductionOrders,
  getProductionOrderById,
  createProductionOrder,
  updateProductionOrder,
  deleteProductionOrder,
  advanceWorkflow,
  getApprovalAudit
} = require('../controllers/productionOrderController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getProductionOrders)
  .post(createProductionOrder);

router.get('/approval-audit', getApprovalAudit);
router.post('/:id/workflow/advance', advanceWorkflow);

router.route('/:id')
  .get(getProductionOrderById)
  .put(updateProductionOrder)
  .patch(updateProductionOrder)
  .delete(deleteProductionOrder);

module.exports = router;
