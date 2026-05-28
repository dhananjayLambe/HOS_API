from django.core.exceptions import ValidationError

from diagnostics_engine.api.views.reports.operational import _normalize_report_task_query_params
from diagnostics_engine.services.reports.report_task_presenter import derive_order_workflow_state


def test_normalize_report_task_query_params_maps_search_and_dates():
    params = _normalize_report_task_query_params(
        {
            "search": "Rahul",
            "start_date": "2026-05-01",
            "end_date": "2026-05-10",
        }
    )
    assert params["q"] == "Rahul"
    assert params["date_from"] == "2026-05-01"
    assert params["date_to"] == "2026-05-10"


def test_normalize_report_task_query_params_expands_today_filter():
    params = _normalize_report_task_query_params({"date_filter": "today"})
    assert params["date_from"]
    assert params["date_to"]
    assert params["date_from"] == params["date_to"]


def test_normalize_report_task_query_params_rejects_invalid_range():
    try:
        _normalize_report_task_query_params(
            {"start_date": "2026-05-10", "end_date": "2026-05-01"}
        )
    except ValidationError:
        return
    raise AssertionError("Expected ValidationError for inverted date range")


def test_normalize_report_task_query_params_rejects_invalid_workflow():
    try:
        _normalize_report_task_query_params({"workflow": "random"})
    except ValidationError:
        return
    raise AssertionError("Expected ValidationError for invalid workflow")


def test_normalize_report_task_query_params_rejects_invalid_tat_filter():
    try:
        _normalize_report_task_query_params({"tat_filter": "bad-token"})
    except ValidationError:
        return
    raise AssertionError("Expected ValidationError for invalid tat_filter")


def test_normalize_report_task_query_params_accepts_workflow_but_keeps_query_contract():
    params = _normalize_report_task_query_params(
        {"workflow": "pending_upload", "search": "abc"}
    )
    assert params["q"] == "abc"
    assert "workflow" not in params


def test_derive_order_workflow_state_priority_attention_first():
    state, code, _ = derive_order_workflow_state(
        required_reports=2,
        uploaded_required_reports=2,
        delivered_reports=2,
        failed_reports=1,
        critical_tat_breach=False,
    )
    assert state == "attention_required"
    assert code == "ATTENTION_REQUIRED"


def test_derive_order_workflow_state_ready_requires_required_reports():
    state, code, _ = derive_order_workflow_state(
        required_reports=2,
        uploaded_required_reports=2,
        delivered_reports=0,
        failed_reports=0,
        critical_tat_breach=False,
    )
    assert state == "ready_to_send"
    assert code == "READY_TO_SEND"
