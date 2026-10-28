const test = require('node:test');
const assert = require('node:assert/strict');
const {managedUnits,viewUnits,teamOf,validateGrants} = require('../utils/menuAccess');
const {restrictReport,parseMatrix,identify} = require('../controllers/monthlyProjectReportController')._test;
test('selected menu access grants read only to the selected module and teams',()=>{
  const user={role:'viewer',department:'Comms',menuAccess:[{menu:'properties',units:['Creative']}]};
  assert.deepEqual(viewUnits(user,'properties'),['Comms','Creative']);
  assert.deepEqual(viewUnits(user,'posm'),['Comms']);
  assert.deepEqual(managedUnits(user),[]);
});
test('both Heads manage Merchandising but cannot manage another team',()=>{
  assert.deepEqual(managedUnits({role:'bank_design',jobLevel:'head'}),['Bank','Merchandising']);
  assert.deepEqual(managedUnits({role:'head_brand'}),['Creative','Merchandising']);
  assert.equal(managedUnits({role:'pay_design',jobLevel:'head'}).includes('Merchandising'),false);
  assert.equal(teamOf({department:'Creative Team'}),'Creative');
});
test('report response excludes unauthorized sheets and workbook URL for viewers',()=>{
  const report={sourceUrl:'https://docs.google.com/example',sheets:[{key:'kbz-bank'},{key:'kbz-pay'}]};
  const visible=restrictReport(report,{role:'viewer',department:'Bank'});
  assert.deepEqual(visible.sheets.map(s=>s.key),['kbz-bank']);
  assert.equal(visible.sourceUrl,'');
});
test('recognizes KBZPay and stops before unrelated workbook sections',()=>{
  assert.equal(identify('KBZPay'),'kbz-pay');
  const result=parseMatrix([['KBZPay Projects for October 2026'],['No','Project','Designer'],[1,'Campaign','A'],['Heads-up'],[2,'Exclude','B']],'kbz-pay');
  assert.equal(result.rows.length,1);
});
test('grant validation strips unsupported menus and scopes',()=>{
  assert.deepEqual(validateGrants([{menu:'properties',units:['Creative','Unknown']},{menu:'users',units:['Bank']}]),[{menu:'properties',units:['Creative']}]);
});
