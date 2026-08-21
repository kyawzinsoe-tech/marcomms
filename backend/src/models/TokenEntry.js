const mongoose = require('mongoose');

const tokenEntrySchema = new mongoose.Schema(
  {
    date: {
      type: String,
      required: [true, 'Usage date is required']
    },
    account: {
      type: String,
      required: [true, 'Account email or identifier is required'],
      trim: true
    },
    project: {
      type: String,
      required: [true, 'Project description is required'],
      trim: true
    },
    tokens: {
      type: Number,
      required: [true, 'Token amount is required'],
      min: 0
    },
    cost: {
      type: String,
      default: ''
    },
    notes: {
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

module.exports = mongoose.model('TokenEntry', tokenEntrySchema);
