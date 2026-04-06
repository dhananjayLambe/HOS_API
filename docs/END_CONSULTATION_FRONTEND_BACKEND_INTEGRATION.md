# End Consultation Integration (Frontend + API)

## 1. Scope

This document defines the final commit flow of a consultation until:
- data is persisted in DB
- encounter is completed (locked)

In scope:
- UI confirmation flow
- full payload assembly
- API contract (request + response)
- backend orchestration (transactional)
- prescription creation from medicines

Out of scope (next phase):
- PDF generation
- prescription preview/download
- patient sharing (WhatsApp/SMS)

## 2. Current Status

Available:
- end consultation UI + popup
- centralized consultation store
- end consultation API endpoint
- backend persistence for symptoms/findings/diagnosis

Gap:
- unified payload from frontend to backend
- medicines to prescription persistence before encounter completion

## 3. Final Integration Flow

User clicks End Consultation -> popup confirmation -> frontend builds full payload -> POST to end-consultation API -> backend transaction persists sections and prescription -> backend completes encounter -> frontend resets store and redirects.

## 4. API Contract

### Endpoint

`POST /consultations/encounter/{encounter_id}/consultation/complete/`

### Request Payload

```json
{
  "mode": "commit",
  "store": {
    "sectionItems": {
      "symptoms": [],
      "findings": [],
      "diagnosis": [],
      "medicines": [],
      "investigations": [],
      "instructions": []
    },
    "meta": {
      "consultation_type": "FULL",
      "follow_up": {
        "date": "",
        "interval": 0,
        "unit": "days",
        "reason": ""
      }
    }
  }
}
```

### Success Response (Current Phase)

```json
{
  "status": "success",
  "redirect_url": "/doctor-dashboard"
}
```

### Error Response

```json
{
  "status": "error",
  "message": "Validation failed",
  "errors": {
    "medicines": ["Invalid drug_id"],
    "diagnosis": ["Required"]
  }
}
```

Frontend should handle both top-level `message` and field-level `errors`.

## 5. Frontend Integration

### 5.1 Payload builder

Create `consultation-payload-builder.ts`.

Rules:
- use `store.sectionItems` as source of truth
- apply findings/diagnosis adapters
- never send partial payload

### 5.2 API call

```ts
const payload = buildEndConsultationPayload(store);
await backendAxiosClient.post(
  `/consultations/encounter/${encounterId}/consultation/complete/`,
  payload
);
```

### 5.3 UI behavior

On submit:
- show loader
- disable confirm button

On success:
- reset store
- redirect to `/doctor-dashboard`

On error:
- show toast
- keep popup open for retry

### 5.4 Duplicate submit protection

Frontend must disable after first click and prevent multiple API submissions.

## 6. Backend Integration

### 6.1 Request handling

Extract from:

`section_items = request.data.get("store", {}).get("sectionItems", {})`

Legacy fallback support may remain for older callers.

### 6.2 Service call

`persist_consultation_end_state(consultation=consultation, payload=request.data, user=request.user)`

### 6.3 Execution order (critical)

1. Persist sections (symptoms/findings/diagnosis/medicines)
2. Create/finalize prescription (inside persistence)
3. Then call `complete_consultation()`

Locking must happen after persistence.

### 6.4 Medicines to prescription rules

- if medicines exist: create `Prescription`, create `PrescriptionLine`, finalize
- if medicines are empty: skip safely without error

### 6.5 Transaction rules

Whole commit flow runs in `transaction.atomic`.
Any failure rolls back entire commit.

### 6.6 Idempotency behavior

If consultation is already finalized, API returns a `400` contract error response (not success).

## 7. Validation and Test Checklist

- Full flow: all sections present -> persisted and encounter completed
- Medicines only: prescription and lines created/finalized
- No medicines: consultation completes without crash
- Invalid data: error response and no partial writes
- Double submit: UI prevents duplicate API calls

## 8. Non-negotiable Rules

Do not:
- send partial payload
- call commit API outside popup confirmation
- split final commit across multiple APIs

Always:
- send full payload
- use a single endpoint
- keep persistence and lifecycle logic in backend

## 9. Phase Exit Criteria

Phase is complete when:
- frontend sends full payload from popup
- backend persists all in-scope sections including medicines
- encounter transitions to completed only after successful persistence
- no PDF logic is added in this phase
