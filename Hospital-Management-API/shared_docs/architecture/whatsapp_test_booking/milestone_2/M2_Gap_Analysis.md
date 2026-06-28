# M2 — Gap Analysis

| Capability | Exists | Action |
|---|---|---|
| Package expansion | Yes | Reuse `normalize_package_composition` |
| Service ID extraction | Yes | New `extract_required_service_ids` |
| Pricing quote | Yes | Reuse `PricingQuoteService` |
| Eligibility | Yes | Reuse `evaluate_requirements` |
| Ranking | Yes | Reuse `RankingEngine.rank` |
| Location resolution | Yes | New `resolve_routing_location_for_context` |
| Collection mode | Yes | New `derive_sample_collection_mode` |
| Recommendation service | **Built M2** | `LabRecommendationService` |
| Recommendation DTO | **Built M2** | `RecommendationResult` |
| Recommendation REST API | No | Milestone 3 |
| WhatsApp flow | No | Milestone 4 |
| DB audit for recommendation | No | Future (app logs only in M2) |
