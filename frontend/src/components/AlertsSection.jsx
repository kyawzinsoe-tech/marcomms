import React, { useState } from 'react';
import { AlertTriangle, Mail, Edit, CheckCircle2, Loader2 } from 'lucide-react';
import { formatDate } from '../utils/formatters';
import { sendEmailReminder } from '../services/emailService';

export function AlertsSection({ alerts, onEditSubscription, onNotify }) {
  const [sendingId, setSendingId] = useState(null);

  const handleSendReminder = async (sub, diff) => {
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
        onNotify(`Email reminder sent to ${res.recipient}!`, 'success');
      } else if (res.fallbackRequired) {
        const confirmOpen = window.confirm(
          'Automated backend email is not configured yet. Would you like to open your email client with a pre-filled reminder template?'
        );
        if (confirmOpen && res.mailtoUrl) {
          window.location.href = res.mailtoUrl;
          onNotify(`Opened email composer for ${res.recipient}`, 'info');
        }
      }
    } catch (err) {
      onNotify(err.message || 'Failed to dispatch email reminder', 'error');
    } finally {
      setSendingId(null);
    }
  };

  return (
    <section className="card alert-card" id="alerts">
      <div className="card-header">
        <div>
          <h2>
            <AlertTriangle size={20} color="#ef4444" />
            Subscription Due / Overdue Alerts
          </h2>
          <p>Expired subscriptions and renewals coming within the alert window.</p>
        </div>
        <div
          className={`count-pill ${alerts.length > 0 ? 'count-pill-danger' : 'count-pill-primary'}`}
        >
          {alerts.length} alert{alerts.length === 1 ? '' : 's'}
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <CheckCircle2 size={24} color="#10b981" />
          </div>
          <b>All subscriptions are up to date!</b>
          <p>No subscriptions are overdue or due for renewal in their configured alert windows.</p>
        </div>
      ) : (
        <div className="alert-list">
          {alerts.map(({ subscription: sub, type, diff }) => {
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
                    <b>Expiry:</b> {formatDate(sub.expiry)} &bull;{' '}
                    <b>Account:</b> {sub.email || '—'} &bull;{' '}
                    <b>Reminder Email:</b> {sub.reminderEmail || 'not set'} &bull;{' '}
                    <b>Alert Window:</b> {sub.alertDays ?? 7} days
                  </div>
                </div>

                <div className="alert-actions">
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={sendingId === sub.id}
                    onClick={() => handleSendReminder(sub, diff)}
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
                  >
                    <Edit size={13} /> Edit
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
