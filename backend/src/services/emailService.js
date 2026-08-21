const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

async function sendReminderEmail({ to, product, tool, expiry, status, account, days }) {
  if (!to) {
    throw new Error('Recipient email is required.');
  }

  const subject = `[Subscription Alert] ${product || 'Subscription'} — ${status || 'Reminder'}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
      <h2 style="color: #6366f1; margin-top: 0;">KBZ Marcomms — Creative Subscription Alert</h2>
      <p style="font-size: 16px;"><b>${product || 'Subscription'}</b> ${tool ? `— ${tool}` : ''}</p>
      <div style="background: #f8fafc; padding: 14px; border-radius: 8px; margin: 16px 0;">
        <p style="margin: 4px 0;"><strong>Status:</strong> <span style="color: ${days < 0 ? '#b91c1c' : '#b45309'}; font-weight: bold;">${status}</span></p>
        <p style="margin: 4px 0;"><strong>Expiry Date:</strong> ${expiry || '—'}</p>
        <p style="margin: 4px 0;"><strong>Account:</strong> ${account || '—'}</p>
      </div>
      <p style="color: #64748b; font-size: 13px;">Please review or renew this subscription inside the Creative Hub dashboard.</p>
    </div>
  `;

  // 1. Try Resend API if key is present
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.REMINDER_FROM_EMAIL || 'alerts@creativehub.com';

  if (resendApiKey) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [to],
          subject,
          html
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Resend email dispatch failed');
      }
      return { success: true, provider: 'resend', id: data.id };
    } catch (err) {
      console.error('[Email Service] Resend error:', err.message);
    }
  }

  // 2. Try AWS SES if access keys are present
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    try {
      const ses = new SESClient({ region: process.env.AWS_REGION || 'ap-southeast-1' });
      const command = new SendEmailCommand({
        Source: fromEmail,
        Destination: { ToAddresses: [to] },
        Message: {
          Subject: { Data: subject },
          Body: { Html: { Data: html } }
        }
      });
      const result = await ses.send(command);
      return { success: true, provider: 'aws-ses', messageId: result.MessageId };
    } catch (err) {
      console.error('[Email Service] AWS SES error:', err.message);
    }
  }

  // If neither provider configured, return simulation status
  console.log(`[Email Service] Simulated reminder to ${to}: ${subject}`);
  return {
    success: true,
    provider: 'simulation',
    message: `Simulated alert sent to ${to} (Configure RESEND_API_KEY or AWS SES for live delivery)`
  };
}

module.exports = { sendReminderEmail };
