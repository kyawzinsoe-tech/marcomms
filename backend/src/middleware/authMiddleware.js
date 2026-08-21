const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function protect(req, res, next) {
  let token = null;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      error: 'Not authorized. Please provide a valid authentication token.'
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'fallback_secret_key'
    );
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        error: 'The user belonging to this token no longer exists.'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Invalid or expired session token.'
    });
  }
}

module.exports = { protect };
