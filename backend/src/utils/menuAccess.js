const UNITS = ['Bank', 'Pay', 'Comms', 'Creative', 'Merchandising'];
const MENUS = ['properties', 'posm', 'reports'];
const MENU_DEFINITIONS = [
  ['dashboard','Dashboard'], ['alerts','Alerts'], ['subscriptions','Subscriptions'], ['tokens','Token Usage'],
  ['important-work','Important Work'], ['reports','Reports & Data'], ['kbz-bank','KBZ Bank Assets'],
  ['kbz-pay','KBZPay Assets'], ['kbz-comms','Communication Assets'], ['suppliers','Supplier Directory'],
  ['production-orders','Production Orders'], ['production-inventory','Production Item Store'],
  ['properties','Properties List'], ['recruitment','Interview Process'], ['user-management','User Management']
];
function canOpenMenu(user, menu) {
  if (!user) return false;
  return user.role === 'super_admin' || !Array.isArray(user.assignedMenus) || user.assignedMenus.includes(menu);
}
function validateAssignedMenus(value) {
  if (!Array.isArray(value) || value.some(menu => !MENU_DEFINITIONS.some(([id])=>id===menu))) throw Object.assign(new Error('Select valid portal menus.'),{statusCode:400});
  return [...new Set(value)];
}
function permissionMenu(permission) {
  const [group,,library] = String(permission || '').split(':');
  if(group==='asset') return {bank:'kbz-bank',pay:'kbz-pay',comms:'kbz-comms'}[library];
  return {dashboard:'dashboard',reports:'reports',subscription:'subscriptions',token:'tokens',reminder:'alerts',supplier:'suppliers',production_order:'production-orders',property:'properties',user:'user-management',data:'reports'}[group];
}
function teamOf(user) {
  if (/research/i.test(user?.department || '')) return undefined;
  const value = String(user?.department || '').toLowerCase().replace(/[^a-z]/g, '').replace(/team$|department$/g, '');
  return ({bank:'Bank',kbzbank:'Bank',kbzbankmarketing:'Bank',pay:'Pay',kbzpay:'Pay',kbzpaymarketing:'Pay',comms:'Comms',communication:'Comms',creative:'Creative',merchandising:'Merchandising',brandmerch:'Merchandising'}[value]) || ({bank_design:'Bank',pay_design:'Pay',comms_design:'Comms',head_brand:'Creative'}[user?.role]);
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
  if (!canOpenMenu(user, menu==='posm' ? 'production-inventory' : menu)) return [];
  if (user.role === 'super_admin') return UNITS;
  const own = teamOf(user);
  return [...new Set([...(own ? [own] : []), ...managedUnits(user), ...(user.menuAccess || []).filter(g => g.menu === menu).flatMap(g => g.units || []).filter(u => UNITS.includes(u))])];
}
const canonicalUnit = value => teamOf({department:value});
function validateGrants(value) {
  if (!Array.isArray(value)) throw Object.assign(new Error('Menu access must be a list.'), {statusCode:400});
  return MENUS.flatMap(menu => {
    const units = [...new Set(value.filter(g => g.menu === menu).flatMap(g => Array.isArray(g.units) ? g.units : []).filter(u => UNITS.includes(u)))];
    return units.length ? [{menu,units}] : [];
  });
}
module.exports = {UNITS,MENUS,MENU_DEFINITIONS,canOpenMenu,permissionMenu,validateAssignedMenus,teamOf,isHead,managedUnits,viewUnits,canonicalUnit,validateGrants};
