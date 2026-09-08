# Event model — MIPO Activity Network

§66 says reuse the existing event infrastructure and do not build a second event
bus. MIPO has one event mechanism, `outbox_events` (0020), and it is the right
home for part of this and the wrong home for the rest. The distinction matters
enough to state first.

---

## Two different things called "events"

**Integration events** — "a thing happened that another system should know
about". Low volume, must not be lost, delivered with retries. `outbox_events`
exists for exactly this: the row is written in the same transaction as the
business change, so an event cannot exist for a change that rolled back, and a
committed change cannot fail to produce its event. `startDispatcher` delivers
with backoff, `EVENT_TYPES` is a closed list, and events with origin
`automation` are not delivered back to the automation platform that caused them.

**Product analytics** — "the user did something, and we want to count it".
High volume (a feed impression per card), individually worthless, valuable in
aggregate, and fine to lose a few of.

Putting feed impressions through the outbox would fill a table designed for
guaranteed delivery with rows nobody delivers, and put the analytics write on
the same transaction as the business change. Two mechanisms, one shared naming
convention.

---

## Integration events — extend `outbox_events`

Add to `EVENT_TYPES` in `server/src/events.js`, emitted with `emitEvent(client,
…)` inside the transaction that makes the change:

| Event | Entity | When | Payload |
|---|---|---|---|
| `walk.completed` | walk | A walk ends normally | walk id, pet id, distance, duration, park count, moment count |
| `park.checked_in` | check_in | A user confirms `I'M HERE` | check-in id, park id, pet id |
| `park.checked_out` | check_in | Checkout or expiry | check-in id, park id, duration |
| `moment.created` | moment | A Moment is published | moment id, pet id, walk id, park id |
| `pet_friendship.requested` | friendship | A pet friend request | both pet ids, requester |
| `pet_friendship.accepted` | friendship | Accepted | both pet ids |

**No payload carries coordinates.** These leave MIPO. A walk's distance is
harmless; its route is not. `park_id` identifies a public place, which is fine;
a latitude and longitude pair belonging to a person is not.

Deliberately **not** integration events: walk started, paused, resumed, park
nearby. They are frequent, they are not interesting to an external system, and
`walk.completed` carries the outcome.

---

## Product analytics — one new table, one new endpoint

There is nothing to reuse. `useActivityTracker.trackClick` is an empty function
with a comment saying the endpoint does not exist, and `usage_events` /
`cost_events` are AI cost ledgers, not behaviour.

```sql
create table if not exists public.product_events (
  id          bigserial primary key,
  name        text not null,
  user_id     uuid references public.app_users(id) on delete set null,
  pet_id      uuid references public.pets(id) on delete set null,
  session_id  uuid,
  entity_type text,
  entity_id   uuid,
  properties  jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null,
  created_at  timestamptz not null default now()
);

create index if not exists idx_product_events_name_time on public.product_events(name, occurred_at desc);
create index if not exists idx_product_events_user_time on public.product_events(user_id, occurred_at desc);
create index if not exists idx_product_events_session   on public.product_events(session_id, occurred_at);
```

`bigserial`, not `uuid`: this table is append-only and will be the largest in
the database. `on delete set null` on both references, so deleting a user
removes the identity from the analytics without punching holes in the counts.

`POST /api/events` accepts a batch of up to 50, rate-limited like the other
write paths, and **stamps `user_id` from the session** — never from the body.
Unknown event names are dropped rather than stored, so a stale client cannot
pollute the table.

The client batches and flushes on a timer and on `visibilitychange`, because a
walk ends with the user putting the phone away.

### The event list (§60)

```
activity_network_opened      map_opened
walk_started                 walk_paused
walk_resumed                 walk_completed
park_viewed                  park_navigation_started
park_check_in                park_check_out
moment_created               moment_shared
who_is_here_viewed           pet_profile_viewed
follow_requested             follow_accepted
walk_summary_viewed          timeline_saved
```

Every event carries: `name`, `session_id`, `occurred_at`, and where they apply
`user_id`, `pet_id`, `entity_type`, `entity_id`.

**What must never be in `properties`:** coordinates, a route, a home address, an
email, a session token. The analytics table is the least-guarded place in the
system and the most likely to be exported to a spreadsheet.

---

## The KPI this exists to answer

§82 names the loop, §60 names the KPI. In this schema it is one query:

```
COMPLETED ACTIVITY LOOP =
  sessions with walk_started
    ∧ park_check_in
    ∧ moment_created
    ∧ walk_completed
```

`session_id` is what makes that a single grouped query rather than a heuristic
join across timestamps. It is the reason the column exists.

Supporting funnels, all from the same table: how many opened the map but never
started a walk; how many started and never finished; how many reached a park but
did not check in; how many checked in but captured nothing.

Those four numbers are what tell you where the loop actually breaks, and none of
them can be answered today.

---

## Ordering

Ship `product_events` and `POST /api/events` **before** the surfaces they
measure. It is one table and one endpoint, and it is the difference between
launching the Activity Network and launching it blind. Instrumentation added
afterwards always arrives after the questions have been asked.
