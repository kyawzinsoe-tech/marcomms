const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema(
  {
    product: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true
    },
    tool: {
      type: String,
      required: [true, 'Tool or service description is required'],
      trim: true
    },
    plan: {
      type: String,
      default: 'Monthly'
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active'
    },
    start: {
      type: String,
      default: ''
    },
    expiry: {
      type: String,
      default: ''
    },
    cost: {
      type: String,
      default: ''
    },
    email: {
      type: String,
      trim: true,
      default: ''
    },
    reminderEmail: {
      type: String,
      trim: true,
      default: ''
    },
    alertDays: {
      type: Number,
      default: 7
    },
    initialTokens: {
      type: String,
      default: ''
    },
    purchaseNote: {
      type: String,
      default: ''
    },
    credentialCiphertext: { type: String, select: false, default: '' },
    invoice: {
      storageKey: { type: String, select: false, default: '' },
      originalName: { type: String, default: '' },
      mimeType: { type: String, enum: ['', 'application/pdf', 'image/png', 'image/jpeg'], default: '' },
      fileSize: { type: Number, default: 0 },
      uploadStatus: { type: String, enum: ['none', 'pending', 'ready'], default: 'none' },
      uploadedAt: Date,
      uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    },
    archived: {
      type: Boolean,
      default: false
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Subscription', subscriptionSchema);
