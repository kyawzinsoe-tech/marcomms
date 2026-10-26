const mongoose = require('mongoose');

const movementSchema = new mongoose.Schema({
  direction: { type: String, enum: ['IN', 'OUT', 'ADJUSTMENT'], required: true },
  quantity: { type: Number, required: true, min: 1 },
  date: { type: String, required: true },
  businessUnit: { type: String, trim: true, maxlength: 120, default: '' },
  fromDepartment: { type: String, trim: true, maxlength: 160, default: '' },
  toDepartment: { type: String, trim: true, maxlength: 160, default: '' },
  functionName: { type: String, trim: true, maxlength: 160, default: '' },
  eventName: { type: String, trim: true, maxlength: 200, default: '' },
  reference: { type: String, trim: true, maxlength: 120, default: '' },
  note: { type: String, trim: true, maxlength: 1000, default: '' },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  actorName: { type: String, trim: true, maxlength: 160, default: '' },
  at: { type: Date, default: Date.now }
}, { _id: true });

const productionItemSchema = new mongoose.Schema({
  sku: { type: String, required: true, unique: true, trim: true, maxlength: 60 },
  name: { type: String, required: true, trim: true, maxlength: 180 },
  category: { type: String, trim: true, maxlength: 120, default: 'General' },
  itemType: { type: String, trim: true, maxlength: 120, default: '' },
  unit: { type: String, trim: true, maxlength: 40, default: 'pcs' },
  businessUnit: { type: String, trim: true, maxlength: 120, default: '' },
  stockDepartment: { type: String, trim: true, maxlength: 160, default: '' },
  quantityOnHand: { type: Number, min: 0, default: 0 },
  reorderLevel: { type: Number, min: 0, default: 0 },
  imageStorageKey: { type: String, select: false, default: '' },
  imageData: { type: Buffer, select: false },
  imageMimeType: { type: String, enum: ['', 'image/png', 'image/jpeg'], default: '' },
  imageOriginalName: { type: String, trim: true, maxlength: 140, default: '' },
  movements: { type: [movementSchema], default: [] },
  archived: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

productionItemSchema.index({ name: 'text', sku: 'text', category: 'text', itemType: 'text' });
module.exports = mongoose.model('ProductionItem', productionItemSchema);
