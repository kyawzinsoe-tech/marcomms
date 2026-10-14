const mongoose = require('mongoose');

const assetSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Asset title is required'],
      trim: true
    },
    library: {
      type: String,
      required: [true, 'Asset library is required'],
      enum: ['kbz_bank', 'kbz_pay', 'kbz_comms'],
      default: 'kbz_bank'
    },
    category: {
      type: String,
      trim: true,
      default: 'General'
    },
    fileUrl: {
      type: String,
      default: '',
      trim: true
    },
    thumbnailUrl: {
      type: String,
      trim: true,
      default: ''
    },
    downloadUrl: {
      type: String,
      trim: true,
      default: ''
    },
    linkedFiles: [{
      label: { type: String, trim: true, maxlength: 160 },
      fileType: { type: String, enum: ['PSD', 'AI', 'PNG', 'MP4', 'GIF', 'JPEG'], required: true },
      url: { type: String, required: true, trim: true, maxlength: 1000 }
    }],
    fileType: {
      type: String,
      trim: true,
      default: 'PNG'
    },
    fileSize: {
      type: Number,
      default: 0
    },
    storageKey: { type: String, default: '', select: false },
    originalName: { type: String, default: '' },
    mimeType: { type: String, enum: ['', 'image/png', 'image/jpeg'], default: '' },
    uploadStatus: { type: String, enum: ['external', 'pending', 'ready', 'rejected'], default: 'external' },
    version: {
      type: String,
      trim: true,
      default: '1.0'
    },
    tags: [
      {
        type: String,
        trim: true
      }
    ],
    description: {
      type: String,
      trim: true,
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

assetSchema.index({ library: 1, category: 1 });
assetSchema.index({ title: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Asset', assetSchema);
