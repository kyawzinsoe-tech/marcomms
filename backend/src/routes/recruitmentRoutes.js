const router = require('express').Router();
const { protect } = require('../middleware/authMiddleware');
const controller = require('../controllers/recruitmentController');

router.use(protect);
router.get('/audit', controller.audit);
router.get('/', controller.list);
router.post('/', controller.create);
router.get('/:id', controller.getOne);

module.exports = router;
