const router = require('express').Router();
const { protect } = require('../middleware/authMiddleware');
const controller = require('../controllers/recruitmentController');

router.use(protect);
router.get('/audit', controller.audit);
router.get('/business-units', controller.listBusinessUnits);
router.post('/business-units', controller.createBusinessUnit);
router.patch('/business-units/:id', controller.updateBusinessUnit);
router.delete('/business-units/:id', controller.deleteBusinessUnit);
router.get('/', controller.list);
router.post('/', controller.create);
router.get('/:id', controller.getOne);
router.patch('/:id', controller.update);
router.delete('/:id', controller.remove);

module.exports = router;
