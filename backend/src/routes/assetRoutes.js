const express = require('express');
const {
  getAssets,
  getAssetById,
  createAsset,
  updateAsset,
  deleteAsset
} = require('../controllers/assetController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getAssets)
  .post(createAsset);

router.route('/:id')
  .get(getAssetById)
  .put(updateAsset)
  .patch(updateAsset)
  .delete(deleteAsset);

module.exports = router;
