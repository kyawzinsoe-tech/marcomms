import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Printer,
  Download,
  Upload,
  RotateCcw,
  Database,
  Calendar,
  Layers,
  Zap,
  TrendingUp,
  Sparkles,
  Truck,
  AlertTriangle,
  Loader2,
  ShieldAlert
} from 'lucide-react';
import { formatMoney, formatNumber, formatMonthName } from '../utils/formatters';
import { fetchSuppliers } from '../services/supplierService';
import { fetchProductionOrders } from '../services/productionOrderService';
import { fetchAssets } from '../services/assetService';
import { getAuthToken } from '../services/authService';
import { ErrorDialog } from './common/ErrorDialog';
import { fetchMonthlyProjectReports, importMonthlyProjectReport, importMonthlyGoogleSheet, deleteMonthlyProjectReport } from '../services/monthlyProjectReportService';

const CHARTS = ['Grid', 'Pie', 'Bar', 'Line', 'Pyramid'];
const colorAt = (index) => ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 6];
function ProjectChart({ type, data }) {
  const max = Math.max(...data.map((item) => item.value), 1);
  if (type === 'Grid') return <div className="project-report-grid">{data.map((item) => <div key={item.label}><b>{item.value}</b><span>{item.label}</span></div>)}</div>;
  if (type === 'Pie') {
    let progress = 0; const total = data.reduce((sum, item) => sum + item.value, 0) || 1;
    const stops = data.map((item, index) => { const start = progress; progress += item.value / total * 100; return `${colorAt(index)} ${start}% ${progress}%`; }).join(',');
    return <div className="project-pie-wrap"><div className="project-pie" style={{ background: `conic-gradient(${stops})` }} /> <div className="project-chart-legend">{data.map((item, index) => <span key={item.label}><i style={{ background: colorAt(index) }} />{item.label} ({item.value})</span>)}</div></div>;
  }
  if (type === 'Line') return <svg className="project-svg-chart" viewBox="0 0 720 260" role="img" aria-label="Line chart"><polyline fill="none" stroke="#4f46e5" strokeWidth="5" points={data.map((item, index) => `${45 + index * (630 / Math.max(data.length - 1, 1))},${220 - item.value / max * 180}`).join(' ')} />{data.map((item, index) => <g key={item.label}><circle cx={45 + index * (630 / Math.max(data.length - 1, 1))} cy={220 - item.value / max * 180} r="7" fill={colorAt(index)} /><text x={45 + index * (630 / Math.max(data.length - 1, 1))} y="248" textAnchor="middle" fontSize="12">{item.label.slice(0, 12)}</text></g>)}</svg>;
  return <div className={type === 'Pyramid' ? 'project-pyramid' : 'project-bars'}>{data.map((item, index) => <div key={item.label} className="project-bar-row"><span>{item.label}</span><div style={{ width: `${Math.max(item.value / max * 100, 5)}%`, background: colorAt(index) }}>{item.value}</div></div>)}</div>;
}

export function ReportsDataSection({
  reportMonth,
  selectedYear,
  subscriptions = [],
  tokenEntries = [],
  alerts = [],
  isAdmin = true,
  onPrint,
  onImport,
  onReset,
  onNotify
}) {
  const fileInputRef = useRef(null);
  const excelInputRef = useRef(null);

  // Live operational data
  const [suppliers, setSuppliers] = useState([]);
  const [productionOrders, setProductionOrders] = useState([]);
  const [assets, setAssets] = useState([]);

  // Modal dialog states
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const [pendingImportData, setPendingImportData] = useState(null);
  const [isImporting, setIsImporting] = useState(false);

  const [isExporting, setIsExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [operationalDataStatus, setOperationalDataStatus] = useState('loading');
  const [monthlyReports, setMonthlyReports] = useState([]);
  const [selectedReportMonth, setSelectedReportMonth] = useState(reportMonth);
  const [selectedSheetKey, setSelectedSheetKey] = useState('kbz-bank');
  const [chartType, setChartType] = useState('Grid');
  const [groupField, setGroupField] = useState('Status');
  const [isExcelImporting, setIsExcelImporting] = useState(false);
  const [googleSheetUrl, setGoogleSheetUrl] = useState('');

  useEffect(() => {
    async function loadOperationalMetrics() {
      try {
        const [supData, poData, bankAssets, payAssets, commsAssets] = await Promise.all([
          fetchSuppliers(),
          fetchProductionOrders(),
          fetchAssets({ library: 'kbz_bank' }),
          fetchAssets({ library: 'kbz_pay' }),
          fetchAssets({ library: 'kbz_comms' })
        ]);
        setSuppliers(supData);
        setProductionOrders(poData);
        setAssets([...bankAssets, ...payAssets, ...commsAssets]);
        setOperationalDataStatus('live');
      } catch (err) {
        console.warn('[Reports] Operational metrics fetch warning:', err.message);
        setOperationalDataStatus('error');
      }
    }

    loadOperationalMetrics();
  }, []);

  const loadMonthlyReports = async () => {
    try {
      const data = await fetchMonthlyProjectReports();
      setMonthlyReports(data.reports || []);
      if (data.reports?.length && !data.reports.some((item) => item.month === selectedReportMonth)) setSelectedReportMonth(data.reports[0].month);
    } catch (error) { setErrorMessage(error.message); }
  };
  useEffect(() => { loadMonthlyReports(); }, []);

  const handleExcelImport = async (event) => {
    const file = event.target.files?.[0]; if (!file) return;
    setIsExcelImporting(true);
    try {
      const result = await importMonthlyProjectReport({ file, month: selectedReportMonth });
      onNotify?.(`${result.importedSheets.join(', ')} imported for ${selectedReportMonth}.`, 'success');
      await loadMonthlyReports();
    } catch (error) { setErrorMessage(error.message); }
    finally { setIsExcelImporting(false); event.target.value = ''; }
  };

  const handleGoogleSheetImport = async () => {
    if (!googleSheetUrl.trim()) return setErrorMessage('Google Sheets share link ထည့်ပါ။');
    setIsExcelImporting(true);
    try {
      const result = await importMonthlyGoogleSheet({ url: googleSheetUrl.trim(), month: selectedReportMonth });
      const ignored = result.ignoredSheets?.length ? ` Ignored: ${result.ignoredSheets.join(', ')}.` : '';
      onNotify?.(`${result.importedSheets.join(', ')} imported for ${selectedReportMonth}.${ignored}`, 'success');
      await loadMonthlyReports();
    } catch (error) { setErrorMessage(error.message); }
    finally { setIsExcelImporting(false); }
  };

  const activeProjectReport = monthlyReports.find((item) => item.month === selectedReportMonth);
  const activeProjectSheet = activeProjectReport?.sheets?.find((item) => item.key === selectedSheetKey) || activeProjectReport?.sheets?.[0];
  const availableFields = activeProjectSheet?.columns?.filter((column) => !/^no\.?$/i.test(column)) || [];
  const effectiveGroupField = availableFields.includes(groupField) ? groupField : (availableFields.find((field) => /status/i.test(field)) || availableFields[0]);
  const chartData = Object.entries((activeProjectSheet?.rows || []).reduce((acc, row) => { const key = row[effectiveGroupField] || 'Unspecified'; acc[key] = (acc[key] || 0) + 1; return acc; }, {})).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 12);

  const activeSubs = subscriptions.filter((s) => !s.archived);
  const activeTokens = tokenEntries.filter((t) => !t.archived);
  const activeOrders = productionOrders.filter((o) => !o.archived);
  const activeSuppliers = suppliers.filter((s) => !s.archived);
  const activeAssets = assets.filter((a) => !a.archived);

  const totalTokens = activeTokens.reduce((sum, e) => sum + Number(e.tokens || 0), 0);
  const totalTokenCost = activeTokens.reduce((sum, e) => sum + Number(e.cost || 0), 0);
  const monthlySubCost = activeSubs.reduce((sum, s) => {
    const cost = parseFloat(s.cost) || 0;
    if (s.plan === 'Monthly') return sum + cost;
    if (s.plan === 'Yearly') return sum + cost / 12;
    return sum;
  }, 0);

  const totalProductionSpend = activeOrders
    .filter((o) => o.status !== 'Cancelled')
    .reduce((sum, o) => sum + (Number(o.totalCost) || 0), 0);

  const handleExportFullSystem = async () => {
    setIsExporting(true);
    const token = getAuthToken();

    try {
      // 1. Try authoritative backend full export
      if (token) {
        const res = await fetch('/api/backup/export', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.backup) {
            const jsonString = JSON.stringify(data.backup, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const dateStr = new Date().toISOString().slice(0, 10);
            a.href = url;
            a.download = `kbz-marcomms-full-backup-${dateStr}.json`;
            a.click();
            URL.revokeObjectURL(url);
            onNotify?.('Full system backup downloaded and synced to S3!', 'success');
            return;
          }
        }
      }

      // 2. Fallback client-side full state export
      const clientExportPayload = {
        version: '3.5',
        exportedAt: new Date().toISOString(),
        reportMonth,
        subscriptions: activeSubs,
        tokenEntries: activeTokens,
        suppliers: activeSuppliers,
        productionOrders: activeOrders,
        assets: activeAssets
      };
      const jsonString = JSON.stringify(clientExportPayload, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `kbz-marcomms-backup-${dateStr}.json`;
      a.click();
      URL.revokeObjectURL(url);
      onNotify?.('System JSON backup snapshot downloaded!', 'success');
    } catch (err) {
      setErrorMessage(err.message || 'Failed to export full system backup.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileChange = (e) => {
    if (!isAdmin) return;
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        setPendingImportData(parsed);
      } catch {
        setErrorMessage('Invalid JSON backup file format. Please upload a valid exported backup JSON.');
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = async () => {
    if (!pendingImportData) return;
    setIsImporting(true);
    try {
      await onImport?.(pendingImportData);
      onNotify?.('System backup imported successfully into MongoDB!', 'success');
      setPendingImportData(null);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to import backup data.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleConfirmReset = async () => {
    setIsResetting(true);
    try {
      await onReset?.();
      onNotify?.('Database demo dataset restored.', 'info');
      setIsResetModalOpen(false);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to reset database.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <section className="card" id="reports" aria-label="Reports & Enterprise Data Hub">
      {/* Module Header */}
      <div className="card-header">
        <div>
          <h2>
            <FileText size={20} color="var(--primary)" />
            Unified Enterprise Reporting & Comprehensive System Backup Hub
          </h2>
          <p>
            Generate high-resolution printable PDF reports across all 6 Marcomms domains, inspect portfolio analytics, and manage S3 backups.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => onPrint?.('month')}
            title="Generate monthly executive summary report"
            aria-label="Monthly PDF Report"
          >
            <Printer size={14} /> Monthly PDF ({formatMonthName(reportMonth)})
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => onPrint?.('year')}
            title="Generate annual portfolio summary report"
            aria-label="Annual PDF Report"
          >
            <Printer size={14} /> Annual PDF ({selectedYear})
          </button>
        </div>
      </div>

      <div className={operationalDataStatus === 'live' ? 'report-data-source live' : 'report-data-source error'} role="status">
        {operationalDataStatus === 'loading' ? 'Loading live report data…' : operationalDataStatus === 'live' ? 'Live database data verified' : 'Some live report data could not be loaded; totals are not authoritative.'}
      </div>

      <div className="monthly-project-dashboard">
        <div className="monthly-project-heading">
          <div><h3>Monthly Creative Projects</h3><p>Google Sheets share link သို့မဟုတ် Excel (.xlsx) မှ Sheet ၆ ခုကိုသာ လအလိုက်တင်ပြီး Chart ပြောင်းကြည့်နိုင်သည်။</p></div>
          {isAdmin && <><button className="btn btn-outline" type="button" onClick={() => excelInputRef.current?.click()} disabled={isExcelImporting}><Upload size={15} /> Upload .xlsx</button><input ref={excelInputRef} className="hidden-file-input" type="file" accept=".xlsx" onChange={handleExcelImport} /></>}
        </div>
        {isAdmin && <div className="google-sheet-import"><label>Google Sheets Share Link<input type="url" value={googleSheetUrl} onChange={(e) => setGoogleSheetUrl(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/.../edit?usp=sharing" /></label><button className="btn btn-primary" type="button" onClick={handleGoogleSheetImport} disabled={isExcelImporting}>{isExcelImporting ? <Loader2 size={15} className="spin" /> : <Upload size={15} />} Import Link</button><small>Google Sheet → Share → General access → Anyone with the link → Viewer ဖြစ်ရပါမယ်။ သတ်မှတ်ထားသော tabs မဟုတ်တာများကို မယူပါ။</small></div>}
        <div className="monthly-project-controls">
          <label>Report Month<input type="month" value={selectedReportMonth} onChange={(e) => setSelectedReportMonth(e.target.value)} /></label>
          <label>Sheet<select value={activeProjectSheet?.key || selectedSheetKey} onChange={(e) => setSelectedSheetKey(e.target.value)}>{(activeProjectReport?.sheets || []).map((sheet) => <option key={sheet.key} value={sheet.key}>{sheet.name}</option>)}</select></label>
          <label>Group By<select value={effectiveGroupField || ''} onChange={(e) => setGroupField(e.target.value)}>{availableFields.map((field) => <option key={field}>{field}</option>)}</select></label>
          <label>View<select value={chartType} onChange={(e) => setChartType(e.target.value)}>{CHARTS.map((type) => <option key={type}>{type}</option>)}</select></label>
        </div>
        {activeProjectSheet ? <><div className="monthly-project-title"><div><b>{activeProjectSheet.title || activeProjectSheet.name}</b><span>{activeProjectSheet.rows.length} records · Source: {activeProjectReport.sourceType === 'google-sheet' ? 'Google Sheets link' : activeProjectReport.originalName}</span></div>{isAdmin && <button type="button" className="btn btn-danger btn-sm" onClick={async () => { if (!window.confirm(`Delete ${selectedReportMonth} report?`)) return; try { await deleteMonthlyProjectReport(selectedReportMonth); await loadMonthlyReports(); } catch (error) { setErrorMessage(error.message); } }}>Delete Month</button>}</div><ProjectChart type={chartType} data={chartData} /></> : <div className="monthly-project-empty">ဒီလအတွက် report data မရှိသေးပါ။ Report Month ရွေးပြီး Google Sheets link သို့မဟုတ် .xlsx file တင်ပါ။<small>ယူမည့် Sheets: Copy & Script, KBZ Bank (Bank), KBZ Pay (Pay), KBZPay Market, KBZ Bank Communication (Comms), Production</small></div>}
      </div>

      {/* Domain-Wide KPI Summary Bar */}
      <div className="sub-summary-bar">
        <div className="sub-summary-item">
          <Layers size={14} className="sub-summary-icon" />
          <span>
            <b>{activeSubs.length}</b> Subscriptions (Est. {formatMoney(monthlySubCost)}/mo)
          </span>
        </div>

        <div className="sub-summary-item">
          <Zap size={14} style={{ color: '#8b5cf6' }} />
          <span>
            <b>{formatNumber(totalTokens)}</b> AI Tokens Used ({formatMoney(totalTokenCost)})
          </span>
        </div>

        <div className="sub-summary-item">
          <TrendingUp size={14} className="sub-summary-icon success" />
          <span>
            <b>{alerts.length}</b> Active Alert{alerts.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="sub-summary-item">
          <Truck size={14} style={{ color: 'var(--primary)' }} />
          <span>
            <b>{activeSuppliers.length}</b> Print Supplier{activeSuppliers.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="sub-summary-item">
          <Printer size={14} className="sub-summary-icon cost" />
          <span>
            <b>{activeOrders.length}</b> Orders ({totalProductionSpend.toLocaleString()} MMK)
          </span>
        </div>

        <div className="sub-summary-item">
          <Sparkles size={14} style={{ color: '#ec4899' }} />
          <span>
            <b>{activeAssets.length}</b> Brand Asset{activeAssets.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      {/* Grid of Report Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', marginTop: '16px' }}>
        {/* Printable Documents Card */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Printer size={16} color="var(--primary)" />
            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Print & PDF Executive Documents
            </h4>
          </div>
          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: '0 0 16px', lineHeight: '1.4' }}>
            Generate high-resolution printable reports formatted with official KBZ branding, complete subscription inventories, AI token consumption logs, production orders, and brand asset statistics.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-outline"
              style={{ justifyContent: 'flex-start', fontSize: '12.5px' }}
              onClick={() => onPrint?.('month')}
            >
              <Calendar size={15} /> Generate Monthly Executive Report ({formatMonthName(reportMonth)})
            </button>
            <button
              type="button"
              className="btn btn-outline"
              style={{ justifyContent: 'flex-start', fontSize: '12.5px' }}
              onClick={() => onPrint?.('year')}
            >
              <Sparkles size={15} /> Generate Annual Summary Portfolio ({selectedYear})
            </button>
          </div>
        </div>

        {/* Database Backup & Restore Card */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Database size={16} color="var(--primary)" />
            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Full System Backup & AWS S3 Sync
            </h4>
          </div>
          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: '0 0 16px', lineHeight: '1.4' }}>
            {isAdmin
              ? 'Export full database snapshots covering Subscriptions, AI Tokens, Assets, Suppliers, and Orders. Snapshots are automatically synced to AWS S3.'
              : 'Export current portfolio data as a JSON snapshot for offline review.'}
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-soft"
              onClick={handleExportFullSystem}
              disabled={isExporting}
            >
              {isExporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} Export JSON Snapshot
            </button>

            {isAdmin && (
              <>
                <button
                  type="button"
                  className="btn btn-soft"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={15} /> Import Backup JSON
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  className="hidden-file-input"
                  onChange={handleFileChange}
                />

                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => setIsResetModalOpen(true)}
                >
                  <RotateCcw size={15} /> Reset Demo Data
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Safe Demo Reset Confirmation Modal */}
      {isResetModalOpen && (
        <div className="modal-overlay" onClick={() => !isResetting && setIsResetModalOpen(false)}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-demo-dialog-title"
            style={{ maxWidth: '480px' }}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--danger-light)',
                    display: 'grid',
                    placeItems: 'center',
                    color: 'var(--danger-text)',
                    flexShrink: 0
                  }}
                >
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <h3 id="reset-demo-dialog-title" style={{ fontSize: '16px' }}>Reset to Demo Records?</h3>
                  <p style={{ fontSize: '12.5px' }}>Database Initialization</p>
                </div>
              </div>
            </div>

            <div style={{ margin: '14px 0', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Are you sure you want to reset the database to default demo records? Current subscriptions and token usage records will be replaced.
            </div>

            <div className="modal-footer" style={{ marginTop: '20px' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setIsResetModalOpen(false)}
                disabled={isResetting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleConfirmReset}
                disabled={isResetting}
              >
                {isResetting ? 'Resetting...' : 'Reset Demo Data'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Safe Backup Import Confirmation Modal */}
      {pendingImportData && (
        <div className="modal-overlay" onClick={() => !isImporting && setPendingImportData(null)}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="import-backup-dialog-title"
            style={{ maxWidth: '520px' }}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--warning-light)',
                    display: 'grid',
                    placeItems: 'center',
                    color: 'var(--warning-text)',
                    flexShrink: 0
                  }}
                >
                  <ShieldAlert size={18} />
                </div>
                <div>
                  <h3 id="import-backup-dialog-title" style={{ fontSize: '16px' }}>Confirm Database Backup Import</h3>
                  <p style={{ fontSize: '12.5px' }}>System State Replacement</p>
                </div>
              </div>
            </div>

            <div style={{ margin: '14px 0', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              You are about to restore a database backup snapshot. Existing collections will be replaced with the records in the backup file:
              <ul style={{ margin: '8px 0 0 18px', padding: 0, fontSize: '12.5px', color: 'var(--text-primary)' }}>
                <li><b>{pendingImportData.subscriptions?.length || 0}</b> Subscriptions</li>
                <li><b>{pendingImportData.tokenEntries?.length || 0}</b> Token Usage Entries</li>
                {pendingImportData.suppliers && <li><b>{pendingImportData.suppliers.length}</b> Suppliers</li>}
                {pendingImportData.assets && <li><b>{pendingImportData.assets.length}</b> Brand Assets</li>}
              </ul>
            </div>

            <div className="modal-footer" style={{ marginTop: '20px' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setPendingImportData(null)}
                disabled={isImporting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirmImport}
                disabled={isImporting}
              >
                {isImporting ? 'Importing...' : 'Confirm & Restore Backup'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Centered Error Dialog */}
      <ErrorDialog
        isOpen={Boolean(errorMessage)}
        title="Reports & Backup Alert"
        message={errorMessage}
        onClose={() => setErrorMessage(null)}
      />
    </section>
  );
}
