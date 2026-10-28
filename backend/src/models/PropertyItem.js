const mongoose = require('mongoose');

const propertyItemSchema = new mongoose.Schema({
  propertyNo: { type: String, required: true, unique: true, trim: true, maxlength: 60 },
  date: { type: Date, required: true },
  businessUnit: { type: String, required: true, enum: ['Bank', 'Pay', 'Comms', 'Research', 'Creative', 'Merchandising'] },
  category: { type: String, required: true, trim: true, maxlength: 80 },
  itemType: { type: String, required: true, trim: true, maxlength: 120 },
  customType: { type: String, trim: true, maxlength: 120, default: '' },
  productName: { type: String, required: true, trim: true, maxlength: 180 },
  quantity: { type: Number, required: true, min: 1 },
  condition: { type: String, required: true, enum: ['New', 'Good', 'Fair', 'Needs Repair', 'Damaged', 'Disposed'] },
  owner: { type: String, required: true, trim: true, maxlength: 160 },
  includedAccessories: { type: [String], default: [] },
  details: { type: Map, of: String, default: {} },
  note: { type: String, trim: true, maxlength: 1500, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

propertyItemSchema.index({ propertyNo: 'text', productName: 'text', owner: 'text', itemType: 'text' });

module.exports = mongoose.model('PropertyItem', propertyItemSchema);
