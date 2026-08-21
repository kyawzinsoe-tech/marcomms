import React from 'react';
import { Calendar, Printer, Sparkles, Shield, Eye } from 'lucide-react';

export function Header({
  reportMonth,
  onMonthChange,
  onPrintMonthly,
  onPrintYearly,
  user,
  isAdmin
}) {
  return (
    <header className="topbar">
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <span className="eyebrow">
            <Sparkles size={13} /> ALL-IN-ONE CREATIVE TOOLS
          </span>
          {user && (
            <span className={`user-role-badge ${isAdmin ? 'badge-role-admin' : 'badge-role-user'}`}>
              {isAdmin ? <Shield size={10} /> : <Eye size={10} />}
              {isAdmin ? 'ADMINISTRATOR' : 'VIEWER (READ-ONLY)'}
            </span>
          )}
        </div>
        <h1>Creative Subscription Report</h1>
        <p>
          {isAdmin
            ? 'Full administrative control over subscriptions, AI token allocation, and user roles.'
            : 'Read-only overview of creative tool subscriptions, plans, and Magnific AI token usage.'}
        </p>
      </div>

      <div className="header-controls">
        <label className="month-picker-label">
          <span>Report Month</span>
          <input
            type="month"
            value={reportMonth}
            onChange={(e) => onMonthChange(e.target.value)}
          />
        </label>

        {isAdmin && (
          <>
            <button
              type="button"
              className="btn btn-soft"
              onClick={onPrintMonthly}
              title="Print or export monthly PDF report"
            >
              <Printer size={15} /> Monthly PDF
            </button>

            <button
              type="button"
              className="btn btn-soft"
              onClick={onPrintYearly}
              title="Print or export yearly PDF report"
            >
              <Calendar size={15} /> Yearly PDF
            </button>
          </>
        )}
      </div>
    </header>
  );
}
