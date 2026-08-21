export async function sendEmailReminder(subscription, daysDiff) {
  const recipient = subscription.reminderEmail || subscription.email;
  if (!recipient) {
    throw new Error('No recipient email specified for this subscription.');
  }

  const statusText = daysDiff < 0 ? 'Overdue' : 'Due Soon';
  const payload = {
    to: recipient,
    product: subscription.product,
    tool: subscription.tool,
    expiry: subscription.expiry,
    status: statusText,
    account: subscription.email || '—',
    days: daysDiff
  };

  try {
    const response = await fetch('/.netlify/functions/send-reminder', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Serverless email function failed');
    }

    return { success: true, mode: 'server', recipient };
  } catch (error) {
    // If backend / Netlify serverless is not reachable or not configured, offer mailto fallback
    return {
      success: false,
      fallbackRequired: true,
      error: error.message,
      recipient,
      mailtoUrl: getMailtoUrl(subscription, statusText, recipient)
    };
  }
}

export function getMailtoUrl(subscription, statusText, recipient) {
  const subject = `[Subscription Alert] ${subscription.product} — ${statusText}`;
  const body = `Subscription: ${subscription.product} — ${subscription.tool}\n` +
    `Expiry Date: ${subscription.expiry || 'N/A'}\n` +
    `Status: ${statusText}\n` +
    `Account: ${subscription.email || '—'}\n\n` +
    `Please review and renew this creative subscription.`;

  return `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
