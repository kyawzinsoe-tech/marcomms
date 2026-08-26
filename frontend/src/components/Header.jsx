import React from 'react';
import { Calendar, Printer, Sparkles, Crown, Shield, Eye, Search, Sun, Moon } from 'lucide-react';

export function Header({
  activeSection = 'dashboard',
  reportMonth,
  onMonthChange,
  onPrintMonthly,
  onPrintYearly,
  onOpenCommandPalette,
  theme = 'light',
  onToggleTheme,
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
      case 'kbz-bank':
        return {
          eyebrow: 'BRAND IDENTITY & GUIDELINES',
          title: 'KBZ Bank Brand Assets',
          desc: 'Official vector logomarks, typography specifications, key visuals, and marketing collateral templates.',
          showMonthPicker: false,
          showPrint: false
        };
      case 'kbz-pay':
        return {
          eyebrow: 'DIGITAL WALLET & APP ASSETS',
          title: 'KBZPay Brand Assets',
          desc: 'Mobile application icon sets, merchant partner lockups, digital campaign banners, and UX design systems.',
          showMonthPicker: false,
          showPrint: false
        };
      case 'kbz-comms':
        return {
          eyebrow: 'CORPORATE COMMUNICATIONS & PR',
          title: 'KBZBank Comms Brand Assets',
          desc: 'Official press kit lockups, media releases, executive announcements, and public relations design materials.',
          showMonthPicker: false,
          showPrint: false
        };
      case 'suppliers':
        return {
          eyebrow: 'PROCUREMENT & FABRICATION',
          title: 'Procurement Supplier Directory',
          desc: 'Master directory of approved printing houses, merchandise fabricators, POSM production vendors, and agencies.',
          showMonthPicker: false,
          showPrint: false
        };
      case 'production-orders':
        return {
          eyebrow: 'FABRICATION & QUALITY CONTROL',
          title: 'Production Orders Matrix',
          desc: 'Purchase orders tracker, print specifications, fabrication milestones, and Head of Brand sample proof sign-offs.',
          showMonthPicker: false,
          showPrint: false
        };
      case 'user-management':
        return {
          eyebrow: 'SECURITY & RBAC GOVERNANCE',
          title: 'User Management & Active Sessions',
          desc: isSuperAdmin
            ? 'Super Administrator governance: provision 8-tier RBAC accounts, assign specialist roles, and monitor active sessions.'
            : 'Administrator control: manage Viewer accounts and inspect user access roles.',
          showMonthPicker: false,
          showPrint: false
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
        {/* Global Omnisearch / Command Palette Trigger */}
        <button
          type="button"
          className="search-trigger-btn"
          onClick={onOpenCommandPalette}
          title="Open command palette and global omnisearch (⌘K)"
          aria-label="Search or jump to (Cmd+K)"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '7px 12px',
            background: 'var(--bg-surface-secondary, #f1f5f9)',
            border: '1px solid var(--border-default, #e2e8f0)',
            borderRadius: '8px',
            color: 'var(--text-muted, #64748b)',
            fontSize: '12.5px',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <Search size={14} color="var(--primary, #6366f1)" />
          <span>Search or jump to...</span>
          <kbd
            style={{
              padding: '1px 5px',
              fontSize: '10.5px',
              fontWeight: 700,
              background: 'var(--bg-surface, #ffffff)',
              border: '1px solid var(--border-default, #cbd5e1)',
              borderRadius: '4px',
              color: 'var(--text-secondary, #475569)',
              marginLeft: '4px'
            }}
          >
            ⌘K
          </kbd>
        </button>

        {/* Client-Side Dark/Light Theme Switcher */}
        {onToggleTheme && (
          <button
            type="button"
            className="btn btn-soft theme-toggle-btn"
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            aria-label="Toggle dark/light theme"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '7px 10px',
              gap: '6px',
              fontSize: '12px',
              borderRadius: '8px'
            }}
          >
            {theme === 'dark' ? (
              <>
                <Sun size={15} color="#f59e0b" />
                <span style={{ fontSize: '11.5px', fontWeight: 600 }}>Light</span>
              </>
            ) : (
              <>
                <Moon size={15} color="#6366f1" />
                <span style={{ fontSize: '11.5px', fontWeight: 600 }}>Dark</span>
              </>
            )}
          </button>
        )}

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
