# Decision State Machine (Generic Template)

Generic FSM for Decision Engine Audit. Domain packages map events to these state labels.

## States

| State | Label |
|-------|-------|
| Started | `Started` |
| RuleEvaluated | `RuleEvaluated` |
| Matched | `Matched` |
| Compared | `Compared` |
| Discounted | `Discounted` |
| Assigned | `Assigned` |
| Failed | `Failed` |

## Transitions

```
Started → RuleEvaluated → Matched → Compared → Discounted → Assigned
Started → Failed
Compared → Assigned          (when discount = 0, skip Discounted)
Assigned → ManualOverride → Assigned
```

## Snapshot requirement

| Event | Decision Snapshot |
|-------|-------------------|
| `routing.lab_assigned` | **Mandatory** |
| `routing.manual_override` | **Mandatory** |
| `routing.failed` | Optional partial snapshot when candidates exist |
| All other events | No |

Lab routing instance: [ROUTING_STATE_MACHINE.md](ROUTING_WORKFLOW.md).
