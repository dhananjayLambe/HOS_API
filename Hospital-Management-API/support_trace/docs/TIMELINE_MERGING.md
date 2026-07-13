# Timeline Merging and Ordering

## Merge

`TimelineMerger.merge()` concatenates adapter outputs and:

- Dedupes by `(reference_type, reference_id)`
- Sorts via `TimelineSorter`
- Assigns `timeline_sequence` 1..N

## Sort key (deterministic)

```
(timestamp, category_priority, sequence_no or 0, reference_type, reference_id)
```

Identical timestamps: business `sequence_no` breaks ties.

## Grouping (before statistics)

- `group_by_workflow(events)`
- `group_by_category(events)`
- `group_by_tag(events)`

Statistics computed after grouping for accurate per-workflow metrics.

## Workflow graph

`TimelineGraphBuilder` produces:

- `nodes` — workflow instances with depth and status
- `edges` — `parent_child` and `correlation` links
- `as_tree()` — nested dict for M5.7 visualization
