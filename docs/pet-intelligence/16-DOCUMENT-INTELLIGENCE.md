# 16 — Document Intelligence

## Today: storage, done well; intelligence, absent

```
POST /api/me/documents
  → decodeAndValidateDataUrl()      magic bytes, not the declared MIME
  → write to PRIVATE_UPLOAD_DIR     0600 file in a 0700 directory
  → insert pet_documents            13 columns
  → 201.  End of pipeline.
```

`pet_documents` has no status, no extraction, no confidence, no content hash.
`document_type` defaults to `'other'` and is whatever the owner picked from a
dropdown — a label, not a classification.

### What is already right and must be kept

- **Content validation by magic bytes.** PDF `%PDF-`, PNG signature, WebP
  `RIFF`/`WEBP`, HEIC by ISO brand, DOCX requiring `[Content_Types].xml` and
  rejecting `vbaProject.bin`.
- **Owner-only serving.** `servePublicUpload` looks the storage key up in
  `pet_documents` first; if it is a document the request must be authenticated
  **and** be the owner, and the file is served with `isPrivate` and `sandbox`.
- **The chat can already read a document.** `POST /api/ai/chat` accepts
  attachments (`attachmentReferences`) and the system prompt instructs the model
  to summarise and triage, not diagnose, and to say what OCR is uncertain about.
  The `document_analysis` feature slug is seeded in `ai_features`.

So the *capability* exists and is metered through the AI Gateway. What is missing
is **persistence**: the model's reading of a document is shown once and
discarded. Nothing reaches `pets`, `pet_documents`, or any fact.

---

## The pipeline

```
upload ──► store (unchanged) ──► content hash ──► duplicate?
                                                     │ yes → link, stop
                                                     │ no
                                              classify (AI Gateway)
                                                     │
                                              OCR / vision extraction
                                                     │
                                              normalize + validate
                                                     │
                                              confidence scoring
                                                     │
                            ┌────────────────────────┴──────────────┐
                     non-clinical &                          clinical, OR
                     high confidence                    low confidence, OR
                            │                          multi-pet, OR conflict
                            │                                     │
                     auto-accept                          REVIEW_REQUIRED
                            │                                     │
                            │                            one batched question
                            │                                     │
                            └────────────┬────────────────────────┘
                                         │
                              pet_facts (VET_DOCUMENT)
                                         │
                    ┌────────────────────┼──────────────┬─────────────┐
              timeline (08)      recompute derived   CRM (21)   matching (18)
```

**The document is canonical evidence. Facts are derived records.** The file is
never modified, never replaced by its extraction, and always downloadable —
including after an extraction fails.

---

## Schema additions

```
pet_documents
  + status              UPLOADED | PROCESSING | PROCESSED | FAILED
                        | REVIEW_REQUIRED | ARCHIVED
  + content_hash        sha256 — duplicate detection
  + classified_type     distinct from the owner's document_type label
  + classified_confidence
  + document_date       the date on the document, not the upload date
  + processed_at, processing_error, attempts
  + ai_request_id       → ai_requests

pet_document_extractions
  id, document_id, extraction_run_id
  namespace, key                    -- must exist in pet_fact_definitions
  raw_value, normalized_value, unit
  confidence
  page, bbox                        -- provenance *inside* the file
  status      PROPOSED | ACCEPTED | REJECTED | SUPERSEDED
  promoted_fact_id → pet_facts
  reviewed_by, reviewed_at

document_extraction_runs
  id, document_id, model, prompt_version, ai_request_id,
  started_at, finished_at, status, error
```

Two of these deserve a note:

- **`ai_request_id`** — because the AI Gateway already writes
  `ai_requests` / `usage_events` / `cost_events` per call, every extracted fact
  becomes traceable to the exact model call, prompt version and cost that
  produced it. That is provenance the system can support today, for free.
- **`page` + `bbox`** — provenance inside the file. "28.2 kg, page 2" is a link
  the reviewer can act on in two seconds; "28.2 kg, from a document" is a
  five-minute hunt.

`document_date` matters for `06`: a March document uploaded in September
describes March. `observed_at` on the resulting facts comes from
`document_date`, never from `uploaded_at`.

---

## §19 — Document conflicts, worked

Existing: `physical.weight = 28 kg`. New document says 30 kg.

`physical.weight` is **volatile** (`06`), so this is not a conflict — it is two
observations of a changing quantity:

```
pet_observations   28 kg @ 2026-06-01 (USER_PROVIDED)
                   30 kg @ 2026-09-09 (VET_DOCUMENT, doc_123, page 1)

physical.weight    28  from 06-01 to 09-09   SUPERSEDED
                   30  from 09-09 to null    CURRENT
```

| Question | Answer |
|---|---|
| Do both remain? | Yes. Both observations, both fact periods. |
| How is the current value chosen? | Latest `observed_at`; rank breaks ties. |
| How is history preserved? | `effective_to` on the closed period. Never deleted. |
| What does the Store see? | 30 kg — the current fact, one indexed read. |
| What does the CRM show? | 30 kg, its source, and the trend across both points. |

Now make it a **clinical** key instead — the document says "no chicken
sensitivity" against a recorded allergy. Then it *is* a conflict, both go
`DISPUTED`, the restrictive reading holds (chicken stays excluded), and the owner
is asked once. Full walkthrough in `05`.

---

## Failure handling — every branch defined

| Case | Behaviour |
|---|---|
| **OCR fails** | `FAILED`. The file is always still there and downloadable. Retry is manual and idempotent on `content_hash`. |
| **Extraction incomplete** | Partial facts accepted, each with its own confidence. **Absence is never a fact** — a missing weight does not mean no weight. |
| **Multiple pets named** | Never guessed. `REVIEW_REQUIRED`, and the owner picks from their own pets by name. |
| **Contradicts existing data** | `06`. Clinical ⇒ both `DISPUTED`, ask once. Non-clinical ⇒ resolve by rank silently. |
| **Fact is outdated** | The new fact closes the old with `effective_to`. The old row stays. |
| **Wrong pet attached** | Re-attaching moves the extractions with the document: facts on the old pet are closed with reason `reattached`, new facts open on the correct pet. |
| **Duplicate upload** | `content_hash` per pet. Same bytes, same pet ⇒ link to the existing document, do not re-extract, do not re-charge. |
| **Not a medical document at all** | Classification says so; status `PROCESSED` with zero extractions. Not a failure. |
| **Unreadable scan** | `REVIEW_REQUIRED` with reason `illegible`, and the owner is asked for a better photo — not told nothing happened. |
| **The pipeline hangs** | `PROCESSING` needs a maximum age and an automatic transition to `FAILED`. See below. |

---

## Auto-accept vs confirm

| Extracted | Auto-accept? | Why |
|---|---|---|
| Weight, temperature, a lab value | ✅ | a reading, and volatile — a wrong one is superseded by the next |
| Visit date, clinic name, vet name | ✅ | record metadata |
| Vaccination type + date + next due | ⚠️ confirm | drives reminders and legal compliance |
| **Allergy, diagnosis, medication, dose** | ❌ **always confirm** | `is_clinical` under `04` |
| Species or breed disagreeing with `pets` | ⚠️ confirm | identity, not measurement |
| Neuter status | ⚠️ confirm | clinical, and rarely changes |

### Rules for asking
- **One review screen per document**, batching every question it raises. Never a
  drip of prompts.
- **Never block.** An unreviewed document does not stop anything; the restrictive
  reading holds and it waits.
- **Never ask what the owner cannot judge.** Two OCR passes disagreeing is an
  extraction-quality problem — it goes to `REVIEW_REQUIRED` on the document, not
  to the owner as a question about their pet.

---

## Dependencies

| Needs | Why |
|---|---|
| `pet_facts` + registry (`03`) | nowhere to put an extraction otherwise |
| A **durable job runner** | OCR is slow and must survive a restart. There is none today: the only real background work is a promise chain in the API process (`docs/system-workflows/25`), and `resumePetCharacterJobs()` is the pattern that makes it survivable. |
| Ingredient vocabulary (`10`) | to normalize an extracted allergen against the catalogue |
| AI Gateway | already there — Gemini vision, already metered, already how chat reads attachments. **No new provider, no new credential.** |

OCR provider: use the Gateway. Adding Textract or Tesseract means a new vendor, a
new credential and a second place AI spend happens outside the ledger, for a
capability the system already has and already meters.
