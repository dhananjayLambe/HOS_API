# Relationship Resolver

`RelationshipResolver` resolves identifier workflow chains across SupportTrace rows. It does not store relationships — it discovers them at query time.

## Workflow chain

```
Patient Account → Consultation → Recommendation → Booking → Routing → Report → Communication
```

`IDENTIFIER_WORKFLOW_CHAIN` defines ordered `IdentifierType` values for M5.7 incident reconstruction.

## API

```python
from support_trace.identifiers.relationship_resolver import RelationshipResolver

RelationshipResolver.collect_identifiers(trace)      # dict of non-null fields
RelationshipResolver.resolve_related_traces(trace)     # expand from single trace
RelationshipResolver.expand(traces)                    # expand from match set
```

## Expansion strategy

For each seed trace:

1. Query other traces sharing any identifier column value
2. Walk `parent_workflow_instance_id` up
3. Find children by `parent_workflow_instance_id`
4. Find siblings by `correlation_id`

Results exclude seed traces; deduplicated by `workflow_instance_id`.

## M5.7 preparation

Incident reconstruction (M5.7) reuses `RelationshipResolver` without architectural changes.

## Performance

Relationship expansion target: **<30 ms** per lookup (verified in integration tests).
