const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    tokenHash: {
      type: String,
      required: true,
      index: true
    },
    userAgent: {
      type: String,
      trim: true,
      default: 'Unknown Device'
    },
    status: {
      type: String,
      enum: ['active', 'revoked', 'expired'],
      default: 'active',
      index: true
    },
    lastSeenAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true
    },
    revokedAt: {
      type: Date
    },
    revokedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

sessionSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('Session', sessionSchema);
