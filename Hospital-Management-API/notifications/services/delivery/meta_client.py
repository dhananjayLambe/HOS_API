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
    _reload_whatsapp_env()
    explicit = (os.getenv("WHATSAPP_USE_SIMULATED_PROVIDER") or "").lower() in (
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
    "prescription_url",
)


def template_body_param_keys() -> list[str]:
    if not hasattr(settings, "WHATSAPP_TEMPLATE_BODY_PARAM_KEYS"):
        return list(_DEFAULT_BODY_PARAM_KEYS)
    text = str(settings.WHATSAPP_TEMPLATE_BODY_PARAM_KEYS).strip()
    if not text:
        return []
    return [key.strip() for key in text.split(",") if key.strip()]


def template_language_code() -> str:
    return (getattr(settings, "WHATSAPP_TEMPLATE_LANGUAGE_CODE", "en_US") or "en_US").strip() or "en_US"


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
        body_components = [
            {
                "type": "text",
                "text": sanitize_template_parameter(components.get(key) or ""),
            }
            for key in param_keys
        ]

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
