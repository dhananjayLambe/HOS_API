"""Channel to default provider mapping."""

from __future__ import annotations

from business_audit.communication.enums import CommunicationChannel, CommunicationProvider


_CHANNEL_PROVIDER: dict[str, str] = {
    CommunicationChannel.WHATSAPP: CommunicationProvider.META,
    CommunicationChannel.EMAIL: CommunicationProvider.AWS_SES,
    CommunicationChannel.SMS: CommunicationProvider.AWS_SNS,
    CommunicationChannel.PORTAL: CommunicationProvider.INTERNAL,
    CommunicationChannel.PUSH_NOTIFICATION: CommunicationProvider.INTERNAL,
    CommunicationChannel.VOICE_CALL: CommunicationProvider.TWILIO,
    CommunicationChannel.IVR: CommunicationProvider.TWILIO,
    CommunicationChannel.FAX: CommunicationProvider.INTERNAL,
    CommunicationChannel.PRINT: CommunicationProvider.INTERNAL,
    CommunicationChannel.API: CommunicationProvider.INTERNAL,
    CommunicationChannel.WEBHOOK: CommunicationProvider.INTERNAL,
}


def resolve_provider_for_channel(channel: str, *, simulated: bool = False) -> str:
    key = (channel or "WHATSAPP").strip().upper()
    if simulated:
        return CommunicationProvider.INTERNAL
    return _CHANNEL_PROVIDER.get(key, CommunicationProvider.INTERNAL)


def map_delivery_channel_to_communication_channel(channel: str) -> str:
    key = (channel or "WHATSAPP").strip().upper()
    if key in CommunicationChannel.values:
        return key
    return CommunicationChannel.WHATSAPP
