const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Supplier name is required'],
      trim: true
    },
    code: {
      type: String,
      trim: true,
      default: ''
    },
    categories: [
      {
        type: String,
        trim: true
      }
    ],
    contactPerson: {
      type: String,
      trim: true,
      default: ''
    },
    driveUrl: { type: String, trim: true, default: '', maxlength: 2000, validate: { validator: v => { if (!v) return true; try { const u=new URL(v); return u.protocol==='https:' && u.hostname==='drive.google.com' && !u.username && !u.password && (/^\/drive\/(u\/\d+\/)?folders\/[^/]+/.test(u.pathname) || /^\/file\/d\/[^/]+/.test(u.pathname)); } catch { return false; } }, message: 'Enter a full Google Drive file or folder share link.' } },
    phone: {
      type: String,
      trim: true,
      default: ''
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: ''
    },
    address: {
      type: String,
      trim: true,
      default: ''
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: 5
    },
    status: {
      type: String,
      enum: ['Active', 'Under Review', 'Inactive'],
      default: 'Active'
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

supplierSchema.index({ name: 1, status: 1 });
supplierSchema.index({ name: 'text', contactPerson: 'text', notes: 'text' });

module.exports = mongoose.model('Supplier', supplierSchema);
