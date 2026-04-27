import logging
import re
from datetime import date
from time import perf_counter

from django.core.cache import cache
from django.db.models import CharField, F, FloatField, Func, Q, Value
from django.db.models.functions import Coalesce, Concat, Greatest, Lower, Replace
from django.contrib.postgres.search import TrigramSimilarity

from patient_account.models import PatientProfile

logger = logging.getLogger(__name__)

MAX_QUERY_LENGTH = 50
DEFAULT_LIMIT = 10
HARD_LIMIT = 10
CACHE_TTL_SECONDS = 300
MIN_QUERY_CHARS = 2
PHONETIC_MIN_TOKEN_LENGTH = 3


class RegexReplace(Func):
    function = "regexp_replace"
    output_field = CharField()


def _normalize_query(raw_query: str) -> str:
    cleaned = re.sub(r"[^\w\s@+()-]", " ", raw_query or "")
    return " ".join(cleaned.split())[:MAX_QUERY_LENGTH]


def _age_from_dob(dob):
    if not dob:
        return None
    today = date.today()
    years = today.year - dob.year
    if (today.month, today.day) < (dob.month, dob.day):
        years -= 1
    return years


def search_patients_for_suggestions(query: str, limit: int = DEFAULT_LIMIT):
    started_at = perf_counter()
    normalized_query = _normalize_query(query)
    if len(normalized_query) < MIN_QUERY_CHARS:
        return []

    effective_limit = min(max(int(limit or DEFAULT_LIMIT), 1), HARD_LIMIT)
    cache_key = f"patient_search_v5_all_{normalized_query.lower()}_{effective_limit}"

    try:
        cached = cache.get(cache_key)
    except Exception:
        logger.exception("Patient search cache GET failed", exc_info=True)
        cached = None
    if cached:
        return cached

    query_tokens = [token for token in normalized_query.split(" ") if token]
    text_tokens = [token for token in query_tokens if not token.isdigit()]
    digit_query = "".join(ch for ch in normalized_query if ch.isdigit())

    queryset = (
        PatientProfile.objects.select_related("account__user")
        .filter(is_active=True, account__is_active=True)
        .annotate(
            full_name_search=Concat(
                Coalesce(F("first_name"), Value("")),
                Value(" "),
                Coalesce(F("last_name"), Value("")),
                output_field=CharField(),
            ),
            mobile_digits=RegexReplace(
                Coalesce(F("account__user__username"), Value("")),
                Value(r"\D"),
                Value(""),
                Value("g"),
            ),
            first_name_phonetic=Func(
                Lower(Coalesce(F("first_name"), Value(""))),
                function="dmetaphone",
                output_field=CharField(),
            ),
            last_name_phonetic=Func(
                Lower(Coalesce(F("last_name"), Value(""))),
                function="dmetaphone",
                output_field=CharField(),
            ),
        )
    )

    combined_filter = Q()
    has_text_filter = False
    for token in text_tokens:
        token_filter = (
            Q(first_name__icontains=token)
            | Q(last_name__icontains=token)
            | Q(full_name_search__icontains=token)
            | Q(account__user__username__icontains=token)
        )
        if len(token) >= PHONETIC_MIN_TOKEN_LENGTH:
            token_filter |= Q(
                first_name_phonetic=Func(
                    Value(token.lower()),
                    function="dmetaphone",
                    output_field=CharField(),
                )
            ) | Q(
                last_name_phonetic=Func(
                    Value(token.lower()),
                    function="dmetaphone",
                    output_field=CharField(),
                )
            )
        if has_text_filter:
            combined_filter &= token_filter
        else:
            combined_filter = token_filter
            has_text_filter = True

    if len(text_tokens) >= 2:
        combined_filter |= Q(first_name__icontains=text_tokens[0], last_name__icontains=text_tokens[1])
        has_text_filter = True

    if digit_query:
        mobile_filter = Q(mobile_digits__icontains=digit_query) | Q(account__user__username__icontains=digit_query)
        if len(digit_query) <= 6:
            mobile_filter |= Q(mobile_digits__endswith=digit_query)
        if has_text_filter:
            combined_filter = combined_filter | mobile_filter
        else:
            combined_filter = mobile_filter
            has_text_filter = True

    if not has_text_filter:
        return []

    try:
        ranked = (
            queryset.filter(combined_filter)
            .annotate(
                rank=Greatest(
                    TrigramSimilarity("full_name_search", normalized_query),
                    TrigramSimilarity("first_name", normalized_query),
                    TrigramSimilarity("last_name", normalized_query),
                    TrigramSimilarity("account__user__username", normalized_query),
                    output_field=FloatField(),
                )
            )
            .order_by("-rank", "first_name", "last_name")
            .distinct()[: effective_limit]
        )
        ranked = list(ranked)
    except Exception:
        logger.exception("Patient phonetic query failed, retrying without dmetaphone", exc_info=True)
        fallback_queryset = (
            PatientProfile.objects.select_related("account__user")
            .filter(is_active=True, account__is_active=True)
            .annotate(
                full_name_search=Concat(
                    Coalesce(F("first_name"), Value("")),
                    Value(" "),
                    Coalesce(F("last_name"), Value("")),
                    output_field=CharField(),
                ),
                mobile_digits=RegexReplace(
                    Coalesce(F("account__user__username"), Value("")),
                    Value(r"\D"),
                    Value(""),
                    Value("g"),
                ),
            )
        )
        ranked = list(
            fallback_queryset.filter(combined_filter)
            .annotate(
                rank=Greatest(
                    TrigramSimilarity("full_name_search", normalized_query),
                    TrigramSimilarity("first_name", normalized_query),
                    TrigramSimilarity("last_name", normalized_query),
                    TrigramSimilarity("account__user__username", normalized_query),
                    output_field=FloatField(),
                )
            )
            .order_by("-rank", "first_name", "last_name")
            .distinct()[: effective_limit]
        )

    payload = [
        {
            "id": str(profile.id),
            "first_name": profile.first_name,
            "last_name": profile.last_name,
            "full_name": f"{(profile.first_name or '').strip()} {(profile.last_name or '').strip()}".strip(),
            "name": f"{(profile.first_name or '').strip()} {(profile.last_name or '').strip()}".strip(),
            "relation": profile.relation,
            "gender": profile.gender,
            "date_of_birth": profile.date_of_birth.isoformat() if profile.date_of_birth else None,
            "age": _age_from_dob(profile.date_of_birth),
            "mobile": getattr(profile.account.user, "username", None),
            "patient_account_id": str(profile.account_id),
        }
        for profile in ranked
    ]

    try:
        if payload:
            cache.set(cache_key, payload, timeout=CACHE_TTL_SECONDS)
    except Exception:
        logger.exception("Patient search cache SET failed", exc_info=True)

    elapsed_ms = (perf_counter() - started_at) * 1000
    logger.info("Patient search query='%s' returned=%s in %.1fms", normalized_query, len(payload), elapsed_ms)

    return payload
