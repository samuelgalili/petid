# MIPO Activity Network — Phase 0

The audit and design set required before implementation. No Activity Network
code has been written.

Verified against `aws-migration` (production tip `fffa67a3`) on 8 September 2026
by reading the code, applying all 33 migrations to a real PostgreSQL 16, and
running the server and browser suites. Claims that could not be verified from
the repository are marked UNKNOWN rather than guessed.

## Read in this order

| Document | Answers |
|---|---|
| [ARCHITECTURE-AUDIT.md](ARCHITECTURE-AUDIT.md) | What exists, what is reusable, what is missing |
| [TECHNICAL-RISKS.md](TECHNICAL-RISKS.md) | What can and cannot be built, GREEN/YELLOW/RED |
| [MVP-SCOPE.md](MVP-SCOPE.md) | The nineteen required steps, graded |
| [PRODUCT-SPEC.md](PRODUCT-SPEC.md) | Vision, user, thesis, metrics |
| [UX-FLOWS.md](UX-FLOWS.md) | Every screen state, including the failures |
| [DATA-MODEL.md](DATA-MODEL.md) | Tables, and what is extended rather than created |
| [EVENTS.md](EVENTS.md) | Integration events vs product analytics |
| [LOCATION-ARCHITECTURE.md](LOCATION-ARCHITECTURE.md) | Permissions, sampling, retention, platform limits |
| [PRIVACY-MODEL.md](PRIVACY-MODEL.md) | Visibility, invisible mode, location rules, deletion |
| [IMPLEMENTATION-PLAN.md](IMPLEMENTATION-PLAN.md) | Phases, and the first milestone |

## The four findings that change the plan

**MIPO is a web app.** No native project of any kind. Background walk tracking
with the phone locked, and step counts from HealthKit or Health Connect, are not
available to a browser. Fifteen of the nineteen MVP steps are GREEN; those three
are RED. The recommendation is to ship the loop with the screen on and treat a
Capacitor wrapper as a funded decision after the loop is proven.

**User media lives on one instance's local disk.** No S3, no AWS SDK, no CDN,
and nothing backs up the uploads volume. Losing the instance loses every photo
every user has posted. This is true today, independent of this project.

**There is no product analytics.** The client tracker is an empty function with
a comment. The MVP's primary KPI cannot be measured until one table and one
endpoint exist, so they come first.

**Two of the proposed entities already exist.** `social_posts` is the Moment
table and should be extended, not replaced. The event infrastructure exists for
integration events but is the wrong shape for behavioural analytics — the two
are separated in EVENTS.md.

## Decisions required before Phase 2

Park data source · map library and tile provider · native or web-only ·
S3 and CDN for media. The last is not a product decision and should not wait
for one.
