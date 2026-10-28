const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Session = require('../models/Session');
const {canOpenMenu} = require('../utils/menuAccess');
const API_MENUS = {users:'user-management',subscriptions:'subscriptions',tokens:'tokens',reminders:'alerts',backup:'reports',suppliers:'suppliers','production-orders':'production-orders',sessions:'user-management',dashboard:'dashboard','important-work':'important-work',recruitment:'recruitment','production-inventory':'production-inventory',properties:'properties','monthly-project-reports':'reports'};
const IDLE_TIMEOUT_MINUTES = Math.max(5, Number(process.env.SESSION_IDLE_TIMEOUT_MINUTES || 480));

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

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({
      error: 'JWT_SECRET is not configured on the server.'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const session = await Session.findOne({ tokenHash, status: 'active', expiresAt: { $gt: new Date() } }).select('_id lastSeenAt');
    if (!session) {
      return res.status(401).json({ error: 'This session has been signed out or has expired.' });
    }
    const now = new Date();
    if (session.lastSeenAt && now.getTime() - session.lastSeenAt.getTime() > IDLE_TIMEOUT_MINUTES * 60 * 1000) {
      await Session.updateOne({ _id: session._id }, { $set: { status: 'expired', revokedAt: now } });
      return res.status(401).json({ error: 'You were signed out after a period of inactivity. Please sign in again.' });
    }
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        error: 'The user belonging to this token no longer exists.'
      });
    }

    req.user = user;
    const resource = String(req.originalUrl || '').split('?')[0].split('/')[2];
    const menu=API_MENUS[resource];
    if ((menu && !canOpenMenu(user,menu)) || (resource==='assets' && !['kbz-bank','kbz-pay','kbz-comms'].some(id=>canOpenMenu(user,id)))) return res.status(403).json({error:'This menu has not been assigned by Super Admin.'});
    if (!session.lastSeenAt || now.getTime() - session.lastSeenAt.getTime() > 60 * 1000) {
      Session.updateOne({ _id: session._id }, { $set: { lastSeenAt: now } }).catch(() => {});
    }
    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Invalid or expired session token.'
    });
  }
}

module.exports = { protect };
