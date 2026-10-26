const test = require('node:test');
const assert = require('node:assert/strict');
const { _test } = require('../controllers/monthlyProjectReportController');

test('recognizes only approved monthly report sheet names and aliases', () => {
  assert.equal(_test.identify('Copy & Script'), 'copy-script');
  assert.equal(_test.identify('Bank'), 'kbz-bank');
  assert.equal(_test.identify('Pay'), 'kbz-pay');
  assert.equal(_test.identify('Comms'), 'kbz-bank-communication');
  assert.equal(_test.identify('Production'), 'production');
  assert.equal(_test.identify('Heads-up'), undefined);
  assert.equal(_test.identify('Monthly Content Calendar'), undefined);
});

test('parses a titled project sheet into columns and records', () => {
  const parsed = _test.parseMatrix([
    ['KBZ Bank Projects for October 2026'],
    ['No.', 'Project', 'Status', 'Designer'],
    [1, 'Campaign A', 'Completed', 'WY'],
    [2, 'Campaign B', 'In Progress', 'NYL']
  ], 'kbz-bank');

  assert.equal(parsed.title, 'KBZ Bank Projects for October 2026');
  assert.deepEqual(parsed.columns, ['No.', 'Project', 'Status', 'Designer']);
  assert.equal(parsed.rows.length, 2);
  assert.equal(parsed.rows[1].Status, 'In Progress');
});

test('parses a simple header-first sheet such as the supplied share-link example', () => {
  const parsed = _test.parseMatrix([
    ['File Name', 'JPEG', 'PNG', 'PSD', 'Illustrator', 'Remark'],
    ['Logo', 'link-1', 'link-2', '', '', 'Approved']
  ], 'kbz-pay');

  assert.equal(parsed.title, 'KBZ Pay');
  assert.equal(parsed.rows[0]['File Name'], 'Logo');
  assert.equal(parsed.rows[0].Remark, 'Approved');
});
