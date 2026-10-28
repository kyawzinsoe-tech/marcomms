const test = require('node:test');
const assert = require('node:assert/strict');
const { allowedUnit } = require('../controllers/propertyController')._propertyValidation;
test('team members cannot access another team properties', () => {
  assert.equal(allowedUnit({role:'bank_design'}, 'Bank'), false);
  assert.equal(allowedUnit({role:'bank_design',jobLevel:'head'}, 'Bank'), true);
  assert.equal(allowedUnit({role:'bank_design',jobLevel:'head'}, 'Merchandising'), true);
  assert.equal(allowedUnit({role:'head_brand'}, 'Merchandising'), true);
  assert.equal(allowedUnit({role:'bank_design'}, 'Pay'), false);
  assert.equal(allowedUnit({role:'admin',department:'Creative'}, 'Bank'), false);
  assert.equal(allowedUnit({role:'admin',department:'Creative'}, 'Creative'), true);
  assert.equal(allowedUnit({role:'viewer'}, 'Creative'), false);
  assert.equal(allowedUnit({role:'super_admin'}, 'Creative'), true);
});
