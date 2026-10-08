# New Era Mail

The admin Mail module uses the existing New Era admin session and server-side IMAP/SMTP connections. No mailbox credentials are exposed to the browser.

## Environment

Set these in local/Vercel environment variables (never commit real values):

- `MAIL_IMAP_HOST`
- `MAIL_IMAP_PORT` (default `993`)
- `MAIL_IMAP_SECURE` (default `true`)
- `MAIL_IMAP_USER`
- `MAIL_IMAP_PASSWORD`
- `MAIL_IMAP_INBOX` (default `INBOX`)
- `MAIL_IMAP_SENT` (default `Sent`)
- `MAIL_IMAP_DRAFTS` (default `Drafts`)
- `MAIL_IMAP_TRASH` (default `Trash`)
- `MAIL_IMAP_TIMEOUT_MS` (default `15000`)
- `MAIL_SMTP_HOST`
- `MAIL_SMTP_PORT` (default `465`)
- `MAIL_SMTP_SECURE` (default `true`)
- `MAIL_SMTP_USER`
- `MAIL_SMTP_PASSWORD`
- `MAIL_FROM_NAME` (default `New Era`)
- `MAIL_FROM_ADDRESS`
- `MAIL_MAX_ATTACHMENT_MB` (default `25`)
- `MAIL_SYNC_PAGE_SIZE` (default `20`)

The `.env.example` contains placeholders only. Existing local `.env` / `.env.local` files must stay outside source control.

## Database

Migration: `20261008130000_add_mail_module`

It adds private draft storage, IMAP metadata and CRM-linked email communication history. Draft attachment bytes are stored in PostgreSQL so private email attachments are not exposed as public object-storage URLs.

## Architecture

- `/admin/mail` — admin Mail UI
- `src/lib/mail/imap.ts` — short-lived IMAP connections and MIME parsing
- `src/lib/mail/smtp.ts` — server-side SMTP sending
- `src/lib/mail/service.ts` — mailbox/application service
- `src/lib/mail/db.ts` — SQL-backed local mail metadata/draft storage
- `src/lib/mail/sanitize.ts` — server-side HTML sanitization
- `/api/admin/mail/*` — authenticated mail APIs

IMAP remains the mailbox source of truth. Vercel/serverless requests open and close IMAP connections instead of keeping a permanent connection alive.
