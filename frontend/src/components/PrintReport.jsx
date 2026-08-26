import React from 'react';
import { formatDate, formatMoney, formatNumber, formatMonthName } from '../utils/formatters';

export function PrintReport({
  type,
  reportMonth,
  selectedYear,
  subscriptions = [],
  tokenEntries = [],
  alerts = [],
  suppliers = [],
  productionOrders = [],
  assets = []
}) {
  const isMonthly = type === 'month';
  const reportPeriodText = isMonthly
    ? `Monthly Report Period: ${formatMonthName(reportMonth)}`
    : `Annual Portfolio Period: Calendar Year ${selectedYear}`;

  const activeSubs = subscriptions.filter((s) => !s.archived);
  const activeTokens = tokenEntries.filter((t) => !t.archived);
  const activeOrders = productionOrders.filter((o) => !o.archived);
  const activeSuppliers = suppliers.filter((s) => !s.archived);
  const activeAssets = assets.filter((a) => !a.archived);

  const totalTokens = activeTokens.reduce((sum, e) => sum + Number(e.tokens || 0), 0);
  const totalTokenCost = activeTokens.reduce((sum, e) => sum + Number(e.cost || 0), 0);
  const totalProductionSpend = activeOrders
    .filter((o) => o.status !== 'Cancelled')
    .reduce((sum, o) => sum + (Number(o.totalCost) || 0), 0);

  return (
    <div className="print-only-container">
      {/* Header */}
      <div className="print-header">
        <div className="print-header-top">
          <div className="print-logo-container">
            <img
              src="/images/Logo_Lockup-01.png"
              alt="KBZ Bank & KBZPay Marcomms"
              className="print-logo"
            />
          </div>
          <div className="print-header-meta">
            <div className="print-meta-pill">OFFICIAL EXECUTIVE REPORT</div>
            <div className="print-meta-date">
              Generated: {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
            </div>
          </div>
        </div>

        <div className="print-header-titles">
          <h1 className="print-main-title">KBZ Marcomms Creative & Operations Portfolio Report</h1>
          <p className="print-period-subtitle">{reportPeriodText}</p>
        </div>
      </div>

      {/* Global Executive KPI Summary Row */}
      <div className="print-kpi-row">
        <div className="print-kpi-item">
          <span>Active Subscriptions</span>
          <b>{activeSubs.length}</b>
        </div>
        <div className="print-kpi-item">
          <span>Active Alerts</span>
          <b>{alerts.length}</b>
        </div>
        <div className="print-kpi-item">
          <span>AI Tokens Used</span>
          <b>{formatNumber(totalTokens)}</b>
        </div>
        <div className="print-kpi-item">
          <span>Est. Token Cost</span>
          <b>{formatMoney(totalTokenCost)}</b>
        </div>
        <div className="print-kpi-item">
          <span>Production Orders</span>
          <b>{activeOrders.length} ({totalProductionSpend.toLocaleString()} MMK)</b>
        </div>
        <div className="print-kpi-item">
          <span>Printing Suppliers</span>
          <b>{activeSuppliers.length}</b>
        </div>
        <div className="print-kpi-item">
          <span>Brand Assets</span>
          <b>{activeAssets.length}</b>
        </div>
      </div>

      {/* Section 1: Subscriptions Overview */}
      <h2 style={{ fontSize: '13px', marginBottom: '6px', textTransform: 'uppercase', color: '#1e293b' }}>
        1. Creative Subscriptions Overview
      </h2>
      <table className="print-table">
        <thead>
          <tr>
            <th style={{ width: '18%' }}>Product</th>
            <th style={{ width: '18%' }}>Tool / Service</th>
            <th style={{ width: '10%' }}>Plan</th>
            <th style={{ width: '10%' }}>Status</th>
            <th style={{ width: '14%' }}>Expiry Date</th>
            <th style={{ width: '12%' }}>Cost (USD)</th>
            <th style={{ width: '18%' }}>Assigned Email</th>
          </tr>
        </thead>
        <tbody>
          {activeSubs.length === 0 ? (
            <tr>
              <td colSpan="7" style={{ textAlign: 'center', color: '#94a3b8' }}>No active subscriptions recorded.</td>
            </tr>
          ) : (
            activeSubs.map((sub) => (
              <tr key={sub.id}>
                <td><b>{sub.product}</b></td>
                <td>{sub.tool || '—'}</td>
                <td>{sub.plan || '—'}</td>
                <td>{sub.status || '—'}</td>
                <td>{formatDate(sub.expiry)}</td>
                <td>{sub.cost ? formatMoney(sub.cost) : '—'}</td>
                <td style={{ fontSize: '10px' }}>{sub.email || '—'}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Section 2: AI Token Consumption */}
      <h2 style={{ fontSize: '13px', marginTop: '16px', marginBottom: '6px', textTransform: 'uppercase', color: '#1e293b' }}>
        2. AI Token Consumption History
      </h2>
      <table className="print-table">
        <thead>
          <tr>
            <th style={{ width: '14%' }}>Date</th>
            <th style={{ width: '18%' }}>Account</th>
            <th style={{ width: '22%' }}>Project / Usage</th>
            <th style={{ width: '16%' }}>Tokens Used</th>
            <th style={{ width: '14%' }}>Cost (USD)</th>
            <th style={{ width: '16%' }}>Notes</th>
          </tr>
        </thead>
        <tbody>
          {activeTokens.length === 0 ? (
            <tr>
              <td colSpan="6" style={{ textAlign: 'center', color: '#94a3b8' }}>No token usage entries recorded for this period.</td>
            </tr>
          ) : (
            activeTokens.map((tok) => (
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

      {/* Section 3: Production Orders & Fabrication Milestones */}
      {activeOrders.length > 0 && (
        <>
          <h2 style={{ fontSize: '13px', marginTop: '16px', marginBottom: '6px', textTransform: 'uppercase', color: '#1e293b' }}>
            3. Printing Suppliers & Production Order Matrix
          </h2>
          <table className="print-table">
            <thead>
              <tr>
                <th style={{ width: '16%' }}>Order #</th>
                <th style={{ width: '24%' }}>Campaign & Item</th>
                <th style={{ width: '18%' }}>Supplier</th>
                <th style={{ width: '14%' }}>Quantity</th>
                <th style={{ width: '14%' }}>Total Cost</th>
                <th style={{ width: '14%' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {activeOrders.map((order) => (
                <tr key={order.id}>
                  <td style={{ fontFamily: 'monospace' }}><b>{order.orderNumber}</b></td>
                  <td>
                    <b>{order.campaignName}</b>
                    <div style={{ fontSize: '10px', color: '#64748b' }}>{order.itemDescription}</div>
                  </td>
                  <td>{order.supplier?.name || order.supplierName || '—'}</td>
                  <td>{Number(order.quantity || 0).toLocaleString()} pcs</td>
                  <td>{order.totalCost ? `${Number(order.totalCost).toLocaleString()}` : '—'}</td>
                  <td>{order.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* Section 4: Brand Asset Libraries Governance Summary */}
      {activeAssets.length > 0 && (
        <>
          <h2 style={{ fontSize: '13px', marginTop: '16px', marginBottom: '6px', textTransform: 'uppercase', color: '#1e293b' }}>
            4. Brand Asset Libraries Governance Summary
          </h2>
          <table className="print-table">
            <thead>
              <tr>
                <th style={{ width: '20%' }}>Library</th>
                <th style={{ width: '30%' }}>Asset Title</th>
                <th style={{ width: '20%' }}>Category</th>
                <th style={{ width: '15%' }}>File Format</th>
                <th style={{ width: '15%' }}>Dimensions / Size</th>
              </tr>
            </thead>
            <tbody>
              {activeAssets.map((asset) => (
                <tr key={asset.id}>
                  <td><b>{asset.library?.toUpperCase().replace(/_/g, ' ')}</b></td>
                  <td>{asset.title}</td>
                  <td>{asset.category}</td>
                  <td>{asset.fileType || 'PNG'}</td>
                  <td>{asset.dimensions || asset.fileSize || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* Sign-off & Footer */}
      <div style={{ marginTop: '28px', borderTop: '1px solid #cbd5e1', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#475569' }}>
        <div>
          <b>Prepared by:</b> Marcomms Operations Team
        </div>
        <div>
          <b>Authorized by:</b> Head of Brand / Marcomms Lead
        </div>
      </div>

      <div className="print-footer">
        <div className="print-footer-left">
          copyright by kbz marcomms.
        </div>
        <div className="print-footer-right">
          KBZ Marcomms Creative Hub &bull; Confidential &bull; Internal Use Only
        </div>
      </div>
    </div>
  );
}
