const express = require('express');
const {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  setProductionApprover
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/adminMiddleware');

const router = express.Router();

// All user management routes require valid login + Admin role
router.use(protect, requireAdmin);

router.route('/')
  .get(getUsers)
  .post(createUser);

router.route('/:id')
  .put(updateUser)
  .delete(deleteUser);

router.patch('/:id/production-approver', setProductionApprover);

module.exports = router;
