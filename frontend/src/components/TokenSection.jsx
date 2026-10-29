import React, { useMemo, useState } from 'react';
import { Zap, Plus, FileText, Calendar, ShieldCheck, PieChart, Activity, DollarSign, Layers } from 'lucide-react';
import { TrendChart } from './TrendChart';
import { formatNumber, formatMoney, formatMonthName } from '../utils/formatters';

export function TokenSection({
  entries = [],
  allEntries = [],
  reportMonth,
  selectedYear,
  tokenAllocationTotal = 0,
  tokensUsedTotal = 0,
  tokenCostTotal = 0,
  isAdmin = true,
  onNewTokenEntry,
  onPrintMonthly,
  onPrintYearly
}) {
  const [rangeYear, setRangeYear] = useState(selectedYear);
  const [fromMonth, setFromMonth] = useState(1);
  const [toMonth, setToMonth] = useState(12);
  const years = [...new Set([selectedYear, ...allEntries.map(e => Number(e.date?.slice(0,4))).filter(Boolean)])].sort((a,b)=>b-a);
  const monthlyRows = Array.from({length:toMonth-fromMonth+1}, (_,i) => {
    const month = `${rangeYear}-${String(fromMonth+i).padStart(2,'0')}`;
    const records = allEntries.filter(e => !e.archived && e.date?.slice(0,7) === month);
    return {month, count:records.length, tokens:records.reduce((n,e)=>n+Number(e.tokens||0),0), cost:records.reduce((n,e)=>n+Number(e.cost||0),0)};
  });
  // Safe Calculations
  const remainingTokens = useMemo(() => {
    if (tokenAllocationTotal <= 0) return 0;
    return Math.max(0, tokenAllocationTotal - tokensUsedTotal);
  }, [tokenAllocationTotal, tokensUsedTotal]);

  const burnRatePercent = useMemo(() => {
    if (tokenAllocationTotal <= 0) return null;
    const pct = (tokensUsedTotal / tokenAllocationTotal) * 100;
    return Math.min(100, Math.max(0, pct));
  }, [tokenAllocationTotal, tokensUsedTotal]);

  return (
    <section className="grid-two-columns" id="tokens" aria-label="Magnific AI Token Usage and Analytics">
      <article className="card" style={{ marginBottom: 0 }}>
        <div className="card-header">
          <div>
            <h2>
              <Zap size={18} color="#6366f1" />
              Magnific AI — Token Consumption & Analytics
            </h2>
            <p>
              {isAdmin
                ? `Track monthly token burn rates, remaining balances, and daily consumption for ${formatMonthName(reportMonth)}.`
                : `Monthly token consumption overview and burn trends for ${formatMonthName(reportMonth)}.`}
            </p>
          </div>

          {isAdmin && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={onNewTokenEntry}
              title="Record a new AI generation or upscaling session"
            >
              <Plus size={15} /> New Token Entry
            </button>
          )}
        </div>

        {/* 6-Metric Token KPI Grid */}
        <div className="token-stat-grid">
          <div className="token-stat-box">
            <span className="token-stat-label">Usage Entries</span>
            <div className="token-stat-value">{entries.length}</div>
            <span className="token-stat-subtext">Logged sessions</span>
          </div>

          <div className="token-stat-box">
            <span className="token-stat-label">Tokens Consumed</span>
            <div className="token-stat-value" style={{ color: 'var(--primary-hover)' }}>
              {formatNumber(tokensUsedTotal)}
            </div>
            <span className="token-stat-subtext">{formatMonthName(reportMonth)} total</span>
          </div>

          <div className="token-stat-box">
            <span className="token-stat-label">Initial Allocation</span>
            <div className="token-stat-value">
              {tokenAllocationTotal > 0 ? formatNumber(tokenAllocationTotal) : '—'}
            </div>
            <span className="token-stat-subtext">Active subscriptions</span>
          </div>

          <div className="token-stat-box">
            <span className="token-stat-label">Remaining Balance</span>
            <div
              className="token-stat-value"
              style={{ color: remainingTokens > 0 ? 'var(--success-text)' : 'var(--text-muted)' }}
            >
              {tokenAllocationTotal > 0 ? formatNumber(remainingTokens) : '—'}
            </div>
            <span className="token-stat-subtext">Available to spend</span>
          </div>

          <div className="token-stat-box">
            <span className="token-stat-label">Consumption Rate</span>
            <div className="token-stat-value" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {burnRatePercent !== null ? (
                <>
                  <span>{burnRatePercent.toFixed(1)}%</span>
                  <span
                    className={`token-burn-pill ${
                      burnRatePercent > 90
                        ? 'danger'
                        : burnRatePercent > 75
                        ? 'warning'
                        : 'success'
                    }`}
                  >
                    {burnRatePercent > 90 ? 'High' : burnRatePercent > 75 ? 'Moderate' : 'Optimal'}
                  </span>
                </>
              ) : (
                '—'
              )}
            </div>
            <span className="token-stat-subtext">Of monthly allotment</span>
          </div>

          <div className="token-stat-box">
            <span className="token-stat-label">Estimated Cost</span>
            <div className="token-stat-value" style={{ color: '#0d9488' }}>
              {formatMoney(tokenCostTotal)}
            </div>
            <span className="token-stat-subtext">USD valuation</span>
          </div>
        </div>

        <div className="token-range-controls" aria-label="Monthly token range">
          <label>Year<select value={rangeYear} onChange={e=>setRangeYear(Number(e.target.value))}>{years.map(y=><option key={y}>{y}</option>)}</select></label>
          <label>From month<select value={fromMonth} onChange={e=>{const m=Number(e.target.value);setFromMonth(m);if(m>toMonth)setToMonth(m);}}>{Array.from({length:12},(_,i)=><option key={i} value={i+1}>{new Date(2026,i,1).toLocaleString('en',{month:'long'})}</option>)}</select></label>
          <label>To month<select value={toMonth} onChange={e=>setToMonth(Number(e.target.value))}>{Array.from({length:13-fromMonth},(_,i)=><option key={i} value={fromMonth+i}>{new Date(2026,fromMonth+i-1,1).toLocaleString('en',{month:'long'})}</option>)}</select></label>
        </div>
        <div className="table-scroll"><table className="data-table"><thead><tr><th>Month</th><th>Entries</th><th>Tokens Used</th><th>Cost (USD)</th></tr></thead><tbody>{monthlyRows.map(row=><tr key={row.month}><td>{formatMonthName(row.month)}</td><td>{row.count}</td><td>{formatNumber(row.tokens)}</td><td>{formatMoney(row.cost)}</td></tr>)}</tbody><tfoot><tr><th>Total</th><td>{monthlyRows.reduce((n,r)=>n+r.count,0)}</td><td>{formatNumber(monthlyRows.reduce((n,r)=>n+r.tokens,0))}</td><td>{formatMoney(monthlyRows.reduce((n,r)=>n+r.cost,0))}</td></tr></tfoot></table></div>
        {/* Daily Trend Chart */}
        <div>
          <div className="chart-header">
            <strong style={{ fontSize: '13.5px', color: 'var(--text-primary)', fontWeight: 700 }}>
              Daily Usage Burn Trend
            </strong>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {formatMonthName(reportMonth)}
            </span>
          </div>
          <TrendChart entries={entries} reportMonth={reportMonth} />
        </div>
      </article>

      {/* Aside Quick Reports */}
      <aside className="card" style={{ marginBottom: 0 }}>
        <div className="card-header" style={{ marginBottom: '12px' }}>
          <div>
            <h2>
              <FileText size={18} color="#6366f1" />
              Executive Reports
            </h2>
            <p>{isAdmin ? 'Generate print-ready management briefs.' : 'Reporting summaries.'}</p>
          </div>
        </div>

        {isAdmin ? (
          <>
            <button
              type="button"
              className="quick-report-btn"
              onClick={onPrintMonthly}
              title="Download print-ready monthly PDF report"
            >
              <div className="quick-report-icon">
                <FileText size={18} />
              </div>
              <div className="quick-report-info">
                <b>Monthly PDF Report</b>
                <span>{formatMonthName(reportMonth)} comprehensive report</span>
              </div>
            </button>

            <button
              type="button"
              className="quick-report-btn"
              onClick={onPrintYearly}
              title="Download print-ready yearly overview PDF"
            >
              <div className="quick-report-icon" style={{ background: '#ecfdf5', color: '#059669' }}>
                <Calendar size={18} />
              </div>
              <div className="quick-report-info">
                <b>Yearly PDF Report</b>
                <span>Year {selectedYear} executive overview</span>
              </div>
            </button>
          </>
        ) : (
          <div style={{ padding: '12px', background: 'var(--bg-surface-secondary)', borderRadius: '10px', fontSize: '12.5px', color: 'var(--text-muted)' }}>
            Executive PDF reports and raw export downloads are accessible by authorized administrators.
          </div>
        )}

        <div className="info-banner" style={{ marginTop: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <ShieldCheck size={16} color="#059669" />
            <h4>Realtime Sync & Backups</h4>
          </div>
          <p>
            All token usage entries and subscription allotments are automatically synchronized in real time with enterprise cloud backups.
          </p>
        </div>
      </aside>
    </section>
  );
}
