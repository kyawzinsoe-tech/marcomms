import {test,expect} from 'vitest';
import {projectTimeline,excelProjectDate} from './projectChartData';
test('monthly contributor lines stay chronological with zero-filled months',()=>{
 const result=projectTimeline([{Designer:'WY',__reportMonth:'2026-10'},{Designer:'NYL',__reportMonth:'2026-09'},{Designer:'WY',__reportMonth:'2026-09'}],{start:'2026-09',end:'2026-11',mode:'person-month',personNames:['Designer']});
 expect(result.labels).toEqual(['2026-09','2026-10','2026-11']);
 expect(result.series.find(s=>s.name==='WY').values).toEqual([1,1,0]);
 expect(result.series.find(s=>s.name==='NYL').values).toEqual([1,0,0]);
});
test('daily chart uses actual excel dates and reports missing dates without inventing them',()=>{
 expect(excelProjectDate('31.02.2026')).toBe('');
 expect(excelProjectDate('2.10.2026')).toBe('2026-10-02');
 const result=projectTimeline([{Deadline:'2.10.2026',Designer:'WY'},{Date:'2026-10-02',Designer:'WY'},{Designer:'NYL'},{Date:'2025-10-02',Designer:'WY'}],{start:'2026-10',end:'2026-10',mode:'person-date',personNames:['Designer']});
 expect(result.labels).toEqual(['2026-10-02']);
 expect(result.series[0].values).toEqual([2]);
 expect(result.missingDates).toBe(1);
});
