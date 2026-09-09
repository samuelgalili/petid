# 25 — Background Jobs

## Status: `PARTIALLY IMPLEMENTED` — two in-process loops, no job system

Searching `server/src/` for asynchronous machinery yields exactly two things.

### 1. Outbox dispatcher — `EXISTS`, idle
```js
const timer = setInterval(() => { tick().catch(() => {}); }, intervalMs);
if (typeof timer.unref === "function") timer.unref();
```

| Property | Value |
|---|---|
| Trigger | `setInterval`, default 5,000 ms, started in `server.listen` |
| Queue | `outbox_events` table |
| Claim | `UPDATE … FOR UPDATE SKIP LOCKED` — two dispatchers cannot double-deliver |
| Worker | the API process itself |
| Retry | `[10s, 60s, 5m, 30m, 2h]`, last repeats |
| Max attempts | 8, then `status = 'failed'` |
| Dead letter | the `failed` status. **Nothing reads it.** |
| Idempotency | per event id; the endpoint receives `x-mipo-event-id` |
| Status visibility | `outbox_events.status`, `attempts`, `last_error` |
| Currently running? | **No** — `AUTOMATION_WEBHOOK_URL` is unset in production |

This is a well-built dispatcher. Its only structural limit is that it is a
`setInterval` in the API process, so it competes with request handling and dies
with the container.

### 2. Pet character job queue — `PARTIALLY IMPLEMENTED`
```js
const schedulePetCharacterJob = (characterId, stage) => {
  const jobKey = `${characterId}:${stage}`;
  if (petCharacterJobsInFlight.has(jobKey)) return;
  petCharacterJobsInFlight.add(jobKey);
  petCharacterJobQueue = petCharacterJobQueue
    .catch(() => {})
    .then(async () => { … });
};
```

| Property | Value |
|---|---|
| Queue | **a promise chain in memory**, plus an in-memory `Set` for dedupe |
| Concurrency | strictly 1, globally, across all users |
| Persistence | none — but the *state* is in `pet_characters.status` |
| Retry | none automatic; the user can POST again |
| Recovery | ✅ `resumePetCharacterJobs()` on boot re-queues anything left `generating_*` |
| Timeout | ❌ none |
| Dead letter | `status = 'failed'` with a typed `error_code` |
| Progress | polled via `GET /api/me/pets/:id/character` |

The recovery-on-boot is the good part and is why this works in practice: the
durable state lives in the table, and the in-memory queue is only a scheduler.
That is the right decomposition, executed with the wrong scheduler.

**The failure it cannot survive:** a job that hangs instead of throwing. The
`Set` entry is never cleared, the row stays `generating_*`, and every retry
returns 409 "already in progress". Forever.

---

## What does not exist

| Job the product implies | Status |
|---|---|
| Document processing / OCR | `MISSING` (`06`) |
| Image processing for user media | `MISSING` (`11`) |
| Vaccination expiry reminders | `MISSING` — `pet_vaccinations.expires_at` exists and nothing reads it |
| Reorder prediction | `MISSING` — `order_type='auto-restock'`, `business_products.auto_restock`, `restock_interval_days` all exist and are unread |
| Recommendation precomputation | `MISSING` |
| Notification fan-out | `MISSING` (`16`) |
| Analytics rollups | `MISSING` (`26`) |
| Data retention / purge | `MISSING` (`20`) |
| Orphaned media cleanup | `MISSING` (`11`, `21`) |
| Scraping jobs | `PARTIALLY IMPLEMENTED` — a `scraping_jobs` table (11 cols) exists; whether a runner drives it is `UNKNOWN` |
| Stuck-job sweeper | `MISSING` |

Note the pattern: three of these (reminders, reorder, restock) have their data
model already in place and only lack a runner.

---

## Recommendation

**Do not introduce Redis, BullMQ, SQS or a broker for a single-host
deployment.** The infrastructure is one EC2 instance running Docker Compose;
adding a broker adds an operational component with its own failure modes to a
system that has one process to look after.

The pattern that fits, and that the codebase already half-implements:

```
              a jobs table (durable state)
                       │
        claim with FOR UPDATE SKIP LOCKED    ← already proven in events.js
                       │
              a small worker loop
                       │
        ┌──────────────┼──────────────┐
    succeed        fail + backoff   exceed max → dead letter
```

Specifically:

1. **Generalise `outbox_events`'s claim mechanism into a `jobs` table.**
   `kind`, `payload`, `status`, `attempts`, `next_attempt_at`, `locked_at`,
   `last_error`, `idempotency_key`. The claim query, the backoff and the
   attempt cap can be lifted from `events.js` almost verbatim.
2. **Replace the character promise chain with it**, keeping
   `pet_characters.status` as the user-visible state. Same shape, durable
   scheduler.
3. **Add `locked_at` and a sweeper** that returns anything locked longer than
   N minutes to `pending`. This is the stuck-job fix, and it fixes it for every
   future job at once.
4. **Run the worker as a second container** in the same compose file, not as an
   interval in the API. It shares the image and the database; it does not share
   the request path. `docker-compose.yml` already runs four services — a fifth
   is a small change.
5. **Add a scheduler only when something needs a clock** (vaccination
   reminders). A `jobs` row with a future `next_attempt_at` is a scheduler;
   nothing more is needed until the volume justifies it.

Concurrency stays at 1–2 initially. The bottleneck is Gemini latency and cost,
not workers.
