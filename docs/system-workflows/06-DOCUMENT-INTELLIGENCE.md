# 06 — Document Intelligence

## What exists — `PARTIALLY IMPLEMENTED` (storage only)

```
User uploads document
        │
   POST /api/me/documents            requireUser
        │
   decodeAndValidateDataUrl()        magic-byte check, not just MIME
        │
   write to PRIVATE_UPLOAD_DIR       /app/private-uploads (bind mount)
        │
   insert pet_documents row          user-supplied title, type, description
        │
       done.
```

**The pipeline stops there.** There is no classification, no OCR, no
extraction, no validation, no fact creation, no timeline event, and no
recommendation impact. `pet_documents` has 13 columns and none of them is a
status, a processing result, an extracted value, or a confidence.

```
pet_documents: id, user_id, pet_id, document_type, title, description,
               file_url, file_name, file_size, content_type,
               uploaded_at, updated_at, storage_key
```

`document_type` defaults to `'other'` and is whatever the user picked from a
dropdown. It is a label, not a classification.

### What is genuinely good already

**Storage is safe.** `server/src/security.js` validates content by magic bytes
(`%PDF-`, PNG signature, DOCX with `[Content_Types].xml` and no
`vbaProject.bin`), not by the declared MIME type. Documents go to a *private*
directory, and `servePublicUpload` (`server/src/index.js:7480`) looks the
storage key up in `pet_documents` first: if it belongs to a document, the
request must be authenticated **and** be the owner, and the file is served with
`isPrivate` and `sandbox` set. That is a correct design and should be kept.

**The assistant can already read a document — but only in conversation.**
`POST /api/ai/chat` accepts attachments (`attachmentReferences`,
`server/src/index.js:3500`) and the system prompt instructs it to summarise and
triage medical images and documents, not diagnose, and to say what OCR is
uncertain about (`server/src/index.js:3512-3516`). The `document_analysis`
feature slug is seeded in `ai_features` (migration `0026`).

So the *capability* exists and is metered. What is missing is persistence: the
model's reading of a document is shown once and then discarded. Nothing reaches
`pets`, `pet_documents`, or any fact store.

---

## Target workflow (PROPOSED)

```
upload ──► secure storage ──► classify ──► OCR ──► extract ──► normalize
                                                                   │
                                                             validate + score
                                                                   │
                                    ┌──────────────────────────────┤
                                    │                              │
                          confidence >= high                 needs review
                          & non-clinical                           │
                                    │                     user confirmation
                                    │                              │
                                    └──────────────┬───────────────┘
                                                   │
                                          pet_facts (VET_DOCUMENT)
                                                   │
                                    ┌──────────────┼──────────────┐
                                 timeline    CRM update    recommendation
                                  event                       refresh
```

### Failure handling — every branch must be defined

| Case | Required behaviour |
|---|---|
| OCR fails | Document stays `PROCESSING` → `FAILED`. The **file is always still there** and downloadable. Retry is manual and idempotent. |
| Extraction incomplete | Partial facts accepted, each with its own confidence. Absence is never a fact. |
| Multiple pets mentioned | Do not guess. `REVIEW_REQUIRED`; ask which pet, offer the user's pets by name. |
| Contradicts existing data | Both marked `disputed`; user asked. Never silently overwrite (see `05`). |
| Fact is outdated | The new fact closes the old one with `effective_to`; the old row is kept. |
| Wrong pet attached | Re-attaching moves the facts with the document, closing the ones on the old pet. |
| Duplicate upload | Content hash on `pet_documents`; the same bytes for the same pet do not re-extract. |

### What may be auto-accepted vs confirmed

| Extracted | Auto-accept? |
|---|---|
| Weight, temperature, a lab value | ✅ high confidence, it is a reading |
| Visit date, clinic name, vet name | ✅ |
| Vaccination type + date + next due | ⚠️ confirm — it drives reminders and legal compliance |
| Allergy, diagnosis, medication, dose | ❌ **always confirm.** Listed under "must never be inferred" in `05` |
| Species / breed | ⚠️ confirm if it disagrees with `pets.type` |

### Schema additions required (PROPOSED)

```
pet_documents
  + status            uploaded|processing|processed|failed|review_required|archived
  + content_hash      duplicate detection
  + classified_type   distinct from the user's document_type label
  + classified_conf   numeric
  + processed_at, processing_error
  + ai_request_id     → ai_requests, so a reading is traceable to its call

pet_document_extractions
  document_id, key, value(jsonb), unit, confidence,
  page/bbox (provenance inside the file), status, promoted_fact_id
```

`ai_request_id` is the point: because the AI Gateway already writes
`ai_requests` / `usage_events` / `cost_events` per call, linking an extraction
to its request makes every extracted fact traceable to the exact model call,
prompt version and cost that produced it. That is provenance the system can
already support today.

---

## Dependencies and cost

Depends on: `05-PET-KNOWLEDGE.md` (the fact store must exist first) and
`25-BACKGROUND-JOBS.md` (there is no durable queue — see the warning there
about the in-process pattern).

OCR provider: `UNKNOWN`. Nothing is integrated. Gemini vision through the
existing gateway is the option that adds no new vendor, no new credential and
no new billing relationship — and it is already how the chat reads attachments.
