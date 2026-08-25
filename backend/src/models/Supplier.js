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
