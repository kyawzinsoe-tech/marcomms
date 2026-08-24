const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

/**
 * Simple email validation
 */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Escape HTML for safe email rendering
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generates plain text version of renewal reminder email
 */
function generatePlainTextEmail({ product, tool, expiry, status, account, days }) {
  const urgency = Number(days) < 0
    ? `OVERDUE by ${Math.abs(Number(days))} day(s)`
    : `Due in ${days} day(s)`;

  return `KBZ Marcomms — Creative Subscription Renewal Reminder

Subscription: ${product || 'Subscription'} ${tool ? `(${tool})` : ''}
Status: ${status || 'Pending Renewal'} (${urgency})
Expiry / Renewal Date: ${expiry || 'Not specified'}
Account Email: ${account || 'Not specified'}

This is an automated reminder to review and renew this creative subscription inside the Creative Subscription Hub dashboard.

Please take necessary renewal actions before service disruption.
`;
}

/**
 * Generates HTML version of renewal reminder email
 */
function generateHtmlEmail({ product, tool, expiry, status, account, days }) {
  const isOverdue = Number(days) < 0;
  const badgeColor = isOverdue ? '#dc2626' : '#d97706';
  const badgeBg = isOverdue ? '#fef2f2' : '#fffbeb';
  const statusBadgeText = isOverdue
    ? `OVERDUE (${Math.abs(Number(days))} days overdue)`
    : `Due Soon (in ${days} days)`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Subscription Renewal Reminder</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #1e293b;">
  <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <div style="background: #0f172a; padding: 24px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.025em;">KBZ Marcomms Creative Hub</h1>
      <p style="color: #94a3b8; margin: 6px 0 0 0; font-size: 13px;">Automated Subscription Alert</p>
    </div>
    
    <div style="padding: 28px 24px;">
      <div style="margin-bottom: 20px;">
        <span style="display: inline-block; background-color: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${badgeColor}33; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 700; text-transform: uppercase;">
          ${statusBadgeText}
        </span>
      </div>

      <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 18px; font-weight: 600;">
        Subscription Renewal Reminder — ${escapeHtml(product || 'Subscription')}
      </h2>

      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
        This is an automated alert from the Creative Subscription Hub. The following subscription requires administrative review or renewal.
      </p>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 13px; font-weight: 600; width: 35%;">Product / Service</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-size: 14px; font-weight: 600;">
            ${escapeHtml(product || '—')} ${tool ? `<span style="color: #64748b; font-weight: normal;">(${escapeHtml(tool)})</span>` : ''}
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 13px; font-weight: 600;">Expiry Date</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-size: 14px; font-weight: 600;">
            ${escapeHtml(expiry || '—')}
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 13px; font-weight: 600;">Account Email</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-size: 14px; font-family: monospace;">
            ${escapeHtml(account || '—')}
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; color: #64748b; font-size: 13px; font-weight: 600;">Current Status</td>
          <td style="padding: 12px 16px; color: #0f172a; font-size: 14px; font-weight: 600;">
            ${escapeHtml(status || 'Active')}
          </td>
        </tr>
      </table>

      <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px 16px; border-radius: 4px; margin-bottom: 24px;">
        <p style="margin: 0; font-size: 13px; color: #1e40af; line-height: 1.5;">
          <strong>Action Required:</strong> Please verify the billing details and renew the subscription inside the dashboard to prevent service interruption.
        </p>
      </div>
    </div>

    <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; text-align: center;">
      <p style="margin: 0; color: #94a3b8; font-size: 12px;">
        Sent automatically by KBZ Marcomms Creative Subscription Hub. Please do not reply directly to this automated email.
      </p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Sends automated subscription reminder email via Amazon SES
 * Uses Lambda IAM Execution Role / default AWS credential provider chain.
 */
async function sendReminderEmail({ to, product, tool, expiry, status, account, days }) {
  const cleanTo = (to || '').trim();
  if (!cleanTo || !isValidEmail(cleanTo)) {
    throw new Error('A valid recipient email address is required.');
  }

  const fromEmail = (process.env.REMINDER_FROM_EMAIL || '').trim();
  if (!fromEmail) {
    throw new Error('REMINDER_FROM_EMAIL environment variable is not configured on the server.');
  }

  const region = process.env.AWS_REGION || 'us-east-1';
  const subject = `Subscription Renewal Reminder — ${product || 'Subscription'}`;
  const htmlBody = generateHtmlEmail({ product, tool, expiry, status, account, days });
  const textBody = generatePlainTextEmail({ product, tool, expiry, status, account, days });

  // Initialize SES Client using default credential provider chain (IAM Role / Lambda environment)
  const sesClient = new SESClient({ region });

  const command = new SendEmailCommand({
    Source: fromEmail,
    Destination: {
      ToAddresses: [cleanTo]
    },
    Message: {
      Subject: {
        Data: subject,
        Charset: 'UTF-8'
      },
      Body: {
        Html: {
          Data: htmlBody,
          Charset: 'UTF-8'
        },
        Text: {
          Data: textBody,
          Charset: 'UTF-8'
        }
      }
    }
  });

  try {
    const result = await sesClient.send(command);
    console.log(`[SES Email Service] Email successfully sent to ${cleanTo}. MessageId: ${result.MessageId}`);
    return {
      success: true,
      provider: 'aws-ses',
      messageId: result.MessageId
    };
  } catch (err) {
    // Log server-side for troubleshooting without leaking credentials
    console.error('[SES Email Service] SES delivery failure:', {
      errorName: err.name,
      errorMessage: err.message,
      recipient: cleanTo,
      from: fromEmail,
      region
    });

    // Provide safe, descriptive error message
    if (err.name === 'MessageRejected' || err.message?.includes('not verified')) {
      throw new Error(
        'Email delivery rejected by Amazon SES. Please ensure the sender address is verified in AWS SES, and recipient is verified if in SES Sandbox.'
      );
    }

    if (err.name === 'AccessDeniedException' || err.name === 'AccessDenied') {
      throw new Error(
        'AWS SES permission denied. Please verify that the Lambda execution role has ses:SendEmail permissions.'
      );
    }

    throw new Error('Failed to deliver subscription email alert via Amazon SES.');
  }
}

module.exports = { sendReminderEmail, isValidEmail };

