# Unified Consultation Tagging Standard

## Core Rule

Each consultation item must expose:

- `name`
- `is_custom` (data source tag)
- `is_complete` (runtime UX status)

`is_complete` is frontend runtime state in this phase. Backend must validate by fields and must not trust `is_complete`.

## UI Placement

- Chips (left/middle): show only `[Item Name] [CUSTOM]` when `is_custom === true`.
- Right panel: show only `Complete` or `Incomplete`.

Color semantics:

- Complete: green
- Incomplete: yellow/gray
- Error: red (reserved for future)

## Canonical Frontend Shape

```ts
type SectionItem = {
  id?: string;
  name: string;
  is_custom: boolean;
  is_complete: boolean;
  status?: "editing" | "saved";
  meta?: Record<string, any>;
};
```

## State Flow

- Add item -> `is_complete = false`
- Edit item -> `is_complete = false`
- Clear required field -> `is_complete = false`
- Valid item update -> `is_complete = evaluator(item)`

## Completion Evaluators

- Symptoms: requires `name`
- Findings: requires `name` and `meta.value` (or observation field per backend validator)
- Diagnosis: requires `name` (or valid ICD/key at backend)
- Medicines: requires dose, frequency, duration

## Payload Contract (Frontend)

All sections should include:

```json
{
  "name": "Body Pain",
  "is_custom": true,
  "is_complete": true,
  "meta": {
    "duration": "2 days"
  }
}
```

## Backend Validation Contract

Backend must never gate save by `item["is_complete"]`.

Backend must always:

1. Validate required fields per section item
2. Raise section-scoped validation errors for missing fields
3. Persist only validated data

