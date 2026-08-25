const express = require('express');
const {
  getProductionOrders,
  getProductionOrderById,
  createProductionOrder,
  updateProductionOrder,
  deleteProductionOrder
} = require('../controllers/productionOrderController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getProductionOrders)
  .post(createProductionOrder);

router.route('/:id')
  .get(getProductionOrderById)
  .put(updateProductionOrder)
  .patch(updateProductionOrder)
  .delete(deleteProductionOrder);

module.exports = router;
