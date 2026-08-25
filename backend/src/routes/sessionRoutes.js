const express = require('express');
const {
  getSessions,
  revokeSession,
  revokeAllUserSessions
} = require('../controllers/sessionController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/', getSessions);
router.delete('/:id', revokeSession);
router.delete('/user/:userId', revokeAllUserSessions);

module.exports = router;
