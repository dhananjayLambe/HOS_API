---
owner: consultations_core-team
module: consultations_core
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# Validations — consultations_core

| Validation | Reason |
|---|---|
| Encounter transitions via state machine only | INV-008 |
| No reverse encounter status | INV-003 |
| Pre-consultation editable only in allowed states | UX lock rules |
| End consultation requires confirmation | Medico-legal lock |
| Prescription finalize before WhatsApp send | Delivery integrity |
| Dynamic pre-consultation template validation | See HOS_API/docs DYNAMIC_VALIDATION_GUIDE |
| Investigation order requires active encounter | Clinical context |

## Template validation

Dynamic fields validated per template schema from `consultation_config` and instruction templates.

## Prescription rules

`PRESCRIPTION_TIMING_SLOT_MAX` limits timing slots in WhatsApp summary.

| Trace | Location |
|---|---|
| Implemented In | `services/end_consultation_service.py` |
| Config | [CONFIGURATION.md](../../shared_docs/CONFIGURATION.md) |
