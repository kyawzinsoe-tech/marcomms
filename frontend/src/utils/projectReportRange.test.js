import {test,expect} from 'vitest';
import {projectRange,combineProjectReports} from './projectReportRange';
test('calendar quarters, four-month blocks and annual ranges',()=>{
 expect(projectRange('quarter','2026-05')).toEqual({start:'2026-04',end:'2026-06'});
 expect(projectRange('four','2026-11')).toEqual({start:'2026-09',end:'2026-12'});
 expect(projectRange('year','2026-11')).toEqual({start:'2026-01',end:'2026-12'});
 expect(projectRange('custom','2026-11','2027-02')).toEqual({start:'2026-11',end:'2027-02'});
 expect(projectRange('custom','2026-11','2026-02').end).toBe('2026-11');
});
test('combines permitted sheets in chronological order without changing source rows',()=>{
 const reports=[{month:'2026-02',sheets:[{key:'kbz-bank',name:'Bank',columns:['Project','Designer'],rows:[{Project:'B',Designer:'WY'}],canManage:true}]},{month:'2026-01',sheets:[{key:'kbz-bank',name:'Bank',columns:['Project','Designer'],rows:[{Project:'A',Designer:'WY'}]}]},{month:'2025-12',sheets:[{key:'kbz-bank',rows:[{Project:'Exclude'}]}]}];
 const [sheet]=combineProjectReports(reports,'2026-01','2026-12');
 expect(sheet.rows.map(r=>r.Project)).toEqual(['A','B']);
 expect(sheet.rows.map(r=>r.__reportMonth)).toEqual(['2026-01','2026-02']);
 expect(sheet.canManage).toBe(false);
 expect(reports[0].sheets[0].rows[0].__reportMonth).toBeUndefined();
 expect(combineProjectReports(reports,'2027-01','2027-12')).toEqual([]);
});
