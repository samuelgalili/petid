# 15 — AI Workflows

## Status: `EXISTS` and `REUSABLE` — the strongest subsystem in the codebase

`server/src/aiGateway.js` states its own contract:

> Every AI call in Mipo goes through `runAiRequest`. Features ask for a feature
> slug and a capability; they do not name a provider, hold a key, or touch the
> ledgers.

```
feature slug + capability
        │
   runAiRequest ──► catalogue (60 s cache) ──► model selection
        │                                       (enabled provider,
        │                                        capability match)
        │
   adapter (aiProviders.js) ──────────► provider HTTP
        │                               45 s timeout, AbortController
        │
   ┌────┴─────────────────────────────┐
   │  one transaction, idempotent on  │
   │  the caller's request_id         │
   │                                  │
   │  ai_requests   (the call)        │
   │  usage_events  (tokens/units)    │
   │  cost_events   (money)           │
   └──────────────────────────────────┘
```

Accounting is written **after** the provider call because a provider call
cannot be inside a database transaction. The design assumes the
crash-after-success case and makes the retry safe rather than pretending the
whole thing is atomic. That is the right trade, stated in the file.

## The layers the brief asks about

| Layer | Status | Where |
|---|---|---|
| AI Gateway | `EXISTS` | `aiGateway.js` |
| Model Router | `EXISTS` | capability + enabled-flag selection over the `ai_models` catalogue |
| Provider Pool | `PARTIALLY IMPLEMENTED` | interface defined; **only Gemini implemented**, and the file says so |
| Usage Measurement | `EXISTS` | `usage_events`, normalised per adapter |
| Cost Engine | `EXISTS` | `aiAccounting.js`, pure and unit-tested |
| Cost Ledger | `EXISTS` | `cost_events` with a pinned `pricing_version_id` |
| Agent Orchestrator | `MISSING` | `agent_task` slug is seeded; nothing implements multi-step runs |

### Three quantities, never collapsed
`aiAccounting.js` keeps them deliberately separate:

```
normalizeProviderUsage → technical tokens, as the provider reported them
calculateMipoCredits   → the product abstraction
calculateProviderCost  → money, from a pinned pricing version
```

> "Nothing here rounds tokens into credits into money in one step. Conflating
> them is the mistake this module exists to prevent."

### Pricing is versioned and dated
`ai_pricing_versions` carries `effective_from`, `effective_to`, `unit_price`,
`unit`, `currency` and `source`. A cost row pins the exact pricing version that
produced it, so an admin figure and a ledger row always reconcile.

**Note this pattern.** `effective_from` / `effective_to` / `source` is exactly
the temporal-provenance shape `05-PET-KNOWLEDGE.md` proposes for pet facts. The
codebase already knows how to do this — in one subsystem.

### Ledger dimensions already include tenancy and the pet
`ai_requests`, `usage_events` and `cost_events` all carry `organization_id`
**and** `pet_id`. The AI layer anticipated a tenant model that no other table
has. Cheap to populate later; nothing to redesign.

## Error handling
`classifyProviderError` maps status/code into an error class;
`sanitizeProviderError` truncates and cleans the message **at `AIProviderError`
construction**, so an unsanitised provider string cannot reach a log or a
ledger row through a later `error.message` read. `ai_requests.status` allows
`fallback`, `timed_out` and `cancelled` alongside the usual states.

---

## Where AI is used

| Use | Feature slug | Routed? | Metered? |
|---|---|---|---|
| Chat assistant | `ai_chat` | ✅ `runAiRequest` | ✅ |
| Product enrichment | `product_enrichment` | ✅ (`productIntel.js:565`) | ✅ |
| Bulk product scan | `product_list_scan` | seeded | — |
| Ingredient analysis | `ingredient_analysis` | seeded | — |
| Health analysis | `health_analysis` | seeded | — |
| Document analysis | `document_analysis` | seeded, used in chat attachments only | ✅ via chat |
| Pet character art | `pet_character` | ❌ **metered, not routed** | ✅ |
| Background removal | — | ❌ | `UNKNOWN` |
| Agent task | `agent_task` | seeded | — |

### The two bypasses, stated fairly

`server/src/petCharacter.js` calls `@google/genai` directly rather than going
through the gateway, and the code explains why:

> "Image generation runs on the Google SDK with its own Vertex credential
> resolution, so it is metered rather than routed — it still belongs in one
> ledger. Priced per image, not per token."

It then calls `aiGateway.recordExternalUsage({ feature: "pet_character",
category: "image", unit: "image", … })`, which is the sanctioned escape hatch:
`recordExternalUsage` exists precisely for consumption that did not go through
an adapter. So **cost visibility is preserved**; what is lost is model routing,
provider failover and the shared timeout policy.

`server/src/backgroundRemoval.js` also calls the Gemini endpoint directly. I did
not find a `recordExternalUsage` call for it — status `UNKNOWN`, worth
checking before it is used at volume.

Classification: `PARTIALLY IMPLEMENTED`, not `CONFLICTING`. The seam is honest
and documented. Bringing image generation behind an adapter is a clean future
change, not a repair.

---

## Where keys live today — and the Connectors requirement

`ai_providers` has six columns: `id, slug, name, is_enabled, created_at,
updated_at`. **There is no key column.** Every credential is an environment
variable read at boot:

```
GEMINI_API_KEY · VERTEX_AI_API_KEY · GOOGLE_CLOUD_PROJECT
RESEND_API_KEY · FIRECRAWL_API_KEY · CARDCOM_* · ADMIN_API_KEY
```

They arrive from AWS SSM Parameter Store via `deploy/aws/sync-ssm-env.sh` into
`/opt/mipo/.env`, which `docker-compose.yml` loads with `env_file`. Production
startup **throws** if `GEMINI_API_KEY` is absent.

Consequences: changing a key requires an SSM write and a container restart, and
there is no in-app way to do it.

**An admin-managed, encrypted Connectors page is therefore a new capability, not
a rewiring of an existing one.** What it needs:

| Piece | Status |
|---|---|
| A place to store an encrypted key | `MISSING` — `ai_providers` has no column |
| An encryption key to encrypt with | `MISSING` in production — `SECRET_ENCRYPTION_KEY` is not in `sync-ssm-env.sh`'s key list |
| Precedent for encrypted-at-rest columns | `EXISTS` — `profiles.id_number_encrypted` |
| Admin-only access | `EXISTS` — `requireAdminPermission(FULL_ACCESS)` |
| Runtime override of an env credential | `MISSING` — `resolvePetCharacterProvider` and the gateway both read env |
| A second provider to switch to | `MISSING` — no Anthropic adapter exists |

Note the last row: adding an Anthropic key to a Connectors page would store a
credential that nothing can use until an adapter exists. `aiProviders.js`
defines exactly what an adapter must satisfy, so that is a bounded piece of
work — but it is a prerequisite, not a consequence.

This is tracked as a design decision in `DECISIONS.md`. It also intersects with
the unmerged `claude/admin-2fa` branch, which is blocked on the same missing
`SECRET_ENCRYPTION_KEY`.

---

## Rules to preserve

1. **The LLM is never the source of truth.** Already enforced for products
   (`catalogRecommendations.js`) and stated in the chat's system prompt
   ("Do not invent facts that are not visible in the document, image, or
   profile"). Extend to facts (`05`), never relax.
2. **Every call is metered.** Anything that cannot be routed uses
   `recordExternalUsage`. No AI spend outside the ledger.
3. **Features name a capability, not a provider.** The seam is what makes
   adding a provider a new file plus a catalogue row.
4. **Provider errors are sanitised at construction**, not at logging time.
