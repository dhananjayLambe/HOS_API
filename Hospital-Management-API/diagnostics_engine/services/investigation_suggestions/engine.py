from __future__ import annotations

import time

from django.conf import settings

from consultations_core.models import ClinicalEncounter

from .audit import log_suggestion_event
from .cache import get_cached_payload, make_context_hash, set_cached_payload, suggestion_cache_key
from .candidate_generator import CandidateGenerator
from .constants import (
    DEFAULT_LIMIT_COMMON,
    DEFAULT_LIMIT_PACKAGES,
    DEFAULT_LIMIT_RECOMMENDED,
    DEFAULT_MAX_PER_CATEGORY,
    ENGINE_VERSION,
    MAX_PACKAGE_SIZE,
)
from .context_builder import ContextBuilder
from .post_processor import PostProcessor
from .ranker import Ranker
from .response_builder import ResponseBuilder
from .rule_engine import RuleEngine


class InvestigationSuggestionEngine:
    def __init__(self, encounter: ClinicalEncounter):
        self.encounter = encounter

    def run(self) -> dict:
        started = time.perf_counter()
        ctx = ContextBuilder.build(self.encounter)
        context_fingerprint = {
            "doctor_id": ctx.doctor_id,
            "patient_id": ctx.patient_id,
            "diagnosis_ids": sorted(ctx.diagnosis_ids),
            "symptom_ids": sorted(ctx.symptom_ids),
            "selected_test_ids": sorted(ctx.selected_test_ids),
        }
        cache_key = suggestion_cache_key(str(self.encounter.id), make_context_hash(context_fingerprint))

        if getattr(settings, "ENABLE_SUGGESTIONS", True):
            cached = get_cached_payload(cache_key)
            if cached:
                return cached

        candidates = CandidateGenerator.generate(ctx.doctor_id)
        RuleEngine.apply(candidates, ctx.diagnosis_ids, ctx.symptom_ids)
        ranked = Ranker.score(candidates, ctx.selected_test_ids, ctx.recent_test_days)

        max_common = int(getattr(settings, "INV_SUGGEST_MAX_COMMON", DEFAULT_LIMIT_COMMON))
        max_recommended = int(getattr(settings, "INV_SUGGEST_MAX_RECOMMENDED", DEFAULT_LIMIT_RECOMMENDED))
        max_packages = int(getattr(settings, "INV_SUGGEST_MAX_PACKAGES", DEFAULT_LIMIT_PACKAGES))
        max_per_category = int(getattr(settings, "INV_SUGGEST_MAX_PER_CATEGORY", DEFAULT_MAX_PER_CATEGORY))

        recommended_rows = PostProcessor.apply_diversity_and_limits(
            ranked,
            max_per_category=max_per_category,
            max_recommended=max_recommended,
        )
        common_rows = sorted(ranked, key=lambda c: (-c.doctor_usage, -c.global_usage))[:max_common]

        recommended_packages = []
        popular_packages = []
        if getattr(settings, "ENABLE_PACKAGE_SUGGESTIONS", True):
            recommended_packages = ResponseBuilder.build_recommended_packages(
                ctx.selected_test_ids,
                max_packages=max_packages,
                max_package_size=int(getattr(settings, "INV_SUGGEST_MAX_PACKAGE_SIZE", MAX_PACKAGE_SIZE)),
            )
            popular_packages = ResponseBuilder.build_popular_packages(max_packages=max_packages)

        if not recommended_rows and not common_rows:
            common_rows = sorted(candidates.values(), key=lambda c: -c.global_usage)[:max_common]

        payload = {
            "engine_version": ENGINE_VERSION,
            "selected_tests": [{"id": i} for i in sorted(ctx.selected_test_ids)],
            "common_tests": ResponseBuilder.build_tests(common_rows),
            "recommended_tests": ResponseBuilder.build_tests(recommended_rows),
            "recommended_packages": recommended_packages,
            "popular_packages": popular_packages,
        }

        latency_ms = int((time.perf_counter() - started) * 1000)
        log_suggestion_event(
            {
                "encounter_id": str(self.encounter.id),
                "doctor_id": ctx.doctor_id,
                "context": {
                    "symptoms": ctx.symptom_ids,
                    "diagnosis": ctx.diagnosis_ids,
                },
                "suggestions": [
                    {"test_id": item["id"], "score": item["score"], "source": [item["reason"]]}
                    for item in payload["recommended_tests"]
                ],
                "selected_by_doctor": sorted(ctx.selected_test_ids),
                "latency_ms": latency_ms,
                "engine_version": ENGINE_VERSION,
                "endpoint": "/api/diagnostics/investigations/suggestions/",
            }
        )
        if getattr(settings, "ENABLE_SUGGESTIONS", True):
            set_cached_payload(cache_key, payload)
        return payload

