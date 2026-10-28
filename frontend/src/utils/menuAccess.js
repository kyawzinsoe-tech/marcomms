const UNITS = ['Bank', 'Pay', 'Comms', 'Research', 'Creative', 'Merchandising'];
const MENUS = ['properties', 'posm', 'reports'];
function teamOf(user) {
  const value = String(user?.department || '').toLowerCase().replace(/[^a-z]/g, '').replace(/team$|department$/g, '');
  return ({bank:'Bank',kbzbank:'Bank',pay:'Pay',kbzpay:'Pay',comms:'Comms',communication:'Comms',creative:'Creative',research:'Research',merchandising:'Merchandising',brandmerch:'Merchandising'}[value]) || ({bank_design:'Bank',pay_design:'Pay',comms_design:'Comms',head_brand:'Creative'}[user?.role]);
}
const isHead = user => user?.jobLevel === 'head' || user?.role === 'head_brand';
function managedUnits(user) {
  if (user?.role === 'super_admin') return UNITS;
  const team = teamOf(user);
  if (!team || (!isHead(user) && !['admin','procurement_officer'].includes(user?.role))) return [];
  return [team, ...(['Creative','Bank'].includes(team) && isHead(user) ? ['Merchandising'] : [])];
}
function viewUnits(user, menu) {
  if (!user) return [];
  if (user.role === 'super_admin') return UNITS;
  const own = teamOf(user);
  return [...new Set([...(own ? [own] : []), ...managedUnits(user), ...(user.menuAccess || []).filter(g => g.menu === menu).flatMap(g => g.units || []).filter(u => UNITS.includes(u))])];
}
const canonicalUnit = value => teamOf({department:value});
function validateGrants(value) {
  if (!Array.isArray(value)) throw Object.assign(new Error('Menu access must be a list.'), {status:400});
  return MENUS.flatMap(menu => {
    const units = [...new Set(value.filter(g => g.menu === menu).flatMap(g => Array.isArray(g.units) ? g.units : []).filter(u => UNITS.includes(u)))];
    return units.length ? [{menu,units}] : [];
  });
}
export {UNITS,MENUS,teamOf,isHead,managedUnits,viewUnits,canonicalUnit,validateGrants};
