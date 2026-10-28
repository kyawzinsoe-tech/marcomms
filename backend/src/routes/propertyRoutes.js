const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { list, create, update, remove } = require('../controllers/propertyController');

const router = express.Router();
router.use(protect);
router.route('/').get(list).post(create);
router.route('/:id').put(update).delete(remove);

module.exports = router;
