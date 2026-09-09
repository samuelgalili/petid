# 14 — Cart, Checkout, Orders

## Cart — `PARTIALLY IMPLEMENTED` (client only)

`src/contexts/CartContext.tsx`:

```ts
const savedCart = localStorage.getItem("mipo-cart");   // line 48
localStorage.setItem("mipo-cart", JSON.stringify(items)); // line 69
```

There is no `carts` table, no `cart_items` table, and no cart API. Consequences,
all of them real today:

- A cart does not follow the user to another device or browser.
- A cart is lost when site data is cleared.
- Abandoned-cart recovery is impossible — the server never sees the cart.
- Prices are whatever the client stored; they are re-read at order time
  (see below), which is the saving grace.
- Cart contents are invisible to CRM, analytics and recommendations.

**`/cart` and `/checkout` are not `Protected`** (`src/routes/index.tsx:107,109`)
— guest checkout is supported by design.

## Checkout and order creation — `EXISTS`

`POST /api/orders` → `createOrder` (`server/src/index.js:5617`).

Validated server-side at creation:
- `payment_method` ∈ credit-card, apple-pay, google-pay, bit, paybox, paypal,
  cash-on-delivery
- `installments` ≤ 12
- `order_type` ∈ regular, auto-restock
- `medical_urgency` ∈ none, medium, high
- shipping address normalised (`server/src/shippingAddress.js`)
- **email verification required for signed-in users**, with a stated reason:
  the order sends a confirmation, invoice and delivery updates to the account's
  address, so that is where the address is proven. Guest checkout is exempt
  because it has no account to protect.

Cash on delivery adds a ₪5 fee (`server/src/index.js:5535`) and sets
`payment_status = 'awaiting_cod'`.

### Guest orders and the access token
A guest order gets `createOpaqueToken()`; only the SHA-256 hash is stored
(`orders.access_token_hash`). `GET /api/orders/:ref` is public, and
`canAccessOrder` (`server/src/index.js:6377`) grants access if either the
session user owns the order **or** the presented token verifies with
`timingSafeEqual`. That is a correct guest-access design, not an IDOR.

### Order numbers
`orders.order_number` is unique and generated server-side. `insurance_claims`
and `pet_service_bookings` use the same pattern (`CLM-`/`BKG-` + date + random
suffix as a column default).

## Payment — `EXISTS`

CardCom. `POST /api/payments/shop` creates the hosted payment page;
the customer pays off-site; CardCom calls back.

The webhook (`server/src/index.js:6932`) authenticates with a shared secret,
compared using `secretsEqual`, accepted from either a query token or a header.
Every callback is recorded in `cardcom_events` (9 columns, FK to `orders`), so
payment notifications are auditable and replayable.

`server/src/cardcom.js` is defensive in the right ways: `getCardcomString` /
`getCardcomNumber` read a value from any of several possible key spellings —
because the PSP's field names are not stable — and `chargeOperations` is an
explicit allowlist of operation codes rather than a truthiness check.

Card data never touches Mipo. Good.

## Orders — `EXISTS`

`orders` has 31 columns; `order_items` has 14. Three status axes:

| Column | Constrained? | Values |
|---|---|---|
| `status` | ✅ CHECK | pending, processing, shipped, delivered, cancelled |
| `payment_status` | ❌ no CHECK | pending, awaiting_cod, … (set in code) |
| `shipping_status` | ❌ no CHECK | default `label_created` |

Only one of the three is constrained by the database. See `22`.

Admin routes: list, single, bulk-update, per-order update, customer view,
customer notes, coupons. All behind `requireAdminPermission(FULL_ACCESS)`.

Events emitted: `ORDER_CREATED`, `ORDER_PAID`, `ORDER_PAYMENT_FAILED`,
`ORDER_STATUS_CHANGED`, `ORDER_SHIPPED` — into `outbox_events`, in the same
transaction as the business write (`server/src/events.js`).

---

## Gaps

| Gap | Status | Impact |
|---|---|---|
| No server-side cart | `MISSING` | No cross-device cart, no abandonment recovery, no cart analytics |
| No `order.pet_id` | `MISSING` | `orders.pet_name` is a **string**. Purchase history cannot be attributed to a pet by key — this blocks `PURCHASE_DERIVED` facts (`05`), reorder prediction, and pet-aware Buy Again |
| No inventory quantity | `MISSING` | `in_stock` boolean only. Nothing decrements, nothing reserves; two customers can buy the last unit |
| No refunds / returns | `MISSING` | `cancelled` is the only reversal, and it moves no money |
| No `ORDER_DELIVERED` event | `MISSING` | `ORDER_SHIPPED` is the last declared one |
| No reorder scheduling | `PARTIALLY IMPLEMENTED` | `order_type='auto-restock'` is accepted and stored; nothing acts on it. `business_products.auto_restock` and `restock_interval_days` exist and are also unread |
| `payment_status` / `shipping_status` unconstrained | `NEEDS EXTENSION` | Typos become states |
| Address stored twice | `DUPLICATED` | `orders.shipping_address` (jsonb snapshot) **and** `shipping_profiles` (19 cols). The snapshot is correct — an order must keep the address it shipped to — but which one the checkout prefills from should be stated |
| Idempotency on order creation | `UNKNOWN` | A retried POST may create a second order; not verified in this audit |

### `order.pet_id` is the highest-value single column in this document

Adding it turns every order into evidence about a pet. Without it, "Buy Again",
reorder prediction, `PURCHASE_DERIVED` preferences and pet-aware
recommendations are all guesses keyed on a free-text name that a user can
mistype or change.
