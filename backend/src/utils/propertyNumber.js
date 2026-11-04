const mongoose = require('mongoose');
const PropertyItem = require('../models/PropertyItem');
const counterSchema = new mongoose.Schema({ _id: String, value: Number });
const Counter = mongoose.models.PropertyNumberCounter || mongoose.model('PropertyNumberCounter', counterSchema);

// Persist the high-water mark independently of records so deleted numbers are never reused.
module.exports = async function nextPropertyNumber() {
  const existing = await PropertyItem.find({}, { propertyNo: 1 }).lean();
  const maximum = existing.reduce((max, item) => /^\d+$/.test(item.propertyNo) ? Math.max(max, Number(item.propertyNo)) : max, 0);
  try {
    await Counter.updateOne({ _id: 'properties' }, { $max: { value: maximum } }, { upsert: true });
  } catch (error) {
    if (error.code !== 11000) throw error;
    await Counter.updateOne({ _id: 'properties' }, { $max: { value: maximum } });
  }
  const counter = await Counter.findOneAndUpdate({ _id: 'properties' }, { $inc: { value: 1 } }, { new: true });
  return String(counter.value);
};
