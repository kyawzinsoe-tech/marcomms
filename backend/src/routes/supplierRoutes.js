const express = require('express');
const {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier
} = require('../controllers/supplierController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getSuppliers)
  .post(createSupplier);

router.route('/:id')
  .get(getSupplierById)
  .put(updateSupplier)
  .patch(updateSupplier)
  .delete(deleteSupplier);

module.exports = router;
