# 24 — API Map

**110 routes**, all in `server/src/index.js`, dispatched by a hand-rolled
`if`-chain starting at line 7505. No framework, no route table, no middleware
stack — each handler calls its own guard.

Guards: `PUBLIC` · `USER` (`requireUser`) · `ADMIN` (`requireAdmin`) ·
`PERM:<x>` (`requireAdminPermission`) · `API_KEY` (`x-admin-api-key`).
`+RL` = a named rate-limit bucket. Line numbers are at commit `8a99d0ce`.

---

## Health and infrastructure
| Method | Path | Guard | Line |
|---|---|---|---|
| GET | `/api/health` | PUBLIC | 7517 |
| GET | `/api/health/schema` | PUBLIC — used by the container healthcheck | 7532 |
| GET | `/api/db/health` | PERM:FULL_ACCESS | 7543 |
| GET | `/uploads/*` | PUBLIC, **owner-checked when the key is a document** | 7510 |

`/api/health` returns `{ ok, service, version }` where `version` is
`MIPO_DEPLOY_SHA`. `/api/health/schema` is the healthcheck because
`select 1` answers just as happily on a schema the build cannot use.

## Auth
| Method | Path | Guard | Line |
|---|---|---|---|
| POST | `/api/auth/signup` | PUBLIC +RL 8/h | 7608 |
| POST | `/api/auth/login` | PUBLIC +RL — **two buckets: per-IP and per-email** | 7622 |
| POST | `/api/auth/logout` | PUBLIC | 7679 |
| GET | `/api/auth/me` | session-checked; 401 if none | 7685 |
| POST | `/api/auth/email-verification/request` | USER +RL 6/h | 7633 |
| POST | `/api/auth/email-verification/confirm` | PUBLIC +RL | 7655 |
| POST | `/api/auth/password-reset/request` | PUBLIC +RL 5/h | 7663 |
| POST | `/api/auth/password-reset/confirm` | PUBLIC +RL | 7671 |

## Admin identity
| Method | Path | Guard | Line |
|---|---|---|---|
| POST | `/api/admin/bootstrap` | API_KEY | 7550 |
| POST | `/api/admin/login` | PUBLIC +RL | 7565 |
| POST | `/api/admin/logout` | PUBLIC | 7574 |
| GET | `/api/admin/me` | ADMIN | 7580 |
| POST | `/api/admin/password` | ADMIN | 7591 |

## Me — account
`PATCH /api/me/profile` · `PATCH /api/me/marketing-consent` ·
`GET /api/me/usage` · `GET /api/me/export` · `DELETE /api/me/account`
— all USER, lines 7736–7793.

## Me — notifications (USER, 7795–7845)
`GET /api/me/notifications` · `POST` · `GET …/unread-count` ·
`PATCH …/read-all` · `PATCH …/:id`

## Me — documents and health (USER, 7847–7925)
```
GET    /api/me/documents
POST   /api/me/documents                    +RL 20/h
GET    /api/me/documents/:id/file
DELETE /api/me/documents/:id
GET|POST /api/me/insurance-claims
GET|POST /api/me/service-bookings
```

## Me — pets (USER, 7926–8110)
```
GET|POST  /api/me/pets
GET|PATCH|DELETE /api/me/pets/:id
GET       /api/me/pets/:id/health-summary
GET|POST  /api/me/pets/:id/vet-visits
GET|POST  /api/me/pets/:id/vaccinations     POST +RL
```

## Me — pet character (USER, 7944–8035)
```
GET    /api/me/pets/:id/character
POST   /api/me/pets/:id/character            +RL 3 / 24 h   → 202
DELETE /api/me/pets/:id/character
POST   /api/me/pets/:id/character/select     +RL 5 / 24 h
GET    /api/me/pets/:id/character/assets/:key?v=
```

## Media and social (USER, 8111–8231)
```
POST   /api/me/uploads               +RL 30/h
POST   /api/me/social/uploads        +RL 12/h
GET    /api/feed
POST   /api/feed/posts               +RL
GET|DELETE /api/feed/posts/:id
POST   /api/feed/posts/:id/reaction  +RL
POST   /api/feed/posts/:id/save      +RL
GET|POST /api/feed/posts/:id/comments  POST +RL
POST   /api/feed/posts/:id/poll      +RL
DELETE /api/feed/comments/:id
GET    /api/profiles/:id/activity    USER
```

## Public
| Method | Path | Guard | Note |
|---|---|---|---|
| GET | `/api/public/pets/:id` | PUBLIC +RL | privacy-filtered |
| POST | `/api/public/pets/:id/qr-scan` | PUBLIC +RL 60/h | emits `pet.qr_scanned` |
| GET | `/api/breeds` | PUBLIC | |
| GET | `/api/products` | PUBLIC | shape depends on `isAdminRequest` |
| GET | `/api/products/:id` | PUBLIC | so a shared link works alone |
| GET | `/api/categories` | PUBLIC | active categories only |
| POST | `/api/reports` | PUBLIC +RL 10/h | |

## Commerce
| Method | Path | Guard | Line |
|---|---|---|---|
| POST | `/api/orders` | USER-or-guest +RL | 8449 |
| GET | `/api/orders` | USER | 8461 |
| GET | `/api/orders/:ref` | PUBLIC — `canAccessOrder`: session owner **or** guest token | 8470 |
| GET | `/api/me/orders` | USER | 8233 |
| POST | `/api/payments/shop` | PUBLIC +RL | 8432 |
| POST | `/api/coupons/validate` | PUBLIC +RL | 8443 |
| POST | CardCom webhook | shared secret | 6932 |

## Admin — commerce and CRM (all PERM:FULL_ACCESS, 8253–8430)
`analytics` · `orders` (+ `orders/bulk`, `orders/:id`) · `customers` (+ `:id`,
`:id/notes`, note delete) · `coupons` CRUD · `dispatch-config`

## Admin — AI economics (all PERM:FULL_ACCESS, 8267–8312)
`economics/overview` · `providers` · `models` · `features` · `users` ·
`timeline` · `traces/:traceId`

## Admin — catalogue (fine-grained permissions, 8509–8709)
| Method | Path | Permission |
|---|---|---|
| GET | `/api/admin/categories` | PRODUCTS_READ |
| GET | `/api/admin/categories/unmatched` | PRODUCTS_READ |
| POST | `/api/admin/categories` | PRODUCTS_CREATE |
| POST | `/api/admin/categories/:id/adopt` | PRODUCTS_UPDATE |
| PATCH | `/api/admin/categories/:id` | PRODUCTS_UPDATE |
| DELETE | `/api/admin/categories/:id` | PRODUCTS_DELETE |
| POST | `/api/products` | PRODUCTS_CREATE |
| PATCH | `/api/products/:id`, `/api/products/bulk` | PRODUCTS_UPDATE |
| DELETE | `/api/products/:id`, `/api/products/bulk` | PRODUCTS_DELETE |
| POST | `/api/uploads` | PRODUCT_ASSETS_UPLOAD |
| POST | `/api/product-intel/:tool` | PRODUCT_TOOLS_USE +RL |

## AI
`POST /api/ai/chat` — USER, +RL 30/h (line 7703).

---

## Observations

1. **Every public route that returns user data filters in SQL**, not in the
   serializer. `/api/public/pets/:id`, `/api/feed`, `/api/orders/:ref`.
2. **`isAdminRequest` is a deliberate non-rejecting check** — a public endpoint
   uses it to decide how much of a row to reveal, rather than having two routes.
3. **Permission granularity is real** on the catalogue: a `product_manager` can
   create and update but not delete, and the routes enforce it individually.
4. **No API versioning.** No `/v1`. A breaking change has nowhere to live.
5. **No pagination** on `/api/products`, `/api/breeds`, `/api/categories`. The
   whole catalogue on every shop load.
6. **No OpenAPI/contract artefact.** This document is the closest thing that
   now exists.
7. **Naming is inconsistent** in one place: product writes are `/api/products`
   (admin-guarded) while category writes are `/api/admin/categories`. Both
   work; the split will confuse the next reader.

## Routes that would be needed for the missing workflows

Listed for planning, **not proposed for building yet**:

```
cart          GET|PUT|DELETE /api/me/cart
favorites     GET|POST|DELETE /api/me/favorites
walks         POST /api/me/walks · PATCH /api/me/walks/:id ·
              POST /api/me/walks/:id/points · POST /api/me/walks/:id/finish
parks         GET /api/parks · GET /api/parks/:id ·
              POST /api/parks/:id/checkin · POST /api/me/checkins/:id/end
social graph  POST|DELETE /api/me/follows/:userId · /api/me/pet-friends
documents     POST /api/me/documents/:id/process · GET …/extractions
matching      GET /api/me/pets/:id/product-matches
connectors    GET|PUT /api/admin/connectors            (see 15 and DECISIONS)
moderation    GET /api/admin/reports · PATCH /api/admin/posts/:id/moderation
```
