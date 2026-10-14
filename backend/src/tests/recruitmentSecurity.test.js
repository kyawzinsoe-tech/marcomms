const test = require('node:test');
const assert = require('node:assert/strict');
const { LEADERSHIP_LEVELS, canAccessRecruitment, isCrossDepartmentSuperAdmin } = require('../utils/recruitmentAccess');

test('recruitment visibility is limited to administrators and management levels', () => {
  assert.equal(canAccessRecruitment({ role: 'super_admin' }), true);
  assert.equal(canAccessRecruitment({ role: 'admin' }), true);
  assert.equal(canAccessRecruitment({ role: 'viewer', jobLevel: 'head' }), true);
  assert.equal(canAccessRecruitment({ role: 'viewer', jobLevel: 'deputy_head' }), true);
  assert.equal(canAccessRecruitment({ role: 'viewer', jobLevel: 'manager' }), true);
  assert.equal(canAccessRecruitment({ role: 'viewer', jobLevel: 'staff' }), false);
  assert.deepEqual(LEADERSHIP_LEVELS, ['head', 'deputy_head', 'manager']);
});

test('only cross-department Super Admin views trigger management notification', () => {
  assert.equal(isCrossDepartmentSuperAdmin({ role: 'super_admin', department: 'Creative' }, 'HR'), true);
  assert.equal(isCrossDepartmentSuperAdmin({ role: 'super_admin', department: 'Creative' }, 'creative'), false);
  assert.equal(isCrossDepartmentSuperAdmin({ role: 'admin', department: 'Creative' }, 'HR'), false);
});
