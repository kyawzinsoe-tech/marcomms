const LEADERSHIP_LEVELS = Object.freeze(['head', 'deputy_head', 'manager']);

function canAccessRecruitment(user) {
  return Boolean(user && (
    user.role === 'super_admin' ||
    user.role === 'admin' ||
    user.role === 'head_brand' ||
    LEADERSHIP_LEVELS.includes(user.jobLevel)
  ));
}

function isCrossDepartmentSuperAdmin(user, department) {
  return Boolean(user?.role === 'super_admin' &&
    String(user.department || '').trim().toLowerCase() !== String(department || '').trim().toLowerCase());
}

module.exports = { LEADERSHIP_LEVELS, canAccessRecruitment, isCrossDepartmentSuperAdmin };
