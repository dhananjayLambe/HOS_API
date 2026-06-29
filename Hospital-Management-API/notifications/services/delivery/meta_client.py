"""Meta WhatsApp Cloud API client."""

from __future__ import annotations

import json
import logging
import os
import re
import uuid
from pathlib import Path
from typing import Any
from urllib import error, request

from django.conf import settings

logger = logging.getLogger(__name__)


def _reload_whatsapp_env() -> None:
    """In DEBUG, re-read .env so Celery workers pick up token changes without a full restart."""
    if not getattr(settings, "DEBUG", False):
        return
    try:
        from dotenv import load_dotenv

        base_dir = Path(getattr(settings, "BASE_DIR", ""))
        load_dotenv(base_dir / ".env", override=True)
    except Exception:
        logger.debug("whatsapp_env_reload_skipped", exc_info=True)


def _whatsapp_setting(name: str, default: str = "") -> str:
    _reload_whatsapp_env()
    return (os.getenv(name) or getattr(settings, name, default) or default).strip()


def _use_simulated_provider() -> bool:
    # @override_settings(WHATSAPP_USE_SIMULATED_PROVIDER=True) must win over .env reload.
    settings_flag = getattr(settings, "WHATSAPP_USE_SIMULATED_PROVIDER", None)
    if settings_flag is True:
        return True
    _reload_whatsapp_env()
    explicit_raw = os.getenv("WHATSAPP_USE_SIMULATED_PROVIDER")
    if explicit_raw is None and settings_flag is not None:
        explicit_raw = str(settings_flag)
    explicit = (explicit_raw or "").lower() in (
        "1",
        "true",
        "yes",
        "on",
    )
    if explicit:
        return True
    return not _whatsapp_setting("WHATSAPP_ACCESS_TOKEN")

_DEFAULT_BODY_PARAM_KEYS = (
    "patient_name",
    "doctor_name",
    "medicine_block",
    "test_block",
)


def template_body_param_keys() -> list[str]:
    text = _whatsapp_setting(
        "WHATSAPP_TEMPLATE_BODY_PARAM_KEYS",
        ",".join(_DEFAULT_BODY_PARAM_KEYS),
    )
    if not text:
        return []
    return [key.strip() for key in text.split(",") if key.strip()]


def template_language_code() -> str:
    return _whatsapp_setting("WHATSAPP_TEMPLATE_LANGUAGE_CODE", "en") or "en"


_DEFAULT_RECOMMENDATION_BODY_PARAM_KEYS = (
    "patient_name",
    "test_names",
    "mrp",
    "quoted_price",
    "savings",
)


def recommendation_template_body_param_keys() -> list[str]:
    text = _whatsapp_setting(
        "WHATSAPP_DIAGNOSTIC_RECOMMENDATION_TEMPLATE_BODY_PARAM_KEYS",
        ",".join(_DEFAULT_RECOMMENDATION_BODY_PARAM_KEYS),
    )
    if not text:
        return []
    return [key.strip() for key in text.split(",") if key.strip()]


def filter_recommendation_template_components(components: dict[str, str]) -> dict[str, str]:
    allowed = recommendation_template_body_param_keys()
    if not allowed:
        return {}
    return {key: components.get(key, "") for key in allowed}


def recommendation_template_name() -> str:
    return _whatsapp_setting(
        "WHATSAPP_DIAGNOSTIC_RECOMMENDATION_TEMPLATE_NAME",
        "diagnostic_test_recommendation_v3",
    )


_DEFAULT_FLAT_RECOMMENDATION_BODY_PARAM_KEYS = (
    "patient_name",
    "test_names",
    "quoted_price",
)


def recommendation_flat_template_name() -> str:
    return _whatsapp_setting("WHATSAPP_DIAGNOSTIC_RECOMMENDATION_FLAT_TEMPLATE_NAME")


def recommendation_flat_template_body_param_keys() -> list[str]:
    text = _whatsapp_setting(
        "WHATSAPP_DIAGNOSTIC_RECOMMENDATION_FLAT_TEMPLATE_BODY_PARAM_KEYS",
        ",".join(_DEFAULT_FLAT_RECOMMENDATION_BODY_PARAM_KEYS),
    )
    if not text:
        return []
    return [key.strip() for key in text.split(",") if key.strip()]


def filter_recommendation_flat_template_components(components: dict[str, str]) -> dict[str, str]:
    allowed = recommendation_flat_template_body_param_keys()
    if not allowed:
        return {}
    return {key: components.get(key, "") for key in allowed}


def recommendation_prefer_text_when_no_discount() -> bool:
    return (os.getenv("WHATSAPP_DIAGNOSTIC_RECOMMENDATION_PREFER_TEXT_WHEN_NO_DISCOUNT") or "true").lower() in (
        "1",
        "true",
        "yes",
        "on",
    )


def diagnostic_booking_flow_id() -> str:
    return _whatsapp_setting("WHATSAPP_DIAGNOSTIC_BOOKING_FLOW_ID")


def recommendation_uses_flow_button() -> bool:
    """
    Attach Flow button params only when explicitly enabled for M5+ Flow templates.

    diagnostic_test_recommendation_v3 uses a static Quick Reply button — sending Flow
    params with that template causes Meta error 132018 (Button must be QuickReply).
    WHATSAPP_DIAGNOSTIC_BOOKING_FLOW_ID may be set early for M5; keep flow button off
    until WHATSAPP_DIAGNOSTIC_RECOMMENDATION_USE_FLOW_BUTTON=true and a Flow template is live.
    """
    enabled = (os.getenv("WHATSAPP_DIAGNOSTIC_RECOMMENDATION_USE_FLOW_BUTTON") or "").lower()
    if enabled not in {"1", "true", "yes", "on"}:
        settings_flag = getattr(settings, "WHATSAPP_DIAGNOSTIC_RECOMMENDATION_USE_FLOW_BUTTON", False)
        if not settings_flag:
            return False
    flow_id = diagnostic_booking_flow_id()
    if not flow_id:
        return False
    if flow_id.lower() in {"your_meta_flow_id", "placeholder", "changeme", "todo", "none"}:
        return False
    return flow_id.isdigit()


def filter_template_components(components: dict[str, str]) -> dict[str, str]:
    """Keep only keys configured for the active Meta template body variables."""
    allowed = template_body_param_keys()
    if not allowed:
        return {}
    return {key: components.get(key, "") for key in allowed}


_META_TEMPLATE_PARAM_MAX_LEN = 1024
_MULTI_SPACE_RE = re.compile(r" {5,}")


def sanitize_template_parameter(value: str, *, empty_fallback: str = "-") -> str:
    """
    Meta rejects body variables with newlines/tabs or 5+ consecutive spaces (#132018).
    """
    text = (value or "").strip()
    if not text:
        text = empty_fallback
    text = text.replace("\r\n", " ").replace("\n", " ").replace("\r", " ").replace("\t", " ")
    text = _MULTI_SPACE_RE.sub("    ", text)
    if len(text) > _META_TEMPLATE_PARAM_MAX_LEN:
        text = text[: _META_TEMPLATE_PARAM_MAX_LEN - 3].rstrip() + "..."
    return text


class MetaWhatsAppClient:
    def __init__(self) -> None:
        self.access_token = _whatsapp_setting("WHATSAPP_ACCESS_TOKEN")
        self.phone_number_id = _whatsapp_setting("WHATSAPP_PHONE_NUMBER_ID")
        self.api_base_url = _whatsapp_setting(
            "WHATSAPP_API_BASE_URL",
            "https://graph.facebook.com/v21.0",
        ).rstrip("/")
        self.use_simulated = _use_simulated_provider()

    def send_prescription_template(
        self,
        *,
        to: str,
        template_name: str,
        components: dict[str, str],
        rendered_body: str,
    ) -> dict[str, Any]:
        if self.use_simulated or not self.access_token or not self.phone_number_id:
            message_id = f"sim-wa-{uuid.uuid4().hex[:12]}"
            logger.info(
                "whatsapp_simulated_send to=%s template=%s msg_id=%s",
                to,
                template_name,
                message_id,
            )
            return {
                "meta_message_id": message_id,
                "simulated": True,
                "rendered_body": rendered_body,
                "components": components,
            }

        url = f"{self.api_base_url}/{self.phone_number_id}/messages"
        param_keys = template_body_param_keys()
        filtered = filter_template_components(components)
        body_components = [
            {
                "type": "text",
                "text": sanitize_template_parameter(filtered.get(key) or ""),
            }
            for key in param_keys
        ]
        logger.info(
            "whatsapp_template_send template=%s language=%s param_count=%s keys=%s",
            template_name,
            template_language_code(),
            len(body_components),
            param_keys,
        )

        template_payload: dict[str, Any] = {
            "name": template_name,
            "language": {"code": template_language_code()},
        }
        if body_components:
            template_payload["components"] = [
                {
                    "type": "body",
                    "parameters": body_components,
                }
            ]

        payload = {
            "messaging_product": "whatsapp",
            "to": to.lstrip("+"),
            "type": "template",
            "template": template_payload,
        }
        data = self._post_json(url, payload)
        messages = data.get("messages", []) if isinstance(data, dict) else []
        meta_message_id = messages[0].get("id", "") if messages else ""
        return {
            "meta_message_id": meta_message_id,
            "response": data,
            "rendered_body": rendered_body,
            "components": components,
        }

    def send_recommendation_template(
        self,
        *,
        to: str,
        template_name: str,
        components: dict[str, str],
        rendered_body: str,
        flow_action_data: dict[str, str] | None = None,
        flow_token: str | None = None,
        flat_template: bool = False,
    ) -> dict[str, Any]:
        if self.use_simulated or not self.access_token or not self.phone_number_id:
            message_id = f"sim-wa-{uuid.uuid4().hex[:12]}"
            logger.info(
                "whatsapp_simulated_recommendation_send to=%s template=%s msg_id=%s",
                to,
                template_name,
                message_id,
            )
            return {
                "meta_message_id": message_id,
                "simulated": True,
                "rendered_body": rendered_body,
                "components": components,
                "flow_action_data": flow_action_data or {},
            }

        url = f"{self.api_base_url}/{self.phone_number_id}/messages"
        if flat_template:
            param_keys = recommendation_flat_template_body_param_keys()
            filtered = filter_recommendation_flat_template_components(components)
        else:
            param_keys = recommendation_template_body_param_keys()
            filtered = filter_recommendation_template_components(components)
        body_components = [
            {
                "type": "text",
                "text": sanitize_template_parameter(filtered.get(key) or ""),
            }
            for key in param_keys
        ]
        template_components: list[dict[str, Any]] = []
        if body_components:
            template_components.append(
                {
                    "type": "body",
                    "parameters": body_components,
                }
            )
        # Approved template uses a static Quick Reply / URL "Book Tests" button — do not send
        # Flow button params unless WHATSAPP_DIAGNOSTIC_BOOKING_FLOW_ID is set (Meta error 132018).
        if flow_action_data is not None and recommendation_uses_flow_button():
            template_components.append(
                {
                    "type": "button",
                    "sub_type": "flow",
                    "index": "0",
                    "parameters": [
                        {
                            "type": "action",
                            "action": {
                                "flow_token": flow_token or uuid.uuid4().hex,
                                "flow_action_data": flow_action_data,
                            },
                        }
                    ],
                }
            )

        template_payload: dict[str, Any] = {
            "name": template_name,
            "language": {"code": template_language_code()},
        }
        if template_components:
            template_payload["components"] = template_components

        payload = {
            "messaging_product": "whatsapp",
            "to": to.lstrip("+"),
            "type": "template",
            "template": template_payload,
        }
        data = self._post_json(url, payload)
        messages = data.get("messages", []) if isinstance(data, dict) else []
        meta_message_id = messages[0].get("id", "") if messages else ""
        return {
            "meta_message_id": meta_message_id,
            "response": data,
            "rendered_body": rendered_body,
            "components": components,
            "flow_action_data": flow_action_data or {},
        }

    def send_text_message(self, *, to: str, body: str) -> dict[str, Any]:
        if self.use_simulated or not self.access_token or not self.phone_number_id:
            message_id = f"sim-wa-{uuid.uuid4().hex[:12]}"
            logger.info("whatsapp_simulated_text_send to=%s msg_id=%s", to, message_id)
            return {
                "meta_message_id": message_id,
                "simulated": True,
                "rendered_body": body,
            }

        url = f"{self.api_base_url}/{self.phone_number_id}/messages"
        payload = {
            "messaging_product": "whatsapp",
            "to": to.lstrip("+"),
            "type": "text",
            "text": {"body": body},
        }
        data = self._post_json(url, payload)
        messages = data.get("messages", []) if isinstance(data, dict) else []
        meta_message_id = messages[0].get("id", "") if messages else ""
        return {
            "meta_message_id": meta_message_id,
            "response": data,
            "rendered_body": body,
        }

    def _post_json(self, url: str, payload: dict) -> dict:
        body = json.dumps(payload).encode("utf-8")
        req = request.Request(
            url,
            data=body,
            headers={
                "Authorization": f"Bearer {self.access_token}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        try:
            with request.urlopen(req, timeout=30) as response:
                raw = response.read().decode("utf-8")
                return json.loads(raw) if raw else {}
        except error.HTTPError as exc:
            raw = exc.read().decode("utf-8")
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                data = {"raw": raw}
            error_body = data.get("error", {}) if isinstance(data, dict) else {}
            code = str(error_body.get("code", exc.code))
            message = error_body.get("message", raw or str(exc))
            raise MetaWhatsAppError(code=code, message=message, payload=data) from exc


class MetaWhatsAppError(Exception):
    def __init__(self, *, code: str, message: str, payload: dict | None = None) -> None:
        self.code = code
        self.message = message
        self.payload = payload or {}
        super().__init__(message)
