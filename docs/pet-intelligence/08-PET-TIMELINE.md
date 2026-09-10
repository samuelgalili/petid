# 08 — Pet Timeline

## It is a projection. This is the whole design.

```
   pet_facts ──┐
               │
outbox_events ─┼──►  pet_timeline_entries  ──►  GET /pets/:id/timeline
               │      (derived, rebuildable)
pet_observ. ──┘
```

**Acceptance test:** truncate `pet_timeline_entries`, replay from facts and
events, and get a byte-identical result. If that ever stops being true, the
timeline has become a second source of truth and the design has failed.

Consequences of taking that seriously:

- Nothing writes to the timeline directly. Ever.
- The timeline has no fields that exist nowhere else. Every entry's `title`,
  `icon` and `summary` are rendered from the source row at projection time.
- Deleting a timeline entry is meaningless — it comes back on the next rebuild.
  Hiding something means changing the source or the projection rule.
- A projection bug is fixed by changing the rule and rebuilding, not by patching
  rows.

---

## Why materialise at all

A pure view over facts + events + observations would be correct and slow: it
needs a union across four tables with different shapes, ordered by time,
paginated. Materialising gives one indexed table and one cursor.

The cost is a consumer that can fall behind. That is acceptable because the
consumer cursor (`07`) makes "behind" visible and recoverable, and because a
rebuild is always available.

```
pet_timeline_entries
  id
  pet_id                 indexed with occurred_at desc
  occurred_at
  kind                   health | document | activity | social | commerce
                         | profile | care | ai
  entry_type             the specific type, e.g. 'weight_recorded'
  source_kind            fact | event | observation
  source_id              the row it projects
  title_key              an i18n key, NOT a rendered string
  payload                jsonb — ids and numbers, not prose
  visibility             owner | care_team | admin
  created_at
```

### `title_key`, not `title`
The app is Hebrew-first with an English fallback. Storing rendered Hebrew in the
projection means a copy change requires a rebuild, and a language switch shows
the wrong language. Store the key and the numbers; render at read time.

---

## What appears, and from where

| Entry | Projected from | Kind |
|---|---|---|
| `pet_created` | `pet.created` | profile |
| `weight_recorded` | `pet_observations` (weight) | health |
| `condition_recorded` / `resolved` | `pet_fact.created` / `.resolved`, clinical | health |
| `vaccination_recorded` / `due_soon` | `pet_vaccinations` (`expires_at` already exists) | health |
| `vet_visit` | `pet_vet_visits` | health |
| `document_uploaded` / `processed` / `review_required` | document events | document |
| `walk_completed`, `park_checked_in` | `14` — not yet | activity |
| `moment_created` | `moment.created` | social |
| `order_placed` / `delivered` | order events, **filtered to this pet** (`15`) | commerce |
| `food_changed` | `nutrition.current_food` supersession | care |
| `life_stage_changed` | `identity.life_stage` supersession | profile |
| `insight_generated` | `20` | ai |

`life_stage_changed` is a nice property of the model: because a derived life-stage
fact can carry a future `effective_to` (`04`), the transition appears on the
timeline on the right day without a nightly job.

---

## What does not appear

| Excluded | Why |
|---|---|
| Every `pet.updated` | correcting a typo is not a life event |
| Every fact supersession | only clinically or materially meaningful ones |
| `product.viewed` | browsing is analytics, not biography |
| Login, session, page view | not about the pet |
| Disputes | they are a review task, not a memory |
| Anything with no owner-legible meaning | the test below |

**The test:** would the owner, a year from now, want to see this line? If not, it
is a log entry, and logs live in `outbox_events`.

This matters because a timeline that shows everything shows nothing. The
existing system has a related lesson — `SmartRecommendations` scores every
product and the useful signal is in the top three.

---

## Rendering

```
ספטמבר 2026
  09  🩺  מסמך וטרינרי הועלה            → opens the PDF
  09  ⚖️  משקל נרשם: 28.2 ק״ג           → "מהמסמך הווטרינרי"
  08  🐾  טיול: 4.2 ק״מ                  (14)
  08  🏞️  פארק הרצליה                    (14)
  08  📸  רגע חדש                         → opens the Moment
  05  🛒  הוזמן: מזון יבש 12 ק״ג          → opens the order
```

Grouped by month, newest first, cursor-paginated on `(occurred_at, id)` — the
same cursor shape `listSocialFeed` already uses, which is stable under inserts.

Each entry links to its **source**, not to a copy of it. Tapping the weight entry
opens the vet document that produced it. That is provenance made visible without
showing the owner a word like "provenance".

---

## Visibility

`visibility` is on the entry because a future care-team member (`22`) should see
health entries and not commerce ones.

| Viewer | Sees |
|---|---|
| Owner | everything |
| Care-team grantee (future) | health + document + activity, per grant |
| Admin / CRM | everything, plus disputes and superseded facts |
| Anyone else | nothing — the timeline has no public surface |

Computed at projection time from the source's own class, so a health entry cannot
accidentally be projected as public.

---

## Build order

The timeline is **P2**, not P1, and deliberately: it is a projection, so it can be
built at any point over whatever facts and events exist by then, and building it
early over a thin event catalogue produces a convincing-looking screen with three
entries on it. Build the producers first.
