const test = require('node:test');
const assert = require('node:assert/strict');
const { _propertyValidation } = require('../controllers/propertyController');

const validProperty = {
  propertyNo: ' prop-001 ',
  date: '2026-10-26',
  businessUnit: 'Creative',
  category: 'Computer',
  itemType: 'Desktop Set',
  productName: 'Design workstation',
  quantity: 2,
  condition: 'Good',
  owner: 'Creative Design Team',
  includedAccessories: ['Desktop', 'Keyboard', 'Mouse'],
  note: 'Second floor studio'
};

test('normalizes a valid property payload and keeps bundled desktop accessories', () => {
  const result = _propertyValidation.payload(validProperty);
  assert.equal(result.propertyNo, 'PROP-001');
  assert.equal(result.businessUnit, 'Creative');
  assert.equal(result.quantity, 2);
  assert.deepEqual(result.includedAccessories, ['Desktop', 'Keyboard', 'Mouse']);
});

test('supports a custom property type', () => {
  const result = _propertyValidation.payload({ ...validProperty, category: 'Other', itemType: 'Other', customType: 'Teleprompter' });
  assert.equal(result.customType, 'Teleprompter');
});

test('rejects invalid quantity', () => {
  assert.throws(() => _propertyValidation.payload({ ...validProperty, quantity: 0 }), /Quantity must be/);
});

test('rejects an unknown business unit', () => {
  assert.throws(() => _propertyValidation.payload({ ...validProperty, businessUnit: 'Unknown' }), /valid Business Unit/);
});
