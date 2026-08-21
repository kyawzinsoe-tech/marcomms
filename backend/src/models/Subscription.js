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
