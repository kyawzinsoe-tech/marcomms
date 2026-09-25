const express = require('express');
const {
  getAssets,
  getAssetById,
  createAsset,
  initializeAssetUpload,
  completeAssetUpload,
  getAssetDownloadUrl,
  updateAsset,
  deleteAsset
} = require('../controllers/assetController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getAssets)
  .post(createAsset);

router.post('/uploads', initializeAssetUpload);
router.post('/:id/complete', completeAssetUpload);
router.get('/:id/download-url', getAssetDownloadUrl);

router.route('/:id')
  .get(getAssetById)
  .put(updateAsset)
  .patch(updateAsset)
  .delete(deleteAsset);

module.exports = router;
