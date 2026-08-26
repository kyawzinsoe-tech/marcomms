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

  useEffect(() => {
    async function loadOperationalMetrics() {
      try {
        const [supData, poData, bankAssets, payAssets, commsAssets] = await Promise.all([
          fetchSuppliers().catch(() => []),
          fetchProductionOrders().catch(() => []),
          fetchAssets({ library: 'kbz_bank' }).catch(() => []),
          fetchAssets({ library: 'kbz_pay' }).catch(() => []),
          fetchAssets({ library: 'kbz_comms' }).catch(() => [])
        ]);
        setSuppliers(supData);
        setProductionOrders(poData);
        setAssets([...bankAssets, ...payAssets, ...commsAssets]);
      } catch (err) {
        console.warn('[Reports] Operational metrics fetch warning:', err.message);
      }
    }

    loadOperationalMetrics();
  }, []);

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
