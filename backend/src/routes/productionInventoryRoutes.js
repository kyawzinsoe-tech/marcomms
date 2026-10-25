const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { getItems, createItem, uploadImage, addMovement } = require('../controllers/productionInventoryController');
const router = express.Router();
router.use(protect);
router.route('/').get(getItems).post(createItem);
router.put('/:id/image', express.raw({ type: ['image/png', 'image/jpeg'], limit: '8mb' }), uploadImage);
router.post('/:id/movements', addMovement);
module.exports = router;
