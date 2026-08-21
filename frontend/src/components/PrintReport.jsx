import React from 'react';
import { formatDate, formatMoney, formatNumber, formatMonthName } from '../utils/formatters';

export function PrintReport({
  type,
  reportMonth,
  selectedYear,
  subscriptions,
  tokenEntries,
  alerts
}) {
  const isMonthly = type === 'month';
  const title = isMonthly
    ? `Creative Subscription Report — ${formatMonthName(reportMonth)}`
    : `Creative Subscription Report — Year ${selectedYear}`;

  const totalTokens = tokenEntries.reduce((sum, e) => sum + Number(e.tokens || 0), 0);
  const totalCost = tokenEntries.reduce((sum, e) => sum + Number(e.cost || 0), 0);

  return (
    <div className="print-only-container">
      <div className="print-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div>
            <h1>{title}</h1>
            <p style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
              Generated on {new Date().toLocaleDateString()} • KBZ Marcomms Creative Hub
            </p>
          </div>
          <img
            src="/images/Logo_Lockup-01.png"
            alt="KBZ Logo"
            style={{ height: '36px', objectFit: 'contain' }}
          />
        </div>
      </div>

      <div className="print-kpi-row">
        <div className="print-kpi-item">
          <span>Total Subscriptions</span>
          <b>{subscriptions.length}</b>
        </div>
        <div className="print-kpi-item">
          <span>Active Alerts</span>
          <b>{alerts.length}</b>
        </div>
        <div className="print-kpi-item">
          <span>Total AI Tokens Used</span>
          <b>{formatNumber(totalTokens)}</b>
        </div>
        <div className="print-kpi-item">
          <span>Estimated Token Cost</span>
          <b>{formatMoney(totalCost)}</b>
        </div>
      </div>

      <h2 style={{ fontSize: '14px', marginBottom: '8px', textTransform: 'uppercase' }}>
        Subscriptions Overview
      </h2>
      <table className="print-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Tool / Service</th>
            <th>Plan</th>
            <th>Status</th>
            <th>Expiry Date</th>
            <th>Cost (USD)</th>
            <th>Initial Tokens</th>
            <th>Account</th>
          </tr>
        </thead>
        <tbody>
          {subscriptions.length === 0 ? (
            <tr>
              <td colSpan="8">No active subscriptions.</td>
            </tr>
          ) : (
            subscriptions.map((sub) => (
              <tr key={sub.id}>
                <td><b>{sub.product}</b></td>
                <td>{sub.tool || '—'}</td>
                <td>{sub.plan || '—'}</td>
                <td>{sub.status || '—'}</td>
                <td>{formatDate(sub.expiry)}</td>
                <td>{sub.cost ? formatMoney(sub.cost) : '—'}</td>
                <td>{sub.initialTokens ? formatNumber(sub.initialTokens) : '—'}</td>
                <td>{sub.email || '—'}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <h2 style={{ fontSize: '14px', marginBottom: '8px', textTransform: 'uppercase' }}>
        Magnific AI — Token Consumption History
      </h2>
      <table className="print-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Account</th>
            <th>Project / Usage</th>
            <th>Tokens Used</th>
            <th>Cost (USD)</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          {tokenEntries.length === 0 ? (
            <tr>
              <td colSpan="6">No token usage entries recorded for this period.</td>
            </tr>
          ) : (
            tokenEntries.map((tok) => (
              <tr key={tok.id}>
                <td>{formatDate(tok.date)}</td>
                <td>{tok.account || '—'}</td>
                <td><b>{tok.project || '—'}</b></td>
                <td>{formatNumber(tok.tokens)}</td>
                <td>{tok.cost ? formatMoney(tok.cost) : '—'}</td>
                <td>{tok.notes || '—'}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
