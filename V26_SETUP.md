# New Era V26 — Hero control + verified client authentication

## 1. Database
Run:

```bash
npx prisma migrate dev --name add_verified_contacts_and_site_settings
npx prisma generate
```

A migration is already included under `prisma/migrations/20260929133000_add_verified_contacts_and_site_settings/`.

## 2. Email verification
Set:

```env
RESEND_API_KEY="re_..."
EMAIL_FROM="New Era <noreply@thenewera.space>"
```

The `EMAIL_FROM` address/domain must be configured and verified with the email provider.

## 3. SMS verification
For phone registration/login, set Twilio credentials:

```env
TWILIO_ACCOUNT_SID="AC..."
TWILIO_AUTH_TOKEN="..."
TWILIO_PHONE_NUMBER="+1..."
```

The phone number must be able to receive SMS through the configured Twilio account.

## 4. Homepage hero
Admin → Homepage lets an admin upload a JPG/PNG/WebP. The browser optimizes it to WebP (max 2400×1400) and stores it as the homepage site setting in PostgreSQL. The public homepage reads the setting at request time, so no rebuild is required.

If `ADMIN_PANEL_KEY` is set, enter the same value in Admin → Homepage before saving the image. If an ADMIN user session exists, the admin role is accepted as well.

## 5. Authentication behavior
Clients must verify either their email or phone number before a session is created. Login accepts either verified email or verified phone + password.

A syntactically valid but nonexistent email cannot activate an account because the verification code must be delivered to that address.
