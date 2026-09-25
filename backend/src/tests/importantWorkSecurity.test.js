const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { _importantWorkValidation } = require('../controllers/importantWorkController');

describe('Important Work Link Security', () => {
  it('accepts approved document providers and rejects unsafe links', () => {
    const links = _importantWorkValidation.sanitizeLinks([
      { type: 'Excel', url: 'https://tenant.sharepoint.com/file.xlsx', label: 'Budget' },
      { type: 'Google Slides', url: 'https://docs.google.com/presentation/d/abc', label: 'Deck' },
      { type: 'PDF', url: 'javascript:alert(1)', label: 'Unsafe' },
      { type: 'Google Slides', url: 'https://drive.google.com/file/d/abc', label: 'Wrong host' }
    ]);
    assert.equal(links.length, 2);
    assert.equal(links[0].type, 'Excel');
    assert.equal(links[1].type, 'Google Slides');
  });
});
