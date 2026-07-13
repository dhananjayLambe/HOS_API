# Decision Snapshot Schema

Permanent explainability record stored at `new_value.payload.decision_snapshot`. No separate table.

## Required on terminal success

Present on every `routing.lab_assigned` and `routing.manual_override`.

## Top-level fields

| Field | Description |
|-------|-------------|
| `decision_id` | Per-attempt UUID |
| `routing_id` | Workflow instance |
| `booking_id` | Order ID when post-booking; null for marketplace-only |
| `attempt_number` | Retry counter (1..N per order) |
| `strategy` | `DecisionStrategy` enum (e.g. `HYBRID`) |
| `rule_id` | Engine rule identifier (e.g. `hybrid_scoring_v1`) |
| `rule_version` | Semver + weights fingerprint |
| `selected_lab_id` / `selected_branch_id` | Winner |
| `selected_score` / `selected_rank` | Hybrid score and rank 1 |
| `confidence` | Float 0–1 mapped from `RecommendationConfidence` |
| `weights` | Price, SLA, distance, quality percentages |
| `candidate_labs` | Ranked list with score, price, SLA, labels |
| `rule_results` | Per-rule pass/fail outcomes |
| `rejected_labs` | Structured rejection reasons |
| `explanation` | Summary, decision path, why-not-selected |
| `provider_response` | Marketplace counts (returned/filtered/selected) |
| `decision_reason` | Human-readable selection reason |
| `timings_ms` | evaluation, comparison, discount, routing durations |

## Builder

`business_audit.decision.snapshot_builder.build_decision_snapshot()` assembles the payload from eligibility candidates, ranked labs, and routing runtime context.
