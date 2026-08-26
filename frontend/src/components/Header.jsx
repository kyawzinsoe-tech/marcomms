import React from 'react';
import { Calendar, Printer, Sparkles, Crown, Shield, Eye } from 'lucide-react';

export function Header({
  activeSection = 'dashboard',
  reportMonth,
  onMonthChange,
  onPrintMonthly,
  onPrintYearly,
  user,
  isSuperAdmin,
  isAdmin
}) {
  const getHeaderInfo = () => {
    switch (activeSection) {
      case 'alerts':
        return {
          eyebrow: 'EXPIRATION & RENEWALS',
          title: 'Alert Center',
          desc: 'Monitor expiring subscriptions, upcoming renewals, and dispatch automated email reminders.',
          showMonthPicker: false,
          showPrint: false
        };
      case 'subscriptions':
        return {
          eyebrow: 'TOOL LICENSES & BILLING',
          title: 'Subscription Management',
          desc: isSuperAdmin
            ? 'Super Administrator control: manage tool licenses, renewal intervals, reminder alerts, and billing accounts.'
            : isAdmin
            ? 'Administrator control: manage creative tool subscriptions, plans, renewal schedules, and budget allocations.'
            : 'Read-only overview of active creative tool subscriptions, plans, and vendor accounts.',
          showMonthPicker: true,
          showPrint: true
        };
      case 'tokens':
        return {
          eyebrow: 'AI GENERATION & BURN RATE',
          title: 'AI Token Analytics',
          desc: isSuperAdmin
            ? 'Super Administrator control: monitor Magnific AI token allocations, generation records, daily burn trends, and project costs.'
            : isAdmin
            ? 'Administrator control: track AI token allotments, record generation entries, and inspect monthly burn rates.'
            : 'Read-only summary of Magnific AI token consumption and monthly usage trends.',
          showMonthPicker: true,
          showPrint: true
        };
      case 'reports':
        return {
          eyebrow: 'EXECUTIVE EXPORTS & BACKUPS',
          title: 'Reports & Data Management',
          desc: 'Generate official executive PDF/Print reports, inspect portfolio KPI analytics, and manage data backups.',
          showMonthPicker: true,
          showPrint: true
        };
      case 'dashboard':
      default:
        return {
          eyebrow: 'ALL-IN-ONE CREATIVE TOOLS',
          title: 'Executive Dashboard',
          desc: isSuperAdmin
            ? 'Super Administrator control: provision all user roles, subscriptions, AI token budgets, and system data.'
            : isAdmin
            ? 'Administrator control: manage subscriptions, AI token allocations, email reminders, and viewer accounts.'
            : 'Read-only overview of creative tool subscriptions, plans, and Magnific AI token usage.',
          showMonthPicker: true,
          showPrint: true
        };
    }
  };

  const headerInfo = getHeaderInfo();

  return (
    <header className="topbar">
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <span className="eyebrow">
            <Sparkles size={13} /> {headerInfo.eyebrow}
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
            >
              {isSuperAdmin ? <Crown size={11} color="#9333ea" /> : isAdmin ? <Shield size={10} /> : <Eye size={10} />}
              {isSuperAdmin ? 'SUPER ADMIN' : isAdmin ? 'ADMINISTRATOR' : 'VIEWER (READ-ONLY)'}
            </span>
          )}
        </div>
        <h1>{headerInfo.title}</h1>
        <p>{headerInfo.desc}</p>
      </div>

      <div className="header-controls">
        {headerInfo.showMonthPicker && (
          <label className="month-picker-label">
            <span>Report Month</span>
            <input
              type="month"
              value={reportMonth}
              onChange={(e) => onMonthChange(e.target.value)}
            />
          </label>
        )}

        {isAdmin && headerInfo.showPrint && (
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
