const normalize = value => String(value || '').toLowerCase().replace(/[^a-z0-9]/g,'');
export function columnValue(row, names) {
  const key = names.map(n=>Object.keys(row).find(k=>normalize(k)===normalize(n) && String(row[k] ?? '').trim())).find(Boolean);
  return key ? String(row[key] ?? '').trim() : '';
}
export function excelProjectDate(value) {
  const raw = String(value || '').trim();
  let y,m,d;
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) [y,m,d] = raw.slice(0,10).split('-').map(Number);
  else if (/^\d{1,2}[./-]\d{1,2}[./-]\d{4}$/.test(raw)) [d,m,y] = raw.split(/[./-]/).map(Number);
  else return '';
  const date = new Date(Date.UTC(y,m-1,d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m-1 && date.getUTCDate() === d ? `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}` : '';
}
export function projectTimeline(rows, {start,end,mode,personNames}) {
  const daily = mode.endsWith('date');
  const byPerson = mode.startsWith('person');
  const points = new Set();
  const series = new Map();
  let missingDates = 0;
  if (!daily) { let current=start; while(current && current<=end && points.size<120) {points.add(current);const [y,m]=current.split('-').map(Number);current=`${m===12?y+1:y}-${String(m===12?1:m+1).padStart(2,'0')}`;} }
  for(const row of rows) {
    const date = daily ? excelProjectDate(columnValue(row,['Date','Deadline','Due Date'])) : '';
    if(daily && !date) {missingDates++;continue;}
    const point = daily ? date : row.__reportMonth || start;
    // Daily dates are constrained to the selected report period.
    if(point.slice(0,7)<start || point.slice(0,7)>end) continue;
    points.add(point);
    const person = byPerson ? columnValue(row,personNames) || 'Unassigned' : 'All projects';
    if(!series.has(person))series.set(person,new Map());
    series.get(person).set(point,(series.get(person).get(point)||0)+1);
  }
  const labels=[...points].sort();
  return {labels,series:[...series].sort((a,b)=>[...b[1].values()].reduce((n,v)=>n+v,0)-[...a[1].values()].reduce((n,v)=>n+v,0) || a[0].localeCompare(b[0])).map(([name,counts])=>({name,values:labels.map(p=>counts.get(p)||0)})),missingDates};
}
