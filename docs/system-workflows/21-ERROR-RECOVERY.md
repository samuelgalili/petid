# 21 — Error and Recovery Workflows

## Patterns the codebase already uses well

| Pattern | Where |
|---|---|
| Events never break the business path | `emitEvent` swallows and logs |
| Recommendations degrade to none | `resolveCatalogProducts` returns `[]` on a query failure — "the assistant's answer is still useful without product cards; a 500 is not" |
| Email failure does not fail signup | `sendEmail` → `{sent:false, reason}` |
| Provider timeout is explicit | `AbortController`, 45 s, mapped to a typed error |
| Delivery retry with capped backoff | outbox: 10 s → 2 h, 8 attempts |
| Concurrent dispatchers are safe | `FOR UPDATE SKIP LOCKED` |
| Idempotent accounting | on the caller's `request_id` |
| Boot recovery for interrupted jobs | `resumePetCharacterJobs()` re-queues anything left `generating_*` |
| Rollback on file/DB mismatch | uploads unlink the file if the insert fails; character generation deletes new files on rollback |
| Migration rehearsal | the deploy dry-runs migrations on a restored `pg_dump` copy before touching production |

These are not accidental. They should be the template for everything below.

---

## Per-workflow failure matrix

### Signup / login
| Case | Behaviour | Status |
|---|---|---|
| Duplicate email | rejected | ✅ |
| Email provider down | account created, mail unsent, resend available | ✅ |
| Brute force | per-IP fixed window (20/15 min); in-memory only | 🟡 |
| Session expired | 401 → client redirect | ✅ |
| Lockout | none | ❌ |

### Pet character generation
| Case | Behaviour | Status |
|---|---|---|
| AI not configured | 503 with a clear code; the UI shows an amber banner and disables the button | ✅ |
| Concurrent start | 409 "already in progress" | ✅ |
| Reference photos unusable | typed error `INVALID_REFERENCE_PHOTOS`, surfaced in Hebrew | ✅ |
| Face-only photo | typed error `REFERENCE_PHOTOS_FACE_ONLY` | ✅ |
| Provider returns no image / wrong type | `NO_GENERATED_IMAGE` | ✅ |
| Pack drifts from the master | one validated retry, then `INCONSISTENT_CHARACTER_PACK` | ✅ |
| Container restarts mid-job | `resumePetCharacterJobs()` on boot | ✅ |
| Job wedges without crashing | **no timeout** — status stays `generating_*` forever | ❌ |
| Regeneration after a failure | reuses the retained `identity_image_key` so the owner need not still have the photo | ✅ |

The one gap is a stuck-job timeout. Everything else in this flow is the best
error handling in the codebase.

### Orders and payments
| Case | Behaviour | Status |
|---|---|---|
| Invalid payment method / installments / order type | 400, allowlisted | ✅ |
| Unverified email | 403 `email_verification_required` | ✅ |
| CardCom unreachable | `UNKNOWN` — not verified in this audit |
| Webhook replay | recorded in `cardcom_events`; whether the handler is idempotent is `UNKNOWN` |
| Webhook with a bad secret | rejected (`secretsEqual`) | ✅ |
| Duplicate order POST | no idempotency key found | ❌ |
| Stock changed between cart and order | no inventory quantity exists | ❌ |
| Refund | not modelled | ❌ |

### Uploads and media
| Case | Behaviour | Status |
|---|---|---|
| Too large | 413 before buffering the whole body (limit is 1.5× the max) | ✅ |
| Type mismatch | 415 by magic bytes | ✅ |
| DB insert fails after write | file unlinked | ✅ |
| Post creation fails after upload | **orphaned row + file, no cleanup** | ❌ |
| Post deleted | **upload row and file remain** | ❌ |
| Disk full | `UNKNOWN` — writes would fail; no monitoring found |

### Feed and social
| Case | Behaviour |
|---|---|
| Someone else's upload or pet | 404, verified before insert ✅ |
| Private post fetched by id | 404, not 403 ✅ |
| Deleted comment | soft `status='deleted'` ✅ |
| Reported content | recorded, **never reviewed** ❌ |

### AI
| Case | Behaviour |
|---|---|
| Timeout | typed, 45 s |
| Rate limit / auth / server error | `classifyProviderError` |
| Empty response | 502 |
| Message leakage | sanitised at construction |
| Crash after provider success, before accounting | retry is idempotent on `request_id` ✅ |

---

## The journeys the brief asks about

| | Journey | Outcome today |
|---|---|---|
| A | First-time user, one dog | ✅ works |
| B | Second pet | ✅ works; owner-level data is not re-asked |
| C | Upload a vet document | 🟡 stored; nothing is learned from it |
| D | Start a walk | ❌ no such feature |
| E | Discover and check into a park | ❌ no such feature |
| F | Create a Moment | ✅ works |
| G | Open the store | 🟡 works, but shows unreviewed scraper rows |
| H | Mipo recommends a product | 🟡 chat only, resolved against the catalogue |
| I | Buy | ✅ works |
| J | Reorder | 🟡 `auto-restock` is stored; nothing acts on it |
| K | Multiple pets | ✅ `PetPreferenceContext` + `useActivePet` |
| L | Location permission denied | ✅ handled in `useLocation`; nothing depends on it |
| M | Camera permission denied | 🟡 file picker fallback; not verified |
| N | Incomplete pet info | ✅ everything but name/type is optional |
| O | Conflicting medical info | ❌ **no conflict model at all** — see `05` |
| P | Delete a pet | ⚠️ succeeds, and silently orphans documents, bookings, claims and Moments (`SET NULL`). No warning, no summary of what will happen |
| Q | Delete the account | ✅ well built — export, file cleanup, order anonymisation |

Journeys O and P are the two that need a product decision before code.

---

## Recovery gaps to close, in order

1. **Job timeouts.** Any status that means "in progress" needs a maximum age
   and an automatic transition to `failed`. Today only pet characters can wedge;
   with walks and document processing there would be three.
2. **Media reference counting.** Uploads outlive the things that referenced
   them, on a host with finite disk and no media backup.
3. **Order idempotency.** A key on creation; a retried POST returns the
   existing order.
4. **Pet deletion semantics.** Decide, then either cascade or refuse — silence
   is the wrong answer.
5. **A moderation path.** Reports are collected and nothing can act on them.
