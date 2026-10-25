const express = require('express');
const {
  getAssets,
  getAssetById,
  createAsset,
  initializeAssetUpload,
  uploadAssetContent,
  getAssetContent,
  completeAssetUpload,
  abortAssetUpload,
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
router.put('/:id/content', express.raw({ type: ['image/png', 'image/jpeg'], limit: '10mb' }), uploadAssetContent);
router.get('/:id/content', getAssetContent);
router.post('/:id/complete', completeAssetUpload);
router.delete('/:id/upload', abortAssetUpload);
router.get('/:id/download-url', getAssetDownloadUrl);

router.route('/:id')
  .get(getAssetById)
  .put(updateAsset)
  .patch(updateAsset)
  .delete(deleteAsset);

module.exports = router;
