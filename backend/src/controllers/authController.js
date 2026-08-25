const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Session = require('../models/Session');

function generateToken(id) {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured on the server.');
  }
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
}

function formatUserAgent(uaString) {
  if (!uaString) return 'Web Browser';
  let browser = 'Browser';
  let os = 'Unknown OS';

  if (uaString.includes('Edg/')) browser = 'Edge';
  else if (uaString.includes('Chrome/')) browser = 'Chrome';
  else if (uaString.includes('Safari/') && !uaString.includes('Chrome/')) browser = 'Safari';
  else if (uaString.includes('Firefox/')) browser = 'Firefox';

  if (uaString.includes('Mac OS') || uaString.includes('Macintosh')) os = 'macOS';
  else if (uaString.includes('Windows')) os = 'Windows';
  else if (uaString.includes('iPhone')) os = 'iOS';
  else if (uaString.includes('iPad')) os = 'iPadOS';
  else if (uaString.includes('Android')) os = 'Android';
  else if (uaString.includes('Linux')) os = 'Linux';

  return `${browser} on ${os}`;
}

// POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide both email and password.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = generateToken(user._id);
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const userAgent = formatUserAgent(req.headers['user-agent']);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Safely record active session
    try {
      await Session.create({
        userId: user._id,
        tokenHash,
        userAgent,
        status: 'active',
        lastSeenAt: new Date(),
        expiresAt
      });
    } catch (sessionErr) {
      console.warn('[Session] Could not persist session record:', sessionErr.message);
    }

    res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/logout
exports.logout = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      await Session.updateMany(
        { tokenHash, status: 'active' },
        { status: 'revoked', revokedAt: new Date(), revokedBy: req.user?._id }
      );
    }

    res.status(200).json({ message: 'Session terminated successfully.' });
  } catch (error) {
    next(error);
  }
};

// GET /api/auth/me
exports.getMe = async (req, res, next) => {
  try {
    // Touch lastSeenAt on active session
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      await Session.updateOne(
        { tokenHash, status: 'active' },
        { lastSeenAt: new Date() }
      ).catch(() => {});
    }

    res.status(200).json({
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        avatar: req.user.avatar,
        createdAt: req.user.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};
