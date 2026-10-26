const readXlsxFile = require('read-excel-file/node');
const { readSheetNames } = require('read-excel-file/node');
const MonthlyProjectReport = require('../models/MonthlyProjectReport');

const MAX_WORKBOOK_BYTES = 20 * 1024 * 1024;
const allowed = [
  ['copy-script', ['copy & script', 'copy and script', 'copy script']],
  ['kbz-bank', ['kbz bank', 'bank']],
  ['kbz-pay', ['kbz pay', 'pay']],
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
  const rows = clean.slice(headerIndex + 1).filter((row) => row.some(Boolean)).map((row) =>
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

async function saveReport({ month, originalName, sourceType, sourceUrl = '', buffer, userId }) {
  const { sheets, sheetNames } = await parseWorkbook(buffer);
  if (!sheets.length) {
    const error = new Error(`None of the supported report sheets were found. Found: ${sheetNames.join(', ') || 'none'}.`);
    error.statusCode = 400;
    throw error;
  }
  const report = await MonthlyProjectReport.findOneAndUpdate(
    { month }, { month, originalName, sourceType, sourceUrl, sheets, uploadedBy: userId }, { upsert: true, new: true, runValidators: true }
  ).lean();
  return { report, importedSheets: sheets.map((sheet) => sheet.name), ignoredSheets: sheetNames.filter((name) => !identify(name)) };
}

exports.listReports = async (_req, res, next) => { try {
  const reports = await MonthlyProjectReport.find().select('month originalName sourceType sourceUrl sheets.key sheets.name sheets.title sheets.columns sheets.rows createdAt updatedAt').sort({ month: -1 }).lean();
  res.json({ reports });
} catch (error) { next(error); } };

exports.importReport = async (req, res, next) => { try {
  const month = String(req.query.month || '');
  const filename = String(req.query.filename || 'monthly-report.xlsx').slice(0, 180);
  if (!/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ error: 'A valid report month is required.' });
  if (!Buffer.isBuffer(req.body) || !req.body.length) return res.status(400).json({ error: 'Excel .xlsx file is required.' });
  res.json(await saveReport({ month, originalName: filename, sourceType: 'upload', buffer: req.body, userId: req.user._id }));
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
  res.json(await saveReport({ month, originalName: `Google Sheet ${match[1]}`, sourceType: 'google-sheet', sourceUrl, buffer, userId: req.user._id }));
} catch (error) {
  if (error.name === 'AbortError') error.message = 'Google Sheet download timed out. Please try again.';
  next(error);
} };

exports.deleteReport = async (req, res, next) => { try {
  const report = await MonthlyProjectReport.findOneAndDelete({ month: req.params.month });
  if (!report) return res.status(404).json({ error: 'Monthly report not found.' });
  res.json({ success: true });
} catch (error) { next(error); } };

exports._test = { identify, parseMatrix };
