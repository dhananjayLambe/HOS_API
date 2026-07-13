"""Parse HTTP request into InvestigationRequest contract."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from support_trace.api.contracts.investigation import InvestigationRequest
from support_trace.api.validators import resolve_exact_only
from support_trace.lookup.enums import InvestigationLevel
from support_trace.lookup.investigation_policy import InvestigationOptions, InvestigationPolicy
from support_trace.timeline.types import TimelineFilter

EXPAND_TO_OPTION = {
    "timeline": "include_timeline",
    "summary": "include_summary",
    "relationships": "include_relationships",
    "audits": "include_audits",
    "health": "include_health",
    "statistics": "include_statistics",
    "snapshots": "include_snapshots",
    "report": "include_report",
    "logs": "include_runtime",
    "runtime": "include_runtime",
}


def _parse_level(raw: str | None) -> InvestigationLevel:
    if not raw:
        return InvestigationLevel.FULL
    normalized = raw.strip().lower()
    for level in InvestigationLevel:
        if level.value.lower() == normalized or level.name.lower() == normalized:
            return level
    return InvestigationLevel.FULL


def _parse_expand(raw: str | None) -> frozenset[str]:
    if not raw:
        return frozenset()
    parts = {p.strip().lower() for p in raw.split(",") if p.strip()}
    return frozenset(parts)


def _options_from_expand(expand: frozenset[str], level: InvestigationLevel) -> InvestigationOptions:
    if not expand:
        return InvestigationPolicy.default().apply_level(level)
    base = InvestigationOptions(
        include_timeline=False,
        include_relationships=False,
        include_audits=False,
        include_summary=False,
        include_health=False,
        include_statistics=False,
        include_snapshots=False,
        include_report=False,
        include_runtime=False,
    )
    kwargs = {field: getattr(base, field) for field in base.__dataclass_fields__}
    for key in expand:
        field = EXPAND_TO_OPTION.get(key)
        if field:
            kwargs[field] = True
    if "snapshots" not in expand and any(
        expand & {"timeline", "summary", "health", "statistics", "audits"}
    ):
        kwargs["include_snapshots"] = True
    return InvestigationOptions(**kwargs)


def _parse_bool(val: Any, default: bool = False) -> bool:
    if val is None:
        return default
    if isinstance(val, bool):
        return val
    return str(val).lower() in ("1", "true", "yes", "on")


def _parse_datetime(val: Any) -> datetime | None:
    if not val:
        return None
    if isinstance(val, datetime):
        return val
    text = str(val).strip()
    if text.endswith("Z"):
        text = text[:-1] + "+00:00"
    try:
        return datetime.fromisoformat(text)
    except ValueError:
        return None


def build_timeline_filter(params: dict[str, Any]) -> TimelineFilter | None:
    date_from = _parse_datetime(params.get("date_from"))
    date_to = _parse_datetime(params.get("date_to"))
    categories = params.get("category") or params.get("categories")
    severities = params.get("severity") or params.get("severities")
    tags = params.get("tags")
    workflow_types = params.get("workflow") or params.get("workflow_type")
    if not any([date_from, date_to, categories, severities, tags, workflow_types]):
        return None
    if isinstance(categories, str):
        categories = tuple(c.strip() for c in categories.split(",") if c.strip())
    elif categories:
        categories = tuple(categories)
    else:
        categories = ()
    if isinstance(severities, str):
        severities = tuple(s.strip() for s in severities.split(",") if s.strip())
    elif severities:
        severities = tuple(severities)
    else:
        severities = ()
    if isinstance(tags, str):
        tags = tuple(t.strip() for t in tags.split(",") if t.strip())
    elif tags:
        tags = tuple(tags)
    else:
        tags = ()
    if isinstance(workflow_types, str):
        workflow_types = (workflow_types,)
    elif workflow_types:
        workflow_types = tuple(workflow_types)
    else:
        workflow_types = ()
    return TimelineFilter(
        date_from=date_from,
        date_to=date_to,
        categories=categories,
        severities=severities,
        tags=tags,
        workflow_types=workflow_types,
    )


class InvestigationRequestParser:
    @classmethod
    def from_get(cls, request) -> InvestigationRequest:
        params = getattr(request, "query_params", request.GET)
        q = params.get("q")
        level = _parse_level(params.get("level"))
        expand = _parse_expand(params.get("expand"))
        options = _options_from_expand(expand, level)
        legacy = cls._legacy_bool_overrides(params, options)
        query = str(q).strip() if q else None
        exact_only = resolve_exact_only(query, params.get("exact_only"))
        limit = min(int(params.get("limit", 20) or 20), 100)
        return InvestigationRequest(
            query=query,
            level=level,
            options=legacy,
            expand=expand,
            filters=build_timeline_filter(dict(params)),
            exact_only=exact_only,
            limit=limit,
            cursor=params.get("cursor"),
            stream=_parse_bool(params.get("stream")),
            include_related=_parse_bool(params.get("include_related"), True),
        )

    @classmethod
    def from_post_search(cls, request) -> InvestigationRequest:
        body = request.data if isinstance(request.data, dict) else {}
        q = body.get("q") or body.get("query")
        identifiers = body.get("identifiers") or []
        if not q and identifiers:
            q = identifiers[0] if isinstance(identifiers, list) else str(identifiers)
        level = _parse_level(body.get("level") or getattr(request, "query_params", request.GET).get("level"))
        expand = _parse_expand(body.get("expand") or getattr(request, "query_params", request.GET).get("expand"))
        options = _options_from_expand(expand, level)
        advanced = {k: v for k, v in body.items() if k not in ("q", "query", "expand", "level")}
        filters = build_timeline_filter({**dict(getattr(request, "query_params", request.GET)), **advanced})
        query = str(q).strip() if q else None
        exact_only = resolve_exact_only(query, body.get("exact_only"))
        limit = min(int(body.get("limit", 20) or 20), 100)
        return InvestigationRequest(
            query=query,
            level=level,
            options=options,
            expand=expand,
            filters=filters,
            exact_only=exact_only,
            limit=limit,
            cursor=body.get("cursor"),
            stream=_parse_bool(body.get("stream")),
            advanced_filters=advanced or None,
            include_related=_parse_bool(body.get("include_related"), True),
        )

    @classmethod
    def from_lookup(cls, request) -> InvestigationRequest:
        return cls.from_get(request)

    @staticmethod
    def _legacy_bool_overrides(params, options: InvestigationOptions) -> InvestigationOptions:
        kwargs = {f: getattr(options, f) for f in options.__dataclass_fields__}
        for param, field in (
            ("include_timeline", "include_timeline"),
            ("include_summary", "include_summary"),
            ("include_related", "include_relationships"),
        ):
            if params.get(param) is not None:
                kwargs[field] = _parse_bool(params.get(param))
        return InvestigationOptions(**kwargs)

    @staticmethod
    def service_kwargs(req: InvestigationRequest, policy) -> dict:
        return {
            "level": req.level,
            "options": req.options,
            "policy": policy,
            "filters": req.filters,
        }
