import React from 'react';
import { Zap, Plus, FileText, Calendar, ShieldCheck } from 'lucide-react';
import { TrendChart } from './TrendChart';
import { formatNumber, formatMoney, formatMonthName } from '../utils/formatters';

export function TokenSection({
  entries,
  reportMonth,
  selectedYear,
  tokenAllocationTotal,
  tokensUsedTotal,
  tokenCostTotal,
  isAdmin = true,
  onNewTokenEntry,
  onPrintMonthly,
  onPrintYearly
}) {
  return (
    <section className="grid-two-columns" id="tokens">
      <article className="card" style={{ marginBottom: 0 }}>
        <div className="card-header">
          <div>
            <h2>
              <Zap size={20} color="#6366f1" />
              Magnific AI — Token Usage
            </h2>
            <p>
              {isAdmin
                ? 'Track separate generation records, project billing, and daily burn trends.'
                : 'Summary of AI token consumption and monthly burn trends.'}
            </p>
          </div>

          {isAdmin && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={onNewTokenEntry}
            >
              <Plus size={16} /> New Token Entry
            </button>
          )}
        </div>

        <div className="token-stat-grid">
          <div className="token-stat-box">
            <span className="token-stat-label">Usage Entries</span>
            <div className="token-stat-value">{entries.length}</div>
          </div>
          <div className="token-stat-box">
            <span className="token-stat-label">Tokens Used</span>
            <div className="token-stat-value" style={{ color: '#4f46e5' }}>
              {formatNumber(tokensUsedTotal)}
            </div>
          </div>
          <div className="token-stat-box">
            <span className="token-stat-label">Initial Allocation</span>
            <div className="token-stat-value">{formatNumber(tokenAllocationTotal)}</div>
          </div>
          <div className="token-stat-box">
            <span className="token-stat-label">Estimated Cost</span>
            <div className="token-stat-value" style={{ color: '#059669' }}>
              {formatMoney(tokenCostTotal)}
            </div>
          </div>
        </div>

        <div>
          <div className="chart-header">
            <strong style={{ fontSize: '14px', color: '#1e293b' }}>
              Daily Usage Trend
            </strong>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              {formatMonthName(reportMonth)}
            </span>
          </div>
          <TrendChart entries={entries} reportMonth={reportMonth} />
        </div>
      </article>

      <aside className="card" style={{ marginBottom: 0 }}>
        <div className="card-header" style={{ marginBottom: '12px' }}>
          <div>
            <h2>
              <FileText size={18} color="#6366f1" />
              Quick Reports
            </h2>
            <p>{isAdmin ? 'Export executive summaries directly.' : 'Reporting summaries.'}</p>
          </div>
        </div>

        {isAdmin ? (
          <>
            <button
              type="button"
              className="quick-report-btn"
              onClick={onPrintMonthly}
            >
              <div className="quick-report-icon">
                <FileText size={18} />
              </div>
              <div className="quick-report-info">
                <b>Monthly PDF Report</b>
                <span>{formatMonthName(reportMonth)} breakdown</span>
              </div>
            </button>

            <button
              type="button"
              className="quick-report-btn"
              onClick={onPrintYearly}
            >
              <div className="quick-report-icon" style={{ background: '#ecfdf5', color: '#059669' }}>
                <Calendar size={18} />
              </div>
              <div className="quick-report-info">
                <b>Yearly PDF Report</b>
                <span>Year {selectedYear} overview</span>
              </div>
            </button>
          </>
        ) : (
          <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '10px', fontSize: '12.5px', color: '#64748b' }}>
            Executive PDF reports and raw export downloads are accessible by administrators.
          </div>
        )}

        <div className="info-banner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <ShieldCheck size={16} color="#059669" />
            <h4>Realtime Local Save</h4>
          </div>
          <p>
            All subscription and token changes are immediately synced to your browser storage with automatic backups.
          </p>
        </div>
      </aside>
    </section>
  );
}
