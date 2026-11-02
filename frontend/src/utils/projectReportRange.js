export function projectRange(mode, month, endMonth) {
  const year = String(month).slice(0, 4);
  const n = Number(String(month).slice(5, 7));
  if (mode === 'year') return { start: `${year}-01`, end: `${year}-12` };
  const size = mode === 'quarter' ? 3 : mode === 'four' ? 4 : 0;
  if (size) { const start = Math.floor((n - 1) / size) * size + 1; return { start: `${year}-${String(start).padStart(2,'0')}`, end: `${year}-${String(start + size - 1).padStart(2,'0')}` }; }
  return { start: month, end: mode === 'custom' && endMonth >= month ? endMonth : month };
}
export function combineProjectReports(reports, start, end) {
  const sheets = new Map();
  for (const report of [...reports].filter(r => r.month >= start && r.month <= end).sort((a,b)=>a.month.localeCompare(b.month))) {
    for (const sheet of report.sheets || []) {
      if (!sheets.has(sheet.key)) sheets.set(sheet.key, { ...sheet, title: sheet.name, columns: [], rows: [], canManage: false, isCombined: true, months: [] });
      const target = sheets.get(sheet.key);
      target.columns = [...new Set([...target.columns, ...(sheet.columns || [])])];
      target.months.push(report.month);
      target.rows.push(...(sheet.rows || []).map(row => ({ ...row, __reportMonth: report.month })));
    }
  }
  return [...sheets.values()];
}
