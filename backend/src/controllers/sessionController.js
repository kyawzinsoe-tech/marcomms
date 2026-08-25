const crypto = require('crypto');
const mongoose = require('mongoose');
const Session = require('../models/Session');
const User = require('../models/User');

// GET /api/sessions
exports.getSessions = async (req, res, next) => {
  try {
    const isSuperAdmin = req.user && req.user.role === 'super_admin';

    // Mark expired sessions
    await Session.updateMany(
      { status: 'active', expiresAt: { $lt: new Date() } },
      { status: 'expired' }
    );

    // Current token hash
    let currentTokenHash = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      currentTokenHash = crypto.createHash('sha256').update(token).digest('hex');
    }

    const filter = { status: 'active' };
    if (!isSuperAdmin) {
      filter.userId = req.user._id;
    }

    const sessions = await Session.find(filter)
      .populate('userId', 'name email role avatar')
      .sort({ lastSeenAt: -1 })
      .limit(100);

    const formatted = sessions
      .filter((s) => s.userId) // Ensure valid user
      .map((s) => {
        const userObj = s.userId;
        const isCurrent = currentTokenHash && s.tokenHash === currentTokenHash;

        return {
          id: String(s._id),
          user: {
            id: String(userObj._id),
            name: userObj.name,
            email: userObj.email,
            role: userObj.role,
            avatar: userObj.avatar
          },
          device: s.userAgent || 'Web Browser',
          status: s.status,
          loginAt: s.createdAt,
          lastSeenAt: s.lastSeenAt,
          expiresAt: s.expiresAt,
          isCurrent: Boolean(isCurrent)
        };
      });

    res.status(200).json({
      count: formatted.length,
      sessions: formatted
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/sessions/:id
exports.revokeSession = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid session ID format.' });
    }

    const session = await Session.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session record not found.' });
    }

    const isSuperAdmin = req.user && req.user.role === 'super_admin';
    const isOwner = session.userId.toString() === req.user._id.toString();

    if (!isSuperAdmin && !isOwner) {
      return res.status(403).json({ error: 'Access denied. You can only revoke your own active sessions.' });
    }

    session.status = 'revoked';
    session.revokedAt = new Date();
    session.revokedBy = req.user._id;
    await session.save();

    res.status(200).json({
      message: 'Session revoked successfully.',
      id: req.params.id
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/sessions/user/:userId
exports.revokeAllUserSessions = async (req, res, next) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Access denied. Only Super Administrators can terminate other users sessions.' });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
      return res.status(400).json({ error: 'Invalid user ID format.' });
    }

    const result = await Session.updateMany(
      { userId: req.params.userId, status: 'active' },
      { status: 'revoked', revokedAt: new Date(), revokedBy: req.user._id }
    );

    res.status(200).json({
      message: `Terminated ${result.modifiedCount} active session(s) for user.`,
      userId: req.params.userId,
      revokedCount: result.modifiedCount
    });
  } catch (error) {
    next(error);
  }
};
