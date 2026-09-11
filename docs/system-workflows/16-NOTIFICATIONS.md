# 16 — Notifications

## Status: `PARTIALLY IMPLEMENTED` — an inbox with nothing writing to it

### What exists

`notifications` table (11 cols: `user_id`, `type`, `category`, `title`,
`message`, `data` jsonb, `action_url`, `is_read`, timestamps) and five routes:

```
GET    /api/me/notifications
POST   /api/me/notifications
GET    /api/me/notifications/unread-count
PATCH  /api/me/notifications/read-all
PATCH  /api/me/notifications/:id
```

All `requireUser`, all scoped by `user_id`.

### The finding

`createUserNotification` is called from **exactly one place**:
`POST /api/me/notifications` (`server/src/index.js:7811`), where the caller is
the recipient. Every other candidate producer — order status changes, payment
results, vaccination expiry, QR scans, comments on your Moment — writes
**nothing** to `notifications`.

So the inbox is a place where a user can post a note to themselves. There is no
system-generated notification anywhere in the product.

`/admin/notifications` is the same story in the other direction:
`useAdminNotifications` (`src/hooks/useAdminNotifications.ts`) is a hook with
`useState<AdminAlert[]>([])` and no fetch. The screen renders an empty inbox by
construction.

---

## Channels

| Channel | Status | Evidence |
|---|---|---|
| In-app | `EXISTS` | table + routes above |
| Email | `NEEDS EXTENSION` | Resend (`server/src/index.js:103,1194,1244`). Used for **two** things: password reset and email verification. No order confirmation, no receipt. |
| Web Push | `PARTIALLY IMPLEMENTED` | see below |
| WhatsApp | `MISSING` | `WAREHOUSE_WHATSAPP_NUMBER` is an operations phone number in the SSM optional keys, not a messaging integration |
| SMS | `MISSING` | no provider, no code |

### Web Push: a handler with no subscriber and no sender

`src/sw.ts` registers `push` (line 83) and `notificationclick` (line 119)
listeners. But searching `src/`:

- no `pushManager.subscribe`
- no VAPID public key
- no `push_subscriptions` table in any of the 53 tables
- no server-side push send anywhere in `server/src/`

The service worker will handle a push it can never receive. Every layer except
the handler is missing.

### Email is doing less than it looks
`sendEmail` returns `{ sent: false, reason: "not_configured" }` when
`RESEND_API_KEY` is absent, and the calling flow proceeds. A signup succeeds
whether or not the verification mail went out — deliberate, with a comment
saying the account exists either way and an unsent email is a resend away. That
is good design. It also means a silent email outage is invisible unless someone
watches the logs.

---

## Target workflow (PROPOSED)

```
EVENT (outbox_events — already exists, 18)
   │
Eligibility        does this event type produce a notification at all?
   │
Preference check   per-user, per-category, per-channel        ← table MISSING
   │
Privacy check      quiet hours, marketing consent             ← partly exists
   │
Decision           which channels, or none
   │
   ├──► in-app      insert notifications          ← works today
   ├──► push        send to subscriptions         ← MISSING end to end
   ├──► email       Resend                        ← exists, barely used
   └──► WhatsApp    provider                      ← MISSING
   │
Tracking           sent / delivered / opened / clicked        ← MISSING
```

### Consent primitives that already exist

| Signal | Column |
|---|---|
| Marketing consent + date + method | `profiles.marketing_consent`, `marketing_consent_date`, `consent_method` |
| Unsubscribe | `profiles.marketing_unsubscribed_at`, plus `marketing_opt_out_log` (5 cols) |
| Quiet mode | `profiles.quiet_mode_until` |
| Activity visibility | `profiles.show_activity_status` |
| AI consent | `profiles.ai_consent_given`, `ai_consent_date` |

Marketing consent is modelled properly, including an opt-out audit log. What is
missing is **transactional vs marketing separation** and per-category
preferences: nothing distinguishes "your order shipped" (must send) from "20%
off treats" (consent required).

### Schema additions required (PROPOSED)
```
notification_preferences   user_id, category, channel, enabled, updated_at
push_subscriptions         user_id, endpoint, p256dh, auth, user_agent,
                           created_at, last_seen_at, failed_at
notification_deliveries    notification_id, channel, status, provider_message_id,
                           sent_at, delivered_at, opened_at, error
```

### Sequencing note
The natural producer is `outbox_events`, which already records the right
moments transactionally. Wiring notifications to the outbox instead of
scattering `insert into notifications` through business code is the difference
between a notification system and 40 call sites. That makes `18` a prerequisite
for `16`, not a parallel effort.

**Do not build a scheduler for this yet.** See `25` — there is no durable job
runner, and vaccination reminders (the obvious first scheduled notification)
need one.
