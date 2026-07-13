# Communication Providers

Generic `CommunicationProvider` and `CommunicationChannel` enums map channels to default providers.

## Channel → provider registry

| Channel | Default provider |
|---------|------------------|
| WHATSAPP | META |
| EMAIL | AWS_SES |
| SMS | AWS_SNS |
| PORTAL | INTERNAL |
| VOICE_CALL / IVR | TWILIO |
| Others | INTERNAL |

Simulated Phase 1 providers resolve to `INTERNAL`. Production integrations update `provider_registry.py` per use case.

## Webhook flow (stub — M4.5)

`communication.webhook_received` is reserved for provider callbacks (Meta read receipts, SES delivery notifications).

Integration surface:

```python
from business_audit.communication.report.hooks import schedule_communication_webhook_received

schedule_communication_webhook_received(
    communication_id="...",
    communication_attempt_id="...",
    provider="META",
    provider_reference="wamid.xxx",
    webhook_event_type="message.read",
    new_status="READ",
    organization_id=str(clinic.id),
)
```

Idempotency: `provider_reference + webhook_event_type`.

## Related

- [REPORT_DELIVERY_WORKFLOW.md](REPORT_DELIVERY_WORKFLOW.md)
