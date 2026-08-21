# Creative Subscription Dashboard v3

V2 features are preserved and V3 adds:
- Due / Overdue subscription dashboard alerts
- Configurable alert days before expiry
- Reminder email per subscription
- Send Email Alert button
- Netlify Function for Resend email sending
- Magnific Initial AI Token Allocation field when buying/adding a subscription
- Edit / Remove / Delete for subscriptions and token entries
- Monthly / Yearly PDF reports
- Usage Trend chart
- JSON backup/import
- Local realtime save
- Migration attempt from previous V2/V1 browser storage

## Email setup on Netlify
Add these Environment Variables:
- RESEND_API_KEY
- REMINDER_FROM_EMAIL

Then redeploy. Without them, Send Email Alert falls back to opening the user's email app with a prepared reminder.

Important: localStorage is still per browser/device. Fully automatic scheduled email reminders while nobody has the site open require a cloud database + scheduled backend job.
