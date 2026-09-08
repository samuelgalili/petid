# Product specification — MIPO Activity Network

## Vision

MIPO is the digital home for life with your pet. The Activity Network is its
physical-world layer: it turns walks, parks and encounters into a record of a
life shared with an animal.

The line that governs every decision below: **Activity creates the life. Social
tells the story.** Walks and parks are not features next to the feed — they are
what gives the feed something true to be about.

## Target user

The MVP is for **dog owners who walk their dog**, in one city, on a phone,
outdoors, one-handed, often while holding a leash.

MIPO the platform serves cats, rabbits, parrots and others, and must keep doing
so. But walks and dog parks are dog-shaped, and a cat owner must never be pushed
through a walk flow. This is a constraint on the *product surface*, not on the
core model: `pets.type` already distinguishes them, and the Activity surfaces
simply do not appear for a pet that has no use for them.

## The problem

A pet owner's life with their animal is mostly undocumented. The walk happens,
the park happens, the dog meets another dog, and none of it is anywhere. What
does get recorded lives in a camera roll with no idea what it is looking at.

Meanwhile the decisions that matter — is this park right for my dog, is my dog
getting enough exercise, who does my dog actually like — are made on memory and
guesswork.

## Product thesis

If MIPO records what actually happens on a walk, three things follow that no
single feature produces on its own:

1. **The social feed becomes true.** Content arrives from real activity rather
   than from people performing for a feed.
2. **The pet's profile becomes real.** Not a form the owner filled in once, but
   an accumulating record of where a dog goes, how much it moves, who it meets.
3. **Recommendations become grounded.** A store suggestion after a 5 km walk in
   the heat is a different thing from a banner.

None of this requires the user to do anything they were not already doing. They
were going to walk the dog.

## The loop

```
PET → START WALK → DISCOVER → WALK → ARRIVE AT PARK → I'M HERE →
SEE PETS → SOCIAL → CAPTURE MOMENT → END WALK → SUMMARY →
PET TIMELINE → BETTER UNDERSTANDING → RETURN
```

The MVP exists to prove this loop is useful. Everything that does not serve it
is deferred — see MVP-SCOPE.md.

## User journey

**Before the walk.** Home shows one pet and one action: START WALK. Underneath,
what happened today, and what is nearby. No menu, no configuration.

**During.** The map dominates. Distance and time are visible but secondary.
Two actions, both large: capture a Moment, end the walk. Nothing else is
reachable, because the user is outside holding a leash.

**At the park.** MIPO notices the park and offers — never decides. One tap of
`I'M HERE` and the screen becomes the park: who is here, what people have
reported, what has been captured recently.

**After.** A summary of what actually happened, saved to the dog's timeline in
one tap. The Moments captured are already in the feed.

**Tomorrow.** The dog's profile has one more walk, one more park, maybe one more
friend. Over months this becomes the thing that is hard to leave.

## Feature boundaries

**MIPO Activity is not** a fitness tracker (the dog is the subject, not the
owner's training plan), a GPS tracker (it does not follow pets or people), a
park directory (a directory is a list; this is live), or a navigation app (it
hands off to the device's maps for directions).

**MIPO Social is not** a general video feed. It answers "what is happening in my
pet world", and its content comes from real activity.

## What must never happen

These are product rules, and they are enforced in code or they are not real:

- **No fabricated data.** Not parks, not distances, not steps, not calories, not
  products, not prices. Where MIPO does not know, it says so. A missing number
  is honest; a plausible one is a lie the user cannot detect.
- **No automatic check-in.** Presence is always a deliberate act (§25).
- **No AI guess presented as fact.** Inference is labelled and confirmable, and
  never overwrites what the owner said.
- **No product from outside the catalogue.** Enforced today by
  `server/src/catalogRecommendations.js`.
- **No exact location exposure.** No live position is stored at all; shared
  routes lose their ends and their precision.
- **No dark patterns.** No streak anxiety, no manufactured urgency, no
  notification designed to pull someone back rather than tell them something.

## Success metrics

Primary, from §60:

**COMPLETED ACTIVITY LOOP** — sessions containing walk started, park check-in,
Moment created and walk completed. One query over `product_events`, available
from launch because analytics ships before the surfaces.

Supporting, in the order they diagnose failure:

- Map opened → walk started (is the first action obvious?)
- Walk started → walk completed (does tracking survive a real walk?)
- Park suggested → checked in (is the suggestion trusted?)
- Checked in → Moment captured (is there anything worth capturing?)
- Walks per active user per week (has it become a habit?)
- Return rate at day 7 and day 30

Explicitly **not** optimised for: session length, feed scroll depth,
notification click-through.

## Roadmap after the MVP

**Next.** Background walk tracking via a Capacitor wrapper, and step counts with
it — the one capability the web cannot provide, funded by a proven loop. S3 and
a CDN for media, which by then will be the operational constraint.

**Then.** Feed ranking on accumulated signals. Pet friendship suggestions from
real repeated encounters. Park intelligence aggregated from real check-ins. AI
analysis of Moment media on the existing gateway.

**Later.** Pet-friendly places beyond parks. Local businesses. Contextual
commerce grounded in activity. Achievements that mean something because the
underlying data is real.

Each of these depends on data the MVP starts collecting. That ordering is the
plan: build the thing that produces the data before the thing that consumes it.
