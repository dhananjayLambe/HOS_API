# Search Planner

`SearchPlanner` decides the execution order for identifier lookups. M5.6 REST APIs can expose planner options without changing repository code.

## Plan steps

Default order for a `DetectedIdentifier`:

```
1. EXACT   — indexed column exact match
2. PREFIX  — __istartswith (if strategy.supports_partial_search())
3. PARTIAL — __icontains (if strategy.supports_partial_search())
4. RELATIONSHIP — RelationshipResolver.expand() (after match)
```

## API

```python
from support_trace.identifiers.search_planner import SearchPlanner

plan = SearchPlanner.plan(detected, expand_relationships=True, exact_only=False)
```

Typed lookups use `plan_for_field(field_name, value, identifier_type=...)`.

## SearchStrategy enum

| Value | Meaning |
|-------|---------|
| `exact` | `SupportTrace.objects.filter(**{field: value})` |
| `prefix` | `field__istartswith` with `PARTIAL_SEARCH_LIMIT` (25) |
| `partial` | `field__icontains` with limit |
| `relationship` | Expand via shared identifiers, parent/child, correlation |

## M5.6 mapping

| Query param | Planner option |
|-------------|----------------|
| `exact_only=true` | Skip prefix/partial steps |
| `expand_relationships=false` | Skip relationship expansion |

## Performance

| Step | Target |
|------|--------|
| Exact | <10 ms |
| Prefix / partial | <50 ms |
| Relationship expansion | <30 ms |
