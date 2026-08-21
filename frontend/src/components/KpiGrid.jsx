import React from 'react';
import { Layers, CheckCircle2, AlertCircle, DollarSign, Zap } from 'lucide-react';
import { formatMoney, formatNumber } from '../utils/formatters';

export function KpiGrid({
  totalCount,
  activeCount,
  activePercentage,
  overdueCount,
  monthlyCost,
  monthTokensUsed
}) {
  return (
    <section className="kpi-grid" id="dashboard">
      <div className="kpi-card">
        <div className="kpi-header">
          <span className="kpi-label">Total Subscriptions</span>
          <div className="kpi-icon-wrap">
            <Layers size={16} />
          </div>
        </div>
        <div className="kpi-value">{totalCount}</div>
        <div className="kpi-subtext">All active records</div>
      </div>

      <div className="kpi-card">
        <div className="kpi-header">
          <span className="kpi-label">Active</span>
          <div className="kpi-icon-wrap">
            <CheckCircle2 size={16} />
          </div>
        </div>
        <div className="kpi-value">{activeCount}</div>
        <div className="kpi-subtext">{activePercentage}% of total plans</div>
      </div>

      <div className={`kpi-card ${overdueCount > 0 ? 'kpi-danger' : ''}`}>
        <div className="kpi-header">
          <span className="kpi-label">Overdue</span>
          <div className="kpi-icon-wrap">
            <AlertCircle size={16} />
          </div>
        </div>
        <div className="kpi-value">{overdueCount}</div>
        <div className="kpi-subtext">{overdueCount > 0 ? 'Needs immediate attention' : 'No overdue renewals'}</div>
      </div>

      <div className="kpi-card">
        <div className="kpi-header">
          <span className="kpi-label">Known Monthly Cost</span>
          <div className="kpi-icon-wrap">
            <DollarSign size={16} />
          </div>
        </div>
        <div className="kpi-value">{formatMoney(monthlyCost)}</div>
        <div className="kpi-subtext">USD / Monthly plans</div>
      </div>

      <div className="kpi-card">
        <div className="kpi-header">
          <span className="kpi-label">Selected Month Tokens</span>
          <div className="kpi-icon-wrap">
            <Zap size={16} />
          </div>
        </div>
        <div className="kpi-value">{formatNumber(monthTokensUsed)}</div>
        <div className="kpi-subtext">Magnific AI consumed</div>
      </div>
    </section>
  );
}
