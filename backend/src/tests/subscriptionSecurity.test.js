const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { _securityTestHelpers } = require('../controllers/subscriptionController');

test('subscription credentials are encrypted and never stored as plaintext', () => {
  const original = process.env.SUBSCRIPTION_CREDENTIAL_KEY;
  process.env.SUBSCRIPTION_CREDENTIAL_KEY = crypto.randomBytes(32).toString('base64');
  try {
    const encrypted = _securityTestHelpers.encryptCredential('StrongPassword123!');
    assert.equal(encrypted.includes('StrongPassword123!'), false);
    assert.equal(encrypted.split('.').length, 3);
    assert.throws(() => _securityTestHelpers.encryptCredential('short'), /between 8 and 200/);
  } finally {
    if (original === undefined) delete process.env.SUBSCRIPTION_CREDENTIAL_KEY;
    else process.env.SUBSCRIPTION_CREDENTIAL_KEY = original;
  }
});

test('invoice signature checks reject disguised executable files', () => {
  const { validSignature } = _securityTestHelpers;
  assert.equal(validSignature(Buffer.from('%PDF-1.7'), 'application/pdf'), true);
  assert.equal(validSignature(Buffer.from([0xff, 0xd8, 0xff, 0xe0]), 'image/jpeg'), true);
  assert.equal(validSignature(Buffer.from('MZ executable'), 'image/png'), false);
});
