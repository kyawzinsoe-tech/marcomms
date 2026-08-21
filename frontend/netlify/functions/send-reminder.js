exports.handler = async function (event) {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const data = JSON.parse(event.body || '{}');
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.REMINDER_FROM_EMAIL || 'onboarding@resend.dev';

    if (!apiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'RESEND_API_KEY environment variable is not configured in Netlify.'
        })
      };
    }

    if (!data.to) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Recipient email address ("to") is required.' })
      };
    }

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #eaeaea; border-radius: 8px; background-color: #ffffff;">
        <h2 style="color: #1e293b; margin-top: 0;">Creative Subscription Alert</h2>
        <div style="background-color: #f8fafc; border-left: 4px solid #3b82f6; padding: 12px 16px; margin: 16px 0;">
          <p style="margin: 0; font-size: 16px; font-weight: 600; color: #0f172a;">${data.product || 'Subscription'} — ${data.tool || ''}</p>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Status:</td>
            <td style="padding: 8px 0; font-weight: 600; color: ${data.days < 0 ? '#ef4444' : '#f59e0b'}; font-size: 14px;">${data.status || 'Due Soon'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Expiry Date:</td>
            <td style="padding: 8px 0; font-weight: 600; color: #1e293b; font-size: 14px;">${data.expiry || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Account Email:</td>
            <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">${data.account || '—'}</td>
          </tr>
        </table>
        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #eaeaea; font-size: 12px; color: #94a3b8;">
          This is an automated reminder from Creative Subscription Hub. Please review and renew this subscription.
        </div>
      </div>
    `;

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from,
        to: [data.to],
        subject: `[Subscription Alert] ${data.product || 'Subscription'} — ${data.status || 'Reminder'}`,
        html: htmlContent
      })
    });

    const result = await resendResponse.json();

    if (!resendResponse.ok) {
      return {
        statusCode: resendResponse.status,
        headers,
        body: JSON.stringify({ error: result.message || 'Email delivery failed' })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true, id: result.id })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Internal server error' })
    };
  }
};
