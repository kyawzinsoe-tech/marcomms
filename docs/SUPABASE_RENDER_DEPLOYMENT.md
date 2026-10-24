# Marcomms production deployment

## Supabase Storage

1. Create a project and a **private** bucket named `marcomms-assets`.
2. Copy the Project URL and server-only service role key into Render environment variables.
3. Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser or commit it to Git.

The application validates authentication, role permission, MIME type, byte size, and PNG/JPEG file signature before sending an object to the private bucket. Downloads use five-minute signed URLs.

## Render

Create a Blueprint from this repository and select `render.yaml`. Supply:

- `MONGODB_URI`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY` when email reminders are enabled

Render generates the JWT and credential-encryption secrets. After the first deployment, test `/api/health`, authentication, Drive-linked assets, direct image upload, preview, download, edit, and remove before sharing the production URL.
