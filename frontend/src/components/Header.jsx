import React from 'react';
import { Calendar, Printer, Sparkles, Crown, Shield, Eye } from 'lucide-react';

export function Header({
  reportMonth,
  onMonthChange,
  onPrintMonthly,
  onPrintYearly,
  user,
  isSuperAdmin,
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
            <span
              className={`user-role-badge ${
                isSuperAdmin
                  ? 'badge-role-superadmin'
                  : isAdmin
                  ? 'badge-role-admin'
                  : 'badge-role-user'
              }`}
              style={{
                background: isSuperAdmin ? '#f3e8ff' : undefined,
                color: isSuperAdmin ? '#7e22ce' : undefined,
                border: isSuperAdmin ? '1px solid #d8b4fe' : undefined
              }}
            >
              {isSuperAdmin ? <Crown size={11} color="#9333ea" /> : isAdmin ? <Shield size={10} /> : <Eye size={10} />}
              {isSuperAdmin ? 'SUPER ADMIN' : isAdmin ? 'ADMINISTRATOR' : 'VIEWER (READ-ONLY)'}
            </span>
          )}
        </div>
        <h1>Creative Subscription Report</h1>
        <p>
          {isSuperAdmin
            ? 'Super Administrator control: provision all user roles, subscriptions, AI token budgets, and system data.'
            : isAdmin
            ? 'Administrator control: manage subscriptions, AI token allocations, email reminders, and viewer accounts.'
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
