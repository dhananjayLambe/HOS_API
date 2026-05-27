"""Report delivery channel providers."""

from __future__ import annotations

import logging
import uuid

logger = logging.getLogger("diagnostics.reports")


class BaseDeliveryProvider:
    channel: str = "WHATSAPP"

    def send(self, *, recipient: str, download_url: str, report) -> str:
        raise NotImplementedError


class SimulatedWhatsAppProvider(BaseDeliveryProvider):
    channel = "WHATSAPP"

    def send(self, *, recipient: str, download_url: str, report) -> str:
        message_id = f"sim-wa-{uuid.uuid4().hex[:12]}"
        logger.info(
            "whatsapp_simulated report_id=%s recipient=%s url=%s msg_id=%s",
            report.id,
            recipient,
            download_url,
            message_id,
        )
        return message_id


class SimulatedSmsProvider(BaseDeliveryProvider):
    channel = "SMS"

    def send(self, *, recipient: str, download_url: str, report) -> str:
        message_id = f"sim-sms-{uuid.uuid4().hex[:12]}"
        logger.info("sms_simulated report_id=%s recipient=%s", report.id, recipient)
        return message_id


class SimulatedEmailProvider(BaseDeliveryProvider):
    channel = "EMAIL"

    def send(self, *, recipient: str, download_url: str, report) -> str:
        message_id = f"sim-email-{uuid.uuid4().hex[:12]}"
        logger.info("email_simulated report_id=%s recipient=%s", report.id, recipient)
        return message_id


_PROVIDERS = {
    "WHATSAPP": SimulatedWhatsAppProvider(),
    "SMS": SimulatedSmsProvider(),
    "EMAIL": SimulatedEmailProvider(),
}


def get_delivery_provider(channel: str) -> BaseDeliveryProvider:
    key = (channel or "WHATSAPP").strip().upper()
    return _PROVIDERS.get(key, _PROVIDERS["WHATSAPP"])
