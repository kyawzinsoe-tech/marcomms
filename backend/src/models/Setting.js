const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: 'dashboard_config'
    },
    reportMonth: {
      type: String,
      default: () => new Date().toISOString().slice(0, 7)
    },
    lastBackupAt: {
      type: Date
    },
    lastBackupS3Key: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Setting', settingSchema);
