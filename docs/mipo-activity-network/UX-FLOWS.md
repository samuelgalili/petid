# UX flows — MIPO Activity Network

§64 asks for every major state, including the ones that are not the happy path.
The error states are listed with the same weight as the successes, because
outdoors, one-handed, with a leash, they are not edge cases — weak GPS is
Tuesday.

Design constraints throughout: one obvious primary action per screen; the
purpose readable in about three seconds; a walk startable in about five;
targets large enough for a thumb in sunlight; and the existing MIPO design
system, not a new one.

---

## Onboarding and location permission

Location is **not** requested during onboarding. It is requested on the first
tap of START WALK or "parks near me", where the reason is self-evident.
Onboarding may mention that MIPO uses location; it must not trigger the browser
dialog. A prompt with no context attached is the fastest route to a permanent
denial, and denial is not recoverable in-app.

```
[ START WALK ]  ← first tap

┌──────────────────────────────┐
│ Mipo needs your location to  │
│ record where you and Max go. │
│                              │
│ [ Allow location ]  [ Not now ]│
└──────────────────────────────┘
```

**Not now** → the map opens on a searched city; walks are unavailable with one
line explaining why. Everything else in MIPO keeps working.

**Denied (permanently)** → the same screen, plus how to undo it, because the
browser will not ask again:

> Location is blocked for Mipo. To record walks, enable it in your browser
> settings for this site.

---

## Home

Answers one question: *what can I do with Max right now?*

```
Good evening, Samuel

      MAX 🐕
   Ready for a walk?

   [   START WALK   ]

TODAY WITH MAX
3.2 km · 42 min

NEARBY
Herzliya Dog Park
12 dogs · 3 friends
```

One pet → it is the default, no question asked. Multiple pets → a compact
selector on the button; still one tap to start.

**States.** No pet yet → the primary action becomes "Add your pet". No walk
today → the TODAY block is absent, not an empty shell showing zeros. Location
off → NEARBY is replaced by "Find a park", which opens search.

---

## Map

Opens without starting a walk (§15). The map is the screen; controls float over
it. A bottom sheet carries detail rather than a new screen, so the map is never
lost.

Layers are a single control, not seven toggles: **Parks** (default), **Friends**,
**Moments**. Never all at once.

**States.** Loading → the map frame with a skeleton sheet, never a blank screen.
No parks nearby → "No dog parks within 5 km" plus a search field, not an empty
map. Tiles fail → "Map unavailable" over a usable list of nearby parks, because
a park list without a map is still useful. Location off → centred on a searched
city with a "Use my location" button.

---

## Park detail

A park is not a pin (§55).

```
HERZLIYA DOG PARK          🟢 Active
1.2 km away

12 dogs here · 3 friends

WHO'S HERE
Luna    Golden Retriever · 3y · met Max 4×
Rocky   Labrador · 2y
Bella   Mixed · 4y · Max's friend

LIVE REPORTS
💧 Water available      · 40 min ago
🐶 Puppies              · 1 h ago

[ NAVIGATE ]        [ START WALK HERE ]
```

**States.** Nobody here → "No one is checked in right now", not an empty list.
No reports → the section is absent. Not checked in → "Who's Here" shows counts
and friends only; full identities require being present. Park closed (reported)
→ a banner above everything else.

---

## Starting a walk

Five seconds from intent to walking. Tap START WALK → permission (first time
only) → the live screen. **No pre-walk form.** No goal, no route type, no
activity picker. Pet is the active pet; everything else is inferred.

---

## Active walk

```
        [ MAP — the hero ]

     🐕 MAX      ● recording

     2.7 KM        34:12

  [ 📸 CAPTURE MOMENT ]

  [      END WALK      ]
```

Two actions, both large. Distance and time visible but subordinate. No dashboard
— the user is walking a dog.

The recording indicator is not decoration: it is the difference between a user
who trusts the number and one who does not.

**States.**

*Acquiring GPS* — "Finding your location…" and the distance withheld until the
first accepted fix. Never start at 0.0 km and jump.

*Weak signal* — a quiet amber line, "Weak GPS — the route may be less accurate."
Recording continues; the filter is already rejecting bad fixes.

*Screen locked or app backgrounded* — the honest one. On return within five
minutes: recording resumes, and a line says the gap was estimated. After five
minutes:

> Recording stopped when Mipo was in the background.
> We saved the 2.1 km recorded before that.
> [ Keep walking ] [ End walk ]

A number that was not measured is never drawn. This is §18 made visible.

*Network lost* — recording is local; points upload when connectivity returns.
The user is told nothing, because nothing is wrong.

*Paused* — the map dims, the timer stops, the primary action becomes RESUME.

---

## Nearby park suggestion

Appears when an accepted position comes within ~150 m of a known park.

```
┌──────────────────────────────┐
│ You're near Herzliya Dog Park│
│ 12 dogs · 3 friends          │
│                              │
│ [ I'M HERE ]        [ ✕ ]   │
└──────────────────────────────┘
```

**Never checks in automatically** (§25). Dismissed once, it does not return for
that park during that walk — a bench next to a park must not nag.

---

## Check-in and park mode

`I'M HERE` → immediate confirmation, then park mode: who is here, live reports,
capture. Checkout is one tap, and happens automatically on ending the walk or at
expiry.

**States.** Check-in fails (network) → queued and retried, with the UI showing
"Checking in…" rather than a false success. Already checked in elsewhere → the
previous check-in closes automatically; the database allows only one open.
Invisible mode on → a quiet line: "You're invisible — you won't appear in Who's
Here." No shaming, no upsell.

---

## Capturing a Moment

Capture must not open a form. Camera → shoot → confirm → done. Pet, walk, park
and time attach automatically (§30); the caption is optional and can be added
later.

**States.** Upload in progress → the Moment appears immediately, marked
"Uploading…"; the walk is not blocked. Upload fails → it stays queued with a
retry, never silently discarded. File too large → the client says so before
uploading, with the actual limit.

---

## Ending a walk, and the summary

```
MAX'S WALK

3.7 KM · 51 MIN

1 park · 3 dogs met · 4 Moments

[ VIEW ROUTE ]
[ SAVE TO MAX'S TIMELINE ]
```

Only measured numbers appear. No steps field, because MIPO cannot measure steps
in a browser. No pet calories, because there is no basis for them. An absent
number is honest; a plausible one is not.

If the walk was interrupted, the summary says so, above the numbers:
*"Recording was interrupted — this covers 2.1 km of your walk."*

**States.** Walk under 100 m or 2 minutes → "This walk was too short to save",
with the option to discard, so a mis-tap does not litter the timeline. No route
recorded at all → duration only, offered as a plain entry.

---

## Pet timeline

Reverse-chronological: walks, park visits, Moments, friendships. Grouped by day.
Empty state names the first action rather than apologising: "Max's story starts
with your first walk together."

---

## Social integration

Activity produces feed content (§37) — but a walk summary is not automatically
published. The summary offers "Share to feed"; Moments captured during a walk
follow the user's default Moment visibility. The default for a *route* is
private, always.

---

## Invisible mode

One toggle, in profile settings, with the consequence written plainly rather
than in a help article:

> **Invisible**
> You can still walk, check in and post. You won't appear in Who's Here, in live
> park counts, or in friends' activity.

Reachable while at a park, because that is when someone decides they want it.

---

## Error states, consolidated

| Situation | What the user sees |
|---|---|
| Location denied | Map on a searched city; walks unavailable, with the reason and the fix |
| GPS unavailable | "Can't find your location" + retry; the rest of MIPO unaffected |
| Weak GPS | Amber line; recording continues |
| Backgrounded > 5 min | Walk saved as partial, gap declared |
| Network lost mid-walk | Nothing. Points buffer and sync |
| Upload failed | Moment queued with retry; never dropped silently |
| Map tiles fail | "Map unavailable" + a usable park list |
| No parks nearby | "No dog parks within 5 km" + search |
| Nobody at the park | "No one is checked in right now" |
| Check-in failed | "Checking in…" then a retry; never a false success |
| AI unavailable | "Mipo couldn't analyse this right now." The Moment is unaffected |
| No matching product | No product card at all (§42) |

Two rules across all of them: never show a technical error, and never let a
failure in a secondary system (AI, map tiles, store) break the primary one (the
walk).
