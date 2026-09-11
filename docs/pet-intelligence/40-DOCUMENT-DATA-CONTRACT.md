# 40 — Document Data Contract

## The governing rule

> **Documents are evidence. Extracted data is derived from evidence.**
> The original is never replaced, never modified, and stays downloadable — including
> after extraction fails.

---

## What exists

```
pet_documents
  id, user_id, pet_id, document_type, title, description,
  file_url, file_name, file_size, content_type, storage_key,
  uploaded_at, updated_at
```

Thirteen columns. **No status, no extraction, no confidence, no content hash, no
document date.** `document_type` defaults to `'other'` and is whatever the owner
picked from a dropdown — a label, not a classification.

### What is already right and must be kept
- **Content validated by magic bytes**, not the declared MIME: PDF `%PDF-`, PNG
  signature, WebP `RIFF`/`WEBP`, HEIC by ISO brand, DOCX requiring
  `[Content_Types].xml` and rejecting `vbaProject.bin`.
- **Owner-only serving.** `servePublicUpload` looks the storage key up in
  `pet_documents` first; if it is a document, the request must be authenticated
  **and** be the owner, and it is served `isPrivate` + `sandbox`.
- **The chat can already read a document.** `POST /api/ai/chat` accepts
  attachments and the prompt instructs the model to summarise and triage, not
  diagnose, and to say what OCR is uncertain about. `document_analysis` is a
  seeded `ai_features` slug.

So the capability exists and is metered. What is missing is **persistence**: the
reading is shown once and discarded.

### And a shape that already exists with no producer
`src/contexts/CentralBrainContext.tsx` defines `OcrRecord`:

```ts
{ vaccination_type, vaccination_date, vaccination_expiry,
  treatment_type, treatment_date, diagnosis, chip_number, provider_name }
```

`setOcrRecords([])` is hardcoded, so `detectDiscrepancies` — which compares chip
number and vet name against the profile — is live code that can never fire. The
extraction contract was designed in the browser and never given a server.

---

## §16 — The dictionary

| Field | Category | Status |
|---|---|---|
| `pet_document` (the file) | **DOCUMENT** | ✅ exists |
| `document_type` (owner's label) | CORE_ATTRIBUTE of the document | ✅ exists |
| `classified_type` (system's classification) | DERIVED | `MISSING` |
| `document_source` | CORE_ATTRIBUTE | `MISSING` — see below |
| `document_date` (the date **on** the document) | CORE_ATTRIBUTE | `MISSING` |
| `uploaded_at` | CORE_ATTRIBUTE | ✅ exists |
| `processing_status` | state | `MISSING` |
| `extraction_status` | state, per extraction | `MISSING` |
| `review_status` | state | `MISSING` |
| extracted values | **OBSERVATION / FACT candidates** | `MISSING` |

### `document_date` vs `uploaded_at` — not cosmetic
A March visit summary uploaded in September **describes March**. `observed_at` on
every resulting fact comes from `document_date`, never from `uploaded_at`.
Getting this wrong makes a six-month-old weight look like today's, and `45`'s
recency tie-break then resolves in the wrong direction.

### `document_source`
```
OWNER_UPLOAD | VET_PORTAL | EMAIL_FORWARD | INTEGRATION | MIPO_GENERATED
```
Only the first exists. It is declared now because source affects trust: a
document received directly from a clinic integration is stronger evidence than a
photo of a photo, and the fact hierarchy in `45` should be able to say so.

---

## Schema additions

```
pet_documents
  + status              UPLOADED | PROCESSING | PROCESSED | FAILED
                        | REVIEW_REQUIRED | ARCHIVED
  + content_hash        sha256, per pet — duplicate detection
  + classified_type, classified_confidence
  + document_source
  + document_date
  + processed_at, processing_error, attempts
  + ai_request_id       → ai_requests

pet_document_extractions
  id, document_id, extraction_run_id
  namespace, key                      -- must exist in pet_fact_definitions (46)
  raw_value, normalized_value, unit
  confidence
  page, bbox                          -- provenance INSIDE the file
  status  PROPOSED | ACCEPTED | REJECTED | SUPERSEDED
  promoted_fact_id → pet_facts
  reviewed_by, reviewed_at

document_extraction_runs
  id, document_id, model, prompt_version, ai_request_id,
  started_at, finished_at, status, error
```

Two of these earn their place:

- **`ai_request_id`** — the AI Gateway already writes `ai_requests` /
  `usage_events` / `cost_events` per call, so every extracted fact becomes
  traceable to the exact model call, prompt version and cost. That is provenance
  the system supports **today**, for free.
- **`page` + `bbox`** — provenance inside the file. "28.2 kg, page 2" is a link a
  reviewer acts on in two seconds. "28.2 kg, from a document" is a five-minute
  hunt.

---

## State machines

```
DOCUMENT
UPLOADED ─► PROCESSING ─┬─► PROCESSED ─► ARCHIVED
                        ├─► REVIEW_REQUIRED ─► PROCESSED
                        └─► FAILED ─(retry)─► PROCESSING

EXTRACTION
PROPOSED ─┬─► ACCEPTED ─► promoted_fact_id set
          ├─► REJECTED
          └─► SUPERSEDED   (a later run read the same field better)
```

`REVIEW_REQUIRED` is reached by: low extraction confidence, a clinical value
needing confirmation, multiple pets named, a contradiction with an existing fact,
or an illegible scan.

**`PROCESSING` needs a maximum age and an automatic transition to `FAILED`.**
There is precedent for the failure: `pet_characters` can wedge in
`generating_*` because a job that hangs rather than throws never clears its
in-memory flag.

---

## Failure handling

| Case | Behaviour |
|---|---|
| OCR fails | `FAILED`. **The file is always still there and downloadable.** Retry is manual and idempotent on `content_hash` |
| Extraction incomplete | Partial extractions accepted, each with its own confidence. **Absence is never a fact** — a missing weight does not mean no weight |
| Multiple pets named | Never guessed. `REVIEW_REQUIRED`; the owner picks from their own pets by name |
| Contradicts existing data | Clinical ⇒ both `DISPUTED`, ask once, restrictive reading holds. Non-clinical ⇒ resolve by rank silently (`45`) |
| Fact outdated | The new fact closes the old with `effective_to`. The old row stays |
| Wrong pet attached | Re-attaching moves extractions: facts on the old pet close with reason `reattached`, new facts open on the correct pet |
| Duplicate upload | `content_hash` per pet ⇒ link to the existing document, do not re-extract, do not re-charge |
| Not a medical document | `PROCESSED` with zero extractions. Not a failure |
| Illegible scan | `REVIEW_REQUIRED`, reason `illegible`, and the owner is asked for a better photo — not told nothing happened |
| Document deleted | Facts it produced are **closed with reason `source_deleted`**, never orphaned |

---

## Auto-accept vs confirm

| Extracted | Auto? | Why |
|---|---|---|
| Weight, temperature, lab value | ✅ | a reading, and volatile — a wrong one is superseded by the next |
| Visit date, clinic, vet name | ✅ | record metadata |
| Vaccination type + date + due | ⚠️ confirm | drives reminders and legal compliance |
| **Allergy, diagnosis, medication, dose** | ❌ **always confirm** | clinical (`33`, `45`) |
| Species/breed contradicting `pets` | ⚠️ confirm | identity, not measurement |
| Neuter status | ⚠️ confirm | clinical, rarely changes |
| Microchip contradicting `pets` | ⚠️ confirm | `detectDiscrepancies` already anticipated exactly this case |

### Rules for asking
- **One review screen per document**, batching every question it raises.
- **Never block.** An unreviewed document stops nothing; the restrictive reading
  holds and it waits.
- **Never ask what the owner cannot judge.** Two OCR passes disagreeing is an
  extraction-quality problem — it goes to `REVIEW_REQUIRED`, not to the owner.

---

## Privacy

`SENSITIVE` throughout (`50`). Owner-only, private directory, `0600` in a `0700`
directory, `isPrivate` + `sandbox` on serve. Extractions inherit the document's
class. A document grant in `49` covers documents **and** the facts derived from
them — a grantee who can read the PDF but not its extracted weight is a
distinction without a difference.

**`ai_consent_given` must be checked** before extraction: it sends a medical
record to a third-party model. It is stored today and read nowhere.

## Retention

Life of the pet + 7 years, then archive (`48`). Never hard-deleted while the
owner's account lives, except on explicit request — and that request must also
close the derived facts.
