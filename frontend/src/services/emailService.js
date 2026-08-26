import { getAuthToken } from './authService';
import { handleApiResponse } from './api';

/**
 * Dispatches an automated subscription renewal reminder email via the backend API & AWS SES.
 *
 * @param {Object} subscription - Subscription object
 * @param {number} daysDiff - Days remaining until expiry (negative if overdue)
 * @returns {Promise<{success: boolean, recipient: string, message: string}>}
 */
export async function sendEmailReminder(subscription, daysDiff) {
  const recipient = (subscription.reminderEmail || subscription.email || '').trim();
  if (!recipient) {
    throw new Error('Please configure an account or reminder email for this subscription first.');
  }

  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required. Please sign in to dispatch reminder emails.');
  }

  const statusText = daysDiff < 0 ? 'Overdue' : 'Due Soon';
  const payload = {
    to: recipient,
    product: subscription.product || 'Subscription',
    tool: subscription.tool || '',
    expiry: subscription.expiry || '',
    status: subscription.status || statusText,
    account: subscription.email || '—',
    days: Number(daysDiff),
    subscriptionId: subscription.id || subscription._id || undefined
  };

  const response = await fetch('/api/reminders/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  }).then(handleApiResponse);

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'Failed to dispatch automated email reminder via backend.');
  }

  return {
    success: true,
    recipient,
    message: data.message || `Subscription renewal reminder sent to ${recipient}`
  };
}
