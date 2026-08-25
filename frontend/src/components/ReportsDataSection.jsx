import React, { useRef } from 'react';
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
  Sparkles
} from 'lucide-react';
import { formatMoney, formatNumber, formatMonthName } from '../utils/formatters';

export function ReportsDataSection({
  reportMonth,
  selectedYear,
  subscriptions = [],
  tokenEntries = [],
  alerts = [],
  fullState,
  isAdmin = true,
  onPrint,
  onImport,
  onReset,
  onNotify
}) {
  const fileInputRef = useRef(null);

  const activeSubs = subscriptions.filter((s) => !s.archived);
  const activeTokens = tokenEntries.filter((t) => !t.archived);

  const totalTokens = activeTokens.reduce((sum, e) => sum + Number(e.tokens || 0), 0);
  const totalTokenCost = activeTokens.reduce((sum, e) => sum + Number(e.cost || 0), 0);
  const monthlySubCost = activeSubs.reduce((sum, s) => {
    const cost = parseFloat(s.cost) || 0;
    if (s.plan === 'Monthly') return sum + cost;
    if (s.plan === 'Yearly') return sum + cost / 12;
    return sum;
  }, 0);

  const handleExport = () => {
    try {
      const jsonString = JSON.stringify(fullState, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `creative-hub-backup-${dateStr}.json`;
      a.click();
      URL.revokeObjectURL(url);
      if (onNotify) onNotify('Backup JSON downloaded successfully!', 'success');
    } catch (err) {
      if (onNotify) onNotify('Failed to export data backup.', 'error');
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
        onImport(parsed);
        if (onNotify) onNotify('Backup data imported successfully!', 'success');
      } catch (err) {
        if (onNotify) onNotify('Invalid JSON file format.', 'error');
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsText(file);
  };

  const handleReset = () => {
    if (!isAdmin) return;
    if (
      window.confirm(
        'Reset dashboard to default demo data? All current subscriptions and token logs will be replaced.'
      )
    ) {
      onReset();
      if (onNotify) onNotify('Demo dataset restored.', 'info');
    }
  };

  return (
    <section className="card" id="reports">
      <div className="card-header">
        <div>
          <h2>
            <FileText size={20} color="#6366f1" />
            Reports & Data Management
          </h2>
          <p>
            Generate official executive PDF/Print reports, inspect portfolio KPI analytics, and manage data backups.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => onPrint && onPrint('month')}
            title="Generate monthly summary report"
          >
            <Printer size={15} /> Monthly PDF ({formatMonthName(reportMonth)})
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onPrint && onPrint('year')}
            title="Generate annual portfolio report"
          >
            <Printer size={15} /> Annual PDF ({selectedYear})
          </button>
        </div>
      </div>

      {/* Overview Analytics Metrics */}
      <div className="user-stats-grid" style={{ marginBottom: '20px' }}>
        <div style={{ padding: '14px 16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Layers size={13} color="#6366f1" /> Subscriptions Tracked
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
            {activeSubs.length}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>
            Est. Monthly: <b>{formatMoney(monthlySubCost)}</b>
          </div>
        </div>

        <div style={{ padding: '14px 16px', background: '#f5f3ff', borderRadius: '10px', border: '1px solid #ddd6fe' }}>
          <div style={{ fontSize: '12px', color: '#7c3aed', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Zap size={13} color="#8b5cf6" /> Tokens Used ({formatMonthName(reportMonth)})
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#5b21b6', marginTop: '2px' }}>
            {formatNumber(totalTokens)}
          </div>
          <div style={{ fontSize: '11px', color: '#7c3aed', marginTop: '3px' }}>
            Est. Cost: <b>{formatMoney(totalTokenCost)}</b>
          </div>
        </div>

        <div style={{ padding: '14px 16px', background: '#ecfdf5', borderRadius: '10px', border: '1px solid #a7f3d0' }}>
          <div style={{ fontSize: '12px', color: '#047857', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
            <TrendingUp size={13} color="#10b981" /> Active Alerts
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#065f46', marginTop: '2px' }}>
            {alerts.length}
          </div>
          <div style={{ fontSize: '11px', color: '#047857', marginTop: '3px' }}>
            Renewals & Expirations
          </div>
        </div>
      </div>

      {/* Report Generation & Data Backup Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
        {/* Printable Documents Card */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Printer size={16} color="#6366f1" />
            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
              Print & Export Documents
            </h4>
          </div>
          <p style={{ fontSize: '12.5px', color: '#64748b', margin: '0 0 14px', lineHeight: '1.4' }}>
            Generate high-resolution printable reports formatted with official KBZ branding, subscription lists, and AI token logs.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-outline"
              style={{ justifyContent: 'flex-start' }}
              onClick={() => onPrint && onPrint('month')}
            >
              <Calendar size={15} /> Generate Monthly Executive Report ({formatMonthName(reportMonth)})
            </button>
            <button
              type="button"
              className="btn btn-outline"
              style={{ justifyContent: 'flex-start' }}
              onClick={() => onPrint && onPrint('year')}
            >
              <Sparkles size={15} /> Generate Annual Summary Portfolio ({selectedYear})
            </button>
          </div>
        </div>

        {/* Database Backup & Restore Card */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Database size={16} color="#6366f1" />
            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
              Data Export & Backup
            </h4>
          </div>
          <p style={{ fontSize: '12.5px', color: '#64748b', margin: '0 0 14px', lineHeight: '1.4' }}>
            {isAdmin
              ? 'Export JSON database snapshots for offline backup, restore from backup file, or reset demo dataset.'
              : 'Export current subscriptions and token logs as a JSON snapshot.'}
          </p>

          <div className="backup-controls" style={{ flexWrap: 'wrap', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-soft"
              onClick={handleExport}
            >
              <Download size={15} /> Export JSON Snapshot
            </button>

            {isAdmin && (
              <>
                <button
                  type="button"
                  className="btn btn-soft"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={15} /> Import JSON File
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
                  onClick={handleReset}
                >
                  <RotateCcw size={15} /> Reset Demo Data
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
