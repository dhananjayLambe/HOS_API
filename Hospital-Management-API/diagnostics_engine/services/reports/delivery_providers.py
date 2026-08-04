"""Report delivery channel providers."""

from __future__ import annotations

import uuid

from shared.logging import LogModule, logger


class BaseDeliveryProvider:
    channel: str = "WHATSAPP"

    def send(self, *, recipient: str, download_url: str, report) -> str:
        raise NotImplementedError


class SimulatedWhatsAppProvider(BaseDeliveryProvider):
    channel = "WHATSAPP"

    def send(self, *, recipient: str, download_url: str, report) -> str:
        message_id = f"sim-wa-{uuid.uuid4().hex[:12]}"
        logger.info(
            "WhatsApp delivery simulated",
            module=LogModule.REPORTS,
            action="diagnostics.reports.whatsapp_simulated",
            metadata={
                "report_id": str(report.id),
                "recipient": recipient,
                "download_url": download_url,
                "message_id": message_id,
            },
        )
        return message_id


class SimulatedSmsProvider(BaseDeliveryProvider):
    channel = "SMS"

    def send(self, *, recipient: str, download_url: str, report) -> str:
        message_id = f"sim-sms-{uuid.uuid4().hex[:12]}"
        logger.info(
            "SMS delivery simulated",
            module=LogModule.REPORTS,
            action="diagnostics.reports.sms_simulated",
            metadata={
                "report_id": str(report.id),
                "recipient": recipient,
                "message_id": message_id,
            },
        )
        return message_id


class SimulatedEmailProvider(BaseDeliveryProvider):
    channel = "EMAIL"

    def send(self, *, recipient: str, download_url: str, report) -> str:
        message_id = f"sim-email-{uuid.uuid4().hex[:12]}"
        logger.info(
            "Email delivery simulated",
            module=LogModule.REPORTS,
            action="diagnostics.reports.email_simulated",
            metadata={
                "report_id": str(report.id),
                "recipient": recipient,
                "message_id": message_id,
            },
        )
        return message_id


_PROVIDERS = {
    "WHATSAPP": SimulatedWhatsAppProvider(),
    "SMS": SimulatedSmsProvider(),
    "EMAIL": SimulatedEmailProvider(),
}


def get_delivery_provider(channel: str) -> BaseDeliveryProvider:
    key = (channel or "WHATSAPP").strip().upper()
    return _PROVIDERS.get(key, _PROVIDERS["WHATSAPP"])
