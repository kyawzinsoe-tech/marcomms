const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const Property = require('../models/PropertyItem');
const nextNumber = require('../utils/propertyNumber');
const Counter = mongoose.models.PropertyNumberCounter;
test('automatic numbers are unique across concurrent additions and never reused after deletion', async () => {
  const old = {find:Property.find, update:Counter.updateOne, increment:Counter.findOneAndUpdate};
  let highWater = 0;
  let records = [{propertyNo:'1'},{propertyNo:'3'}];
  Property.find = () => ({lean:async()=>records});
  Counter.updateOne = async (filter, update) => {highWater=Math.max(highWater,update.$max.value);};
  Counter.findOneAndUpdate = async (filter, update) => ({value:highWater+=update.$inc.value});
  try {
    assert.deepEqual(await Promise.all([nextNumber(), nextNumber()]), ['4','5']);
    records=[];
    assert.equal(await nextNumber(),'6');
  } finally {Property.find=old.find;Counter.updateOne=old.update;Counter.findOneAndUpdate=old.increment;}
});
