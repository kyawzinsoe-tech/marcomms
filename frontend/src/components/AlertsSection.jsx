import React, { useState, useMemo } from 'react';
import { AlertTriangle, Mail, Edit, CheckCircle2, Loader2, Calendar, User, Clock, AlertCircle, Filter } from 'lucide-react';
import { formatDate } from '../utils/formatters';
import { sendEmailReminder } from '../services/emailService';

export function AlertsSection({ alerts = [], isAdmin = true, onEditSubscription, onNotify }) {
  const [sendingId, setSendingId] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'overdue' | 'due'

  // Prioritize alerts: Overdue first (descending by days overdue), then Due Soon (ascending by days until due)
  const prioritizedAlerts = useMemo(() => {
    const sorted = [...alerts].sort((a, b) => {
      const aIsOverdue = a.type === 'overdue';
      const bIsOverdue = b.type === 'overdue';

      if (aIsOverdue && !bIsOverdue) return -1;
      if (!aIsOverdue && bIsOverdue) return 1;

      if (aIsOverdue && bIsOverdue) {
        // Both overdue: larger absolute diff (more days overdue) comes first
        return Math.abs(b.diff) - Math.abs(a.diff);
      }

      // Both due soon: smaller diff (closer to expiry) comes first
      return a.diff - b.diff;
    });

    if (activeTab === 'overdue') {
      return sorted.filter((item) => item.type === 'overdue');
    }
    if (activeTab === 'due') {
      return sorted.filter((item) => item.type === 'due');
    }
    return sorted;
  }, [alerts, activeTab]);

  const overdueCount = useMemo(() => alerts.filter((a) => a.type === 'overdue').length, [alerts]);
  const dueCount = useMemo(() => alerts.filter((a) => a.type === 'due').length, [alerts]);

  const handleSendReminder = async (sub, diff) => {
    if (!isAdmin) return;
    const targetEmail = sub.reminderEmail || sub.email;
    if (!targetEmail) {
      onNotify('Please specify a reminder or account email first.', 'error');
      onEditSubscription(sub);
      return;
    }

    setSendingId(sub.id);
    try {
      const res = await sendEmailReminder(sub, diff);
      if (res.success) {
        onNotify(res.message || `Email reminder sent to ${res.recipient}!`, 'success');
      }
    } catch (err) {
      onNotify(err.message || 'Failed to dispatch email reminder', 'error');
    } finally {
      setSendingId(null);
    }
  };

  return (
    <section className="card alert-card" id="alerts" aria-label="Subscription Expiration & Renewal Alerts">
      <div className="card-header">
        <div>
          <h2>
            <AlertTriangle size={18} className="alert-header-icon" />
            Subscription Due / Overdue Alerts
          </h2>
          <p>
            {isAdmin
              ? 'Expired subscriptions and renewals coming due within configured alert windows.'
              : 'Overview of subscriptions currently due or overdue for renewal.'}
          </p>
        </div>
        <div className="alert-header-summary">
          {overdueCount > 0 && (
            <span className="alert-summary-pill danger" title={`${overdueCount} expired subscription(s)`}>
              <AlertCircle size={13} /> {overdueCount} Overdue
            </span>
          )}
          {dueCount > 0 && (
            <span className="alert-summary-pill warning" title={`${dueCount} upcoming renewal(s)`}>
              <Clock size={13} /> {dueCount} Due Soon
            </span>
          )}
          <span className="count-pill count-pill-primary">
            {alerts.length} total alert{alerts.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="alert-filter-tabs" role="tablist" aria-label="Alert filter tabs">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'all'}
            className={`alert-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All Alerts ({alerts.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'overdue'}
            className={`alert-tab-btn tab-overdue ${activeTab === 'overdue' ? 'active' : ''}`}
            onClick={() => setActiveTab('overdue')}
          >
            Overdue Only ({overdueCount})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'due'}
            className={`alert-tab-btn tab-due ${activeTab === 'due' ? 'active' : ''}`}
            onClick={() => setActiveTab('due')}
          >
            Due Soon Only ({dueCount})
          </button>
        </div>
      )}

      {alerts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <CheckCircle2 size={24} color="#10b981" />
          </div>
          <b>All subscriptions are up to date!</b>
          <p>No subscriptions are overdue or due for renewal in their configured alert windows.</p>
        </div>
      ) : prioritizedAlerts.length === 0 ? (
        <div className="empty-state" style={{ padding: '24px 16px' }}>
          <b>No alerts in this category</b>
          <p>There are no {activeTab === 'overdue' ? 'overdue' : 'due soon'} subscriptions right now.</p>
        </div>
      ) : (
        <div className="alert-list">
          {prioritizedAlerts.map(({ subscription: sub, type, diff }) => {
            const isOverdue = type === 'overdue';
            const badgeLabel = isOverdue
              ? `${Math.abs(diff)} day${Math.abs(diff) === 1 ? '' : 's'} overdue`
              : `Due in ${diff} day${diff === 1 ? '' : 's'}`;

            return (
              <div
                key={sub.id}
                className={`alert-item ${isOverdue ? 'alert-overdue' : 'alert-due'}`}
              >
                <div className="alert-item-info">
                  <div className="alert-title-row">
                    <span className="alert-item-title">
                      {sub.product} {sub.tool ? `— ${sub.tool}` : ''}
                    </span>
                    <span className={`alert-badge ${isOverdue ? 'overdue' : 'due'}`}>
                      {badgeLabel}
                    </span>
                  </div>
                  <div className="alert-meta">
                    <span className="alert-meta-item">
                      <Calendar size={12} />
                      <b>Expiry:</b> {formatDate(sub.expiry)}
                    </span>
                    <span className="alert-meta-item">
                      <User size={12} />
                      <b>Account:</b> {sub.email || '—'}
                    </span>
                    {sub.reminderEmail && (
                      <span className="alert-meta-item">
                        <Mail size={12} />
                        <b>Reminder:</b> {sub.reminderEmail}
                      </span>
                    )}
                    <span className="alert-meta-item">
                      <Clock size={12} />
                      <b>Alert Window:</b> {sub.alertDays ?? 7}d
                    </span>
                  </div>
                </div>

                {isAdmin && (
                  <div className="alert-actions">
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={sendingId === sub.id}
                      onClick={() => handleSendReminder(sub, diff)}
                      title={`Send email reminder to ${sub.reminderEmail || sub.email || 'account holder'}`}
                      aria-label={`Send email reminder for ${sub.product}`}
                    >
                      {sendingId === sub.id ? (
                        <>
                          <Loader2 size={13} className="animate-spin" /> Sending...
                        </>
                      ) : (
                        <>
                          <Mail size={13} /> Send Email Alert
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => onEditSubscription(sub)}
                      title="Edit subscription details and reminder settings"
                      aria-label={`Edit ${sub.product}`}
                    >
                      <Edit size={13} /> Edit
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
