const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { _assetValidation } = require('../controllers/assetController');

describe('Brand Asset Upload Security', () => {
  it('accepts genuine PNG and JPEG signatures', () => {
    assert.equal(_assetValidation.hasValidSignature(Buffer.from([137,80,78,71,13,10,26,10]), 'image/png'), true);
    assert.equal(_assetValidation.hasValidSignature(Buffer.from([0xff,0xd8,0xff,0xe0]), 'image/jpeg'), true);
  });

  it('rejects executable content renamed as an image', () => {
    const executable = Buffer.from('#!/bin/sh\necho unsafe');
    assert.equal(_assetValidation.hasValidSignature(executable, 'image/png'), false);
    assert.equal(_assetValidation.hasValidSignature(executable, 'image/jpeg'), false);
  });

  it('removes traversal and unsafe filename characters', () => {
    const name = _assetValidation.safeOriginalName('../../bad name<script>.png', 'image/png');
    assert.equal(name.includes('..'), false);
    assert.match(name, /^[a-zA-Z0-9._-]+\.png$/);
  });

  it('enforces a 10 MB maximum', () => {
    assert.equal(_assetValidation.MAX_ASSET_BYTES, 10 * 1024 * 1024);
  });

  it('accepts only Google Drive or Google Docs download links', () => {
    assert.equal(_assetValidation.safeGoogleDriveUrl('https://drive.google.com/file/d/abc/view'), 'https://drive.google.com/file/d/abc/view');
    assert.equal(_assetValidation.safeGoogleDriveUrl('https://docs.google.com/document/d/abc'), 'https://docs.google.com/document/d/abc');
    assert.equal(_assetValidation.safeGoogleDriveUrl('https://evil.example/download'), null);
    assert.equal(_assetValidation.safeGoogleDriveUrl(''), '');
  });
});
