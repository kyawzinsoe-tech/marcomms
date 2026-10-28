const readXlsxFile = require('read-excel-file/node');
const { readSheetNames } = require('read-excel-file/node');
const MonthlyProjectReport = require('../models/MonthlyProjectReport');
const { logAuditEvent } = require('../utils/auditLogger');

const {viewUnits, managedUnits} = require('../utils/menuAccess');
const sheetUnit = key => ({'kbz-bank':'Bank','kbz-pay':'Pay','kbzpay-market':'Pay','kbz-bank-communication':'Comms','copy-script':'Creative',production:'Creative'}[key]);
const permitsSheet = (units,key) => units.includes('Creative') || units.includes(sheetUnit(key));
const restrictReport = (report,user) => ({...report,sourceUrl:managedUnits(user).length ? report.sourceUrl : '',sheets:report.sheets.filter(s=>permitsSheet(viewUnits(user,'reports'),s.key)).map(s=>({...s,canManage:permitsSheet(managedUnits(user),s.key)}))});
const MAX_WORKBOOK_BYTES = 20 * 1024 * 1024;
const allowed = [
  ['copy-script', ['copy & script', 'copy and script', 'copy script']],
  ['kbz-bank', ['kbz bank', 'bank']],
  ['kbz-pay', ['kbz pay', 'kbzpay', 'pay']],
  ['kbzpay-market', ['kbzpay market', 'kbz pay market', 'pay market']],
  ['kbz-bank-communication', ['kbz bank communication', 'bank communication', 'comms', 'communication']],
  ['production', ['production']]
];
const normalize = (value) => String(value || '').trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
const identify = (name) => allowed.find(([, aliases]) => aliases.includes(normalize(name)))?.[0];
const displayName = (key) => ({
  'copy-script': 'Copy & Script', 'kbz-bank': 'KBZ Bank', 'kbz-pay': 'KBZ Pay',
  'kbzpay-market': 'KBZPay Market', 'kbz-bank-communication': 'KBZ Bank Communication', production: 'Production'
}[key]);

const cellText = (value) => value instanceof Date ? value.toISOString().slice(0, 10) : String(value ?? '').trim();

function parseMatrix(matrix, key) {
  const clean = matrix.map((row) => row.map(cellText));
  const firstIndex = clean.findIndex((row) => row.some(Boolean));
  if (firstIndex < 0) return null;
  const firstCells = clean[firstIndex].filter(Boolean);
  const hasTitle = firstCells.length === 1 || /projects?\s+for|production\s+for/i.test(firstCells.join(' '));
  const headerIndex = hasTitle ? clean.findIndex((row, index) => index > firstIndex && row.filter(Boolean).length >= 2) : firstIndex;
  if (headerIndex < 0) return null;
  const width = Math.max(...clean.slice(headerIndex).map((row) => row.length), clean[headerIndex].length);
  const columns = Array.from({ length: width }, (_, index) => clean[headerIndex][index] || `Column ${index + 1}`);
  const endIndex = clean.findIndex((row,index) => index > headerIndex && /heads[ -]?up|monthly content cal[ae]ndar/i.test(row.join(' ')));
  const rows = clean.slice(headerIndex + 1, endIndex < 0 ? undefined : endIndex).filter((row) => row.some(Boolean)).map((row) =>
    Object.fromEntries(columns.map((column, index) => [column, row[index] || '']))
  );
  return { key, name: displayName(key), title: hasTitle ? firstCells.join(' ') : displayName(key), columns, rows };
}

async function parseWorkbook(buffer) {
  const sheetNames = await readSheetNames(buffer);
  const sheets = [];
  for (const name of sheetNames) {
    const key = identify(name);
    if (!key) continue;
    const parsed = parseMatrix(await readXlsxFile(buffer, { sheet: name }), key);
    if (parsed) sheets.push(parsed);
  }
  return { sheets, sheetNames };
}

async function saveReport({ month, originalName, sourceType, sourceUrl = '', buffer, userId, user }) {
  const parsed = await parseWorkbook(buffer);
  const sheetNames = parsed.sheetNames;
  const sheets = parsed.sheets.filter(s=>permitsSheet(managedUnits(user),s.key));
  if (!sheets.length) {
    const error = new Error(`None of the supported report sheets were found. Found: ${sheetNames.join(', ') || 'none'}.`);
    error.statusCode = 400;
    throw error;
  }
  const existing = await MonthlyProjectReport.findOne({ month }).lean();
  const report = await MonthlyProjectReport.findOneAndUpdate(
    { month }, { month, originalName, sourceType, sourceUrl, payAliasRestored:true, sheets:[...(existing?.sheets || []).filter(s=>!sheets.some(n=>n.key===s.key)),...sheets], uploadedBy: userId }, { upsert: true, new: true, runValidators: true }
  ).lean();
  return { report:restrictReport(report,user), operation: existing ? 'update' : 'create', importedSheets: sheets.map((sheet) => sheet.name), ignoredSheets: sheetNames.filter((name) => !identify(name)) };
}

exports.listReports = async (req, res, next) => { try {
  const reports = await MonthlyProjectReport.find().select('month originalName sourceType sourceUrl sheets.key sheets.name sheets.title sheets.columns sheets.rows createdAt updatedAt').sort({ month: -1 }).lean();
  logAuditEvent({ actorId: req.user._id, actorRole: req.user.role, action: 'MONTHLY_REPORT_VIEW', targetEntity: 'monthly_project_report', ip: req.ip, metadata: { count: reports.length } });
  res.json({ reports:reports.map(r=>restrictReport(r,req.user)).filter(r=>r.sheets.length) });
} catch (error) { next(error); } };

exports.importReport = async (req, res, next) => { try {
  const month = String(req.query.month || '');
  const filename = String(req.query.filename || 'monthly-report.xlsx').slice(0, 180);
  if (!/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ error: 'A valid report month is required.' });
  if (!Buffer.isBuffer(req.body) || !req.body.length) return res.status(400).json({ error: 'Excel .xlsx file is required.' });
  const result = await saveReport({ month, originalName: filename, sourceType: 'upload', buffer: req.body, userId: req.user._id, user:req.user });
  logAuditEvent({ actorId: req.user._id, actorRole: req.user.role, action: `MONTHLY_REPORT_${result.operation.toUpperCase()}`, targetEntity: 'monthly_project_report', targetId: result.report._id, ip: req.ip, metadata: { month, sourceType: 'upload', originalName: filename } });
  res.json(result);
} catch (error) { next(error); } };

exports.importGoogleSheet = async (req, res, next) => { try {
  const month = String(req.body?.month || '');
  const sourceUrl = String(req.body?.url || '').trim();
  if (!/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ error: 'A valid report month is required.' });
  const match = sourceUrl.match(/^https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/i);
  if (!match) return res.status(400).json({ error: 'Paste a valid Google Sheets share link.' });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);
  let response;
  try { response = await fetch(`https://docs.google.com/spreadsheets/d/${match[1]}/export?format=xlsx`, { signal: controller.signal }); }
  finally { clearTimeout(timeout); }
  if (!response.ok) return res.status(400).json({ error: 'Google Sheet could not be opened. Set General access to “Anyone with the link – Viewer”, then try again.' });
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length || buffer.length > MAX_WORKBOOK_BYTES) return res.status(400).json({ error: 'Google Sheet export is empty or larger than 20 MB.' });
  if ((response.headers.get('content-type') || '').includes('text/html')) return res.status(400).json({ error: 'Google returned a sign-in page. Set General access to “Anyone with the link – Viewer”.' });
  const result = await saveReport({ month, originalName: `Google Sheet ${match[1]}`, sourceType: 'google-sheet', sourceUrl, buffer, userId: req.user._id, user:req.user });
  logAuditEvent({ actorId: req.user._id, actorRole: req.user.role, action: `MONTHLY_REPORT_${result.operation.toUpperCase()}`, targetEntity: 'monthly_project_report', targetId: result.report._id, ip: req.ip, metadata: { month, sourceType: 'google-sheet' } });
  res.json(result);
} catch (error) {
  if (error.name === 'AbortError') error.message = 'Google Sheet download timed out. Please try again.';
  next(error);
} };

exports.deleteReport = async (req, res, next) => { try {
  const report = await MonthlyProjectReport.findOne({ month: req.params.month });
  if (!report) return res.status(404).json({ error: 'Monthly report not found.' });
  const remaining = report.sheets.filter(s=>!(permitsSheet(managedUnits(req.user),s.key) && (!req.query.sheet || req.query.sheet===s.key)));
  if (remaining.length === report.sheets.length) return res.status(403).json({error:'You cannot delete another team report.'});
  report.sheets = remaining;
  report.payAliasRestored = true;
  await report.save();
  logAuditEvent({ actorId: req.user._id, actorRole: req.user.role, action: 'MONTHLY_REPORT_DELETE', targetEntity: 'monthly_project_report', targetId: report._id, ip: req.ip, metadata: { month: req.params.month } });
  res.json({ success: true });
} catch (error) { next(error); } };

exports._test = { identify, parseMatrix, permitsSheet, restrictReport };
exports.parseWorkbook = parseWorkbook;
