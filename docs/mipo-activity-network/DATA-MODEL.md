# Data model — MIPO Activity Network

§65 asks for only what is necessary, and forbids duplicating entities that
already exist. Two of the proposed entities already exist under other names and
are extended rather than created.

Conventions follow the repository: `uuid` primary keys with
`default gen_random_uuid()`, `timestamptz` with `now()`, `on delete cascade` to
the owner, partial indexes for the hot read path, and additive migrations —
`applyMigrations.js` has no run-level transaction, so every file must be safe on
its own.

---

## What already exists and must not be duplicated

| Proposed in §65 | Already in MIPO | Decision |
|---|---|---|
| `moment` | `public.social_posts` (0014) | **Extend.** Add the Activity links. |
| `pet_social_connection` | — | Create. |
| `user_social_connection` | — | Create. |
| `walk`, `walk_route`, `walk_activity` | — | Create (see below on `walk_route`). |
| `park`, `park_check_in`, `park_report`, `park_visit` | — | Create; `park_visit` folded into `park_check_in`. |
| `pet_activity_event` | — | Create, but see EVENTS.md — it is an analytics table. |

Two simplifications, deliberately:

- **`walk_activity` is not a table.** Distance, duration and pace are properties
  of a walk, computed once when it ends. A second table for three numbers per
  walk buys nothing and adds a join to every read.
- **`park_visit` is not separate from `park_check_in`.** A check-in with a
  `checked_out_at` *is* a visit. Two tables for one lifecycle guarantees they
  disagree.

---

## Moment — extending `social_posts`

`social_posts` already carries `user_id`, `pet_id`, `upload_id`, `caption`,
`location`, `media_type`, `visibility`, `moderation_status`, `archived`,
`published_at`. What §7 adds:

```sql
alter table public.social_posts
  add column if not exists walk_id     uuid references public.walks(id) on delete set null,
  add column if not exists park_id     uuid references public.parks(id) on delete set null,
  add column if not exists content_kind text not null default 'moment',
  add column if not exists hashtags    text[] not null default '{}',
  add column if not exists ai_metadata jsonb  not null default '{}'::jsonb;

alter table public.social_posts
  add constraint social_posts_content_kind_check
  check (content_kind in ('moment','walk_summary','park_visit','insight','memory','commerce'));
```

`on delete set null` on both links, not cascade: deleting a walk must not delete
the photographs taken during it. That is the user's memory, and §34 makes the
Timeline the memory layer.

**Carousel.** `social_posts.upload_id` is a single `not null` column, so a post
holds one piece of media. §8 wants carousels. Rather than widening that column,
add a child table and leave `upload_id` as the first item, so every existing row
stays valid:

```sql
create table if not exists public.social_post_media (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.social_posts(id) on delete cascade,
  upload_id  uuid not null references public.user_uploads(id) on delete restrict,
  position   integer not null check (position between 0 and 9),
  created_at timestamptz not null default now(),
  unique (post_id, position)
);
```

**Location.** `social_posts.location` is free text up to 160 characters — today
a user can type their home address into it. Activity Moments must not use it for
coordinates. Coordinates live on the walk and the park, which have the
coarsening rules; a Moment's place is `park_id`, or nothing.

---

## Social graph

Two tables, because §32 says explicitly not to collapse owner and pet identity.

```sql
create table if not exists public.user_follows (
  follower_id uuid not null references public.app_users(id) on delete cascade,
  followee_id uuid not null references public.app_users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);

create table if not exists public.pet_friendships (
  pet_id       uuid not null references public.pets(id) on delete cascade,
  friend_pet_id uuid not null references public.pets(id) on delete cascade,
  status       text not null default 'pending'
               check (status in ('pending','accepted','declined','blocked')),
  requested_by uuid not null references public.app_users(id) on delete cascade,
  met_count    integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (pet_id, friend_pet_id),
  check (pet_id <> friend_pet_id)
);

create index if not exists idx_user_follows_followee on public.user_follows(followee_id, created_at desc);
create index if not exists idx_pet_friendships_friend on public.pet_friendships(friend_pet_id, status);
```

Owner follow is one-directional, like the rest of the product's mental model.
Pet friendship is mutual and therefore needs consent — §31 forbids creating one
from inference alone. `met_count` is what powers the *suggestion*; it never
creates the row.

---

## Walks

```sql
create table if not exists public.walks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.app_users(id) on delete cascade,
  pet_id      uuid references public.pets(id) on delete set null,
  status      text not null default 'active'
              check (status in ('active','paused','completed','abandoned','partial')),
  started_at  timestamptz not null default now(),
  ended_at    timestamptz,
  duration_seconds integer,
  distance_meters  integer,
  point_count      integer not null default 0,
  visibility  text not null default 'private'
              check (visibility in ('private','followers','public')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (ended_at is null or ended_at >= started_at)
);

create index if not exists idx_walks_user_started on public.walks(user_id, started_at desc);
create index if not exists idx_walks_pet_started  on public.walks(pet_id, started_at desc) where status = 'completed';
create unique index if not exists idx_walks_one_active
  on public.walks(user_id) where status in ('active','paused');
```

Three deliberate choices.

**`visibility` defaults to `private`.** A route is the most revealing thing MIPO
would hold. It is shared only if the owner asks.

**`partial` is a real status, not an error.** It is what a walk becomes when the
browser was backgrounded and positions stopped arriving — see TECHNICAL-RISKS.md
risk 1. The distance recorded is the distance actually observed, and the UI says
the recording was interrupted. §18 forbids fabricating metrics; this is how the
schema keeps that promise instead of interpolating across the gap.

**`idx_walks_one_active` is a partial unique index.** One live walk per user, in
the database rather than in application logic. Two tabs, a refresh mid-walk, or
a retried request cannot produce two.

### Route points

```sql
create table if not exists public.walk_route_points (
  walk_id     uuid not null references public.walks(id) on delete cascade,
  sequence    integer not null,
  latitude    numeric(9,6) not null,
  longitude   numeric(9,6) not null,
  accuracy_meters numeric(6,1),
  recorded_at timestamptz not null,
  primary key (walk_id, sequence)
);
```

`numeric(9,6)` is roughly 0.1 m precision — more than enough, and a fixed scale
so points cannot arrive at absurd precision. The composite primary key makes a
replayed batch idempotent, which matters for §71's offline sync: the same point
sent twice is one row.

Retention is specified in PRIVACY-MODEL.md and enforced by a scheduled job, not
by hope: raw points are deleted after a fixed window, and the walk keeps its
distance, duration and a coarsened polyline.

---

## Parks

```sql
create table if not exists public.parks (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  latitude    numeric(9,6) not null,
  longitude   numeric(9,6) not null,
  city        text,
  source      text not null check (source in ('osm','municipal','manual')),
  source_ref  text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (source, source_ref)
);

create index if not exists idx_parks_bbox on public.parks(latitude, longitude) where is_active;
```

`source` and `source_ref` are not decoration. §24 forbids inventing parks, and
the only way to keep that promise over time is for every row to say where it
came from and to be re-checkable against it. The unique pair also makes
re-importing a source idempotent.

**Proximity query.** No PostGIS. A bounding box on the btree index, then exact
haversine on the small result:

```sql
select id, name, latitude, longitude,
       6371000 * acos(least(1,
         cos(radians($1)) * cos(radians(latitude)) * cos(radians(longitude) - radians($2))
         + sin(radians($1)) * sin(radians(latitude)))) as distance_meters
from public.parks
where is_active
  and latitude  between $1 - $3 and $1 + $3
  and longitude between $2 - $4 and $2 + $4
order by distance_meters
limit 20;
```

`$3` is the latitude delta for the search radius; `$4` is the longitude delta,
which must be divided by `cos(latitude)`. `least(1, ...)` guards the floating
point case where `acos` receives 1.0000000002 and returns NaN.

### Check-ins

```sql
create table if not exists public.park_check_ins (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.app_users(id) on delete cascade,
  pet_id       uuid references public.pets(id) on delete set null,
  park_id      uuid not null references public.parks(id) on delete cascade,
  checked_in_at  timestamptz not null default now(),
  checked_out_at timestamptz,
  expires_at   timestamptz not null default now() + interval '3 hours',
  visibility   text not null default 'public'
               check (visibility in ('public','followers','private')),
  walk_id      uuid references public.walks(id) on delete set null,
  created_at   timestamptz not null default now()
);

create index if not exists idx_check_ins_park_live
  on public.park_check_ins(park_id, checked_in_at desc)
  where checked_out_at is null;

create unique index if not exists idx_check_ins_one_open
  on public.park_check_ins(user_id) where checked_out_at is null;
```

`expires_at` answers §26's requirement that presence not persist forever. A
check-in is live when `checked_out_at is null and expires_at > now()` — so a
user who closes the app without checking out disappears from "Who's Here" by
itself, with no cleanup job required for correctness. A job still closes them
for tidiness, but the read is already correct without it.

### Reports

```sql
create table if not exists public.park_reports (
  id         uuid primary key default gen_random_uuid(),
  park_id    uuid not null references public.parks(id) on delete cascade,
  user_id    uuid not null references public.app_users(id) on delete cascade,
  kind       text not null check (kind in (
               'calm','busy','many_large_dogs','puppies',
               'water_available','water_unavailable',
               'clean','needs_cleaning','issue','closed')),
  note       text check (note is null or char_length(note) <= 200),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '6 hours'
);

create index if not exists idx_park_reports_live on public.park_reports(park_id, created_at desc);
```

`kind` is a closed set, not free text: it keeps §30's aggregation honest and
removes a moderation surface. `expires_at` is §29's TTL — "water available" is
true this afternoon, not forever.

---

## Pet attributes — the confidence layer

§9 and §40 require that an AI inference never silently becomes a fact. `pets`
holds flat values with no record of who asserted them, so writing an inference
there would overwrite the owner. A separate table, deliberately:

```sql
create table if not exists public.pet_attributes (
  id          uuid primary key default gen_random_uuid(),
  pet_id      uuid not null references public.pets(id) on delete cascade,
  key         text not null,
  value       jsonb not null,
  source      text not null check (source in ('owner_provided','ai_inferred','system_derived')),
  confidence  numeric(4,3) check (confidence is null or confidence between 0 and 1),
  confirmed_at timestamptz,
  confirmed_by uuid references public.app_users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (pet_id, key, source)
);
```

`unique (pet_id, key, source)` is what makes the distinction hold: an owner's
answer and the AI's guess for the same key coexist as separate rows. The owner's
always wins on read. Confirming a guess sets `confirmed_at` and promotes it —
`pets.breed_confidence` is the existing precedent for exactly this idea.

---

## What is deliberately not modelled yet

- **Pet similarity vectors.** No embeddings, no `pgvector`. There is no
  behavioural data to embed until walks and check-ins have been recorded for a
  while. Adding the machinery first would be modelling nothing.
- **Sponsored placements.** §43 requires the distinction to exist before any
  paid placement ships. No table until there is a sponsor.
- **`organization_id` on Activity tables.** There is no organizations table and
  no second tenant. A column nothing populates is worse than no column: it looks
  like isolation and provides none.
- **Achievements.** §58's milestones are derivable from walks and check-ins.
  Materialise them only when a query proves too slow.
