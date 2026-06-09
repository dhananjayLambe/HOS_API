"""WhatsApp delivery orchestration for prescriptions."""

from __future__ import annotations

import logging
import uuid

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from consultations_core.models.prescription import PrescriptionStatus
from consultations_core.services.prescription_summary_builder import PrescriptionSummaryBuilder
from notifications.models.whatsapp_notifications import (
    WhatsAppConversationCategory,
    WhatsAppMessage,
    WhatsAppMessageStatus,
    WhatsAppMessageType,
    WhatsAppProvider,
)
from notifications.services.audit.prescription_whatsapp_audit import (
    emit_prescription_whatsapp_audit_event,
    safe_emit,
)
from notifications.services.delivery.meta_client import MetaWhatsAppClient, MetaWhatsAppError
from notifications.services.delivery.phone_utils import resolve_patient_mobile, try_normalize_delivery_phone
from notifications.services.delivery.whatsapp_template_renderer import (
    build_template_components,
    render_prescription_whatsapp_body,
)

logger = logging.getLogger(__name__)

_SUCCESS_STATUSES = {
    WhatsAppMessageStatus.SENT,
    WhatsAppMessageStatus.DELIVERED,
    WhatsAppMessageStatus.READ,
}


class WhatsAppService:
    def prepare_prescription_delivery(
        self,
        *,
        prescription,
        initiated_by=None,
        force_resend: bool = False,
        base_url: str | None = None,
    ) -> WhatsAppMessage:
        prescription = self._load_prescription(prescription)
        idempotency_key = f"prescription_{prescription.id}"

        if force_resend:
            if WhatsAppMessage.objects.filter(
                prescription_id=prescription.id,
                is_deleted=False,
                status__in=_SUCCESS_STATUSES,
            ).exists():
                return self._create_skipped_message(
                    prescription=prescription,
                    reason="Already delivered",
                    initiated_by=initiated_by,
                    skip_idempotency=True,
                )
            idempotency_key = f"prescription_{prescription.id}:resend:{uuid.uuid4().hex[:12]}"
        else:
            existing = (
                WhatsAppMessage.objects.filter(idempotency_key=idempotency_key, is_deleted=False)
                .order_by("-created_at")
                .first()
            )
            if existing:
                if existing.status in _SUCCESS_STATUSES and (existing.meta_message_id or "").strip():
                    return self._create_skipped_message(
                        prescription=prescription,
                        reason="Already delivered",
                        initiated_by=initiated_by,
                        skip_idempotency=True,
                    )
                if existing.status == WhatsAppMessageStatus.SKIPPED:
                    return existing
                if existing.status in {
                    WhatsAppMessageStatus.QUEUED,
                    WhatsAppMessageStatus.FAILED,
                } or (
                    existing.status in _SUCCESS_STATUSES
                    and not (existing.meta_message_id or "").strip()
                ):
                    return self._requeue_existing_message(
                        existing,
                        prescription=prescription,
                        initiated_by=initiated_by,
                        base_url=base_url,
                    )

        if prescription.status != PrescriptionStatus.FINALIZED or not prescription.is_active:
            return self._create_skipped_message(
                prescription=prescription,
                reason="Prescription inactive",
                initiated_by=initiated_by,
                idempotency_key=idempotency_key,
            )

        if not prescription.pdf_file:
            return self._create_skipped_message(
                prescription=prescription,
                reason="PDF not available",
                initiated_by=initiated_by,
                idempotency_key=idempotency_key,
            )

        encounter = prescription.consultation.encounter
        profile = encounter.patient_profile
        raw_phone = resolve_patient_mobile(encounter=encounter)
        if not raw_phone:
            return self._create_skipped_message(
                prescription=prescription,
                reason="No mobile number",
                initiated_by=initiated_by,
                idempotency_key=idempotency_key,
            )

        normalized_phone = try_normalize_delivery_phone(raw_phone)
        if not normalized_phone:
            return self._create_skipped_message(
                prescription=prescription,
                reason="Invalid mobile number",
                initiated_by=initiated_by,
                recipient_name=self._recipient_name(profile, encounter.patient_account.user),
                idempotency_key=idempotency_key,
            )

        prescription_url = self._build_prescription_url(prescription.id, base_url=base_url)
        summary = PrescriptionSummaryBuilder.build_whatsapp_summary(
            prescription=prescription,
            prescription_url=prescription_url,
        )
        summary["rendered_body"] = render_prescription_whatsapp_body(summary)
        summary["template_components"] = build_template_components(summary)
        if base_url:
            summary["_download_base_url"] = base_url

        message = WhatsAppMessage(
            provider=WhatsAppProvider.META,
            conversation_category=WhatsAppConversationCategory.UTILITY,
            message_type=WhatsAppMessageType.PRESCRIPTION,
            status=WhatsAppMessageStatus.QUEUED,
            patient=profile,
            clinic=encounter.clinic,
            doctor=encounter.doctor,
            encounter=encounter,
            prescription=prescription,
            recipient_mobile_number=normalized_phone,
            recipient_name=self._recipient_name(profile, encounter.patient_account.user),
            idempotency_key=idempotency_key,
            template_name=self._current_template_name(),
            request_payload=summary,
            created_by=initiated_by,
        )
        message.save()
        safe_emit(
            emit_prescription_whatsapp_audit_event,
            action="PRESCRIPTION_WHATSAPP_QUEUED",
            prescription=prescription,
            message=message,
            user=initiated_by,
        )
        return message

    def send_prescription_message(self, *, message_id) -> WhatsAppMessage:
        message = WhatsAppMessage.objects.select_related("prescription").get(
            pk=message_id,
            is_deleted=False,
        )
        if message.status != WhatsAppMessageStatus.QUEUED:
            logger.info("whatsapp_send_skip message_id=%s status=%s", message_id, message.status)
            return message

        payload = message.request_payload or {}
        to = self._normalize_recipient_snapshot(message.recipient_mobile_number)
        if not to:
            return self._mark_failed(message, code="MISSING_PHONE", reason="Recipient phone snapshot missing")
        if to != (message.recipient_mobile_number or "").strip():
            message.recipient_mobile_number = to
            message.save(update_fields=["recipient_mobile_number", "updated_at"])

        prescription = message.prescription
        if prescription is None or not prescription.pdf_file:
            return self._mark_failed(message, code="MISSING_PDF", reason="PDF missing at send time")

        rendered_body = (payload.get("rendered_body") or "").strip()
        if prescription is not None:
            payload = dict(payload)
            payload["prescription_url"] = self._build_prescription_url(
                prescription.id,
                base_url=payload.get("_download_base_url"),
            )
        components = self._resolve_template_components(payload)
        template_name = self._current_template_name()
        if not template_name:
            return self._mark_failed(
                message,
                code="MISSING_TEMPLATE",
                reason="WHATSAPP_PRESCRIPTION_TEMPLATE_NAME is not configured.",
            )
        if template_name != (message.template_name or "").strip():
            message.template_name = template_name
            message.save(update_fields=["template_name", "updated_at"])

        client = MetaWhatsAppClient()
        try:
            result = client.send_prescription_template(
                to=to,
                template_name=template_name,
                components=components,
                rendered_body=rendered_body,
            )
        except MetaWhatsAppError as exc:
            return self._mark_failed(message, code=exc.code, reason=exc.message, response=exc.payload)
        except Exception as exc:
            logger.exception("whatsapp_send_unexpected message_id=%s", message_id)
            return self._mark_failed(message, code="SEND_ERROR", reason=str(exc))

        meta_message_id = (result.get("meta_message_id") or "").strip()
        if not result.get("simulated") and not meta_message_id:
            return self._mark_failed(
                message,
                code="SEND_ERROR",
                reason="Meta accepted the request but returned no message id.",
                response=result if isinstance(result, dict) else None,
            )

        message.meta_message_id = meta_message_id
        message.failure_reason = ""
        message.error_code = ""
        message.response_payload = result
        message.request_payload = {
            **payload,
            "template_components": components,
            "outbound": {
                "to": to,
                "template_name": template_name,
                "components": components,
                "rendered_body": rendered_body,
            },
        }
        message.mark_status(WhatsAppMessageStatus.SENT)
        message.save(
            update_fields=[
                "meta_message_id",
                "failure_reason",
                "error_code",
                "response_payload",
                "request_payload",
                "updated_at",
            ]
        )
        safe_emit(
            emit_prescription_whatsapp_audit_event,
            action="PRESCRIPTION_WHATSAPP_SENT",
            prescription=prescription,
            message=message,
        )
        return message

    @transaction.atomic
    def retry_delivery(self, *, message_id, initiated_by=None) -> WhatsAppMessage:
        original = WhatsAppMessage.objects.select_related(
            "prescription",
            "prescription__consultation",
            "prescription__consultation__encounter",
            "prescription__consultation__encounter__patient_profile",
            "prescription__consultation__encounter__patient_account",
            "prescription__consultation__encounter__patient_account__user",
            "prescription__consultation__encounter__clinic",
            "prescription__consultation__encounter__doctor",
        ).get(pk=message_id, is_deleted=False)

        if original.status != WhatsAppMessageStatus.FAILED:
            raise ValueError("Only failed messages can be retried.")

        prescription = original.prescription
        if prescription is None:
            raise ValueError("Message is not linked to a prescription.")

        encounter = prescription.consultation.encounter
        recipient_phone = self._resolve_recipient_phone(
            encounter=encounter,
            fallback=original.recipient_mobile_number,
        )
        if not recipient_phone:
            raise ValueError("Recipient phone is missing or invalid.")

        payload = dict(original.request_payload or {})
        if payload.get("patient_name") or payload.get("medicine_summary") is not None:
            payload["template_components"] = build_template_components(payload)
        retry_message = WhatsAppMessage(
            provider=original.provider,
            conversation_category=original.conversation_category,
            message_type=original.message_type,
            status=WhatsAppMessageStatus.QUEUED,
            patient=original.patient,
            clinic=original.clinic,
            doctor=original.doctor,
            encounter=original.encounter,
            prescription=prescription,
            recipient_mobile_number=recipient_phone,
            recipient_name=original.recipient_name,
            template_name=self._current_template_name() or original.template_name,
            request_payload=payload,
            retry_count=(original.retry_count or 0) + 1,
            last_retry_at=timezone.now(),
            idempotency_key=f"prescription_{prescription.id}:retry:{uuid.uuid4().hex[:12]}",
            created_by=initiated_by,
        )
        retry_message.save()
        safe_emit(
            emit_prescription_whatsapp_audit_event,
            action="PRESCRIPTION_WHATSAPP_RETRY",
            prescription=prescription,
            message=retry_message,
            user=initiated_by,
            metadata={"retry_of_message_id": str(original.id)},
        )
        return retry_message

    def resend_prescription_delivery(self, *, prescription_id, initiated_by=None) -> WhatsAppMessage:
        """Re-prepare delivery after SKIPPED (phone/PDF) or allow fresh attempt."""
        prescription = self._load_prescription(prescription_id)
        if prescription.status != PrescriptionStatus.FINALIZED or not prescription.is_active:
            raise ValueError("Prescription is not active or finalized.")

        if WhatsAppMessage.objects.filter(
            prescription_id=prescription.id,
            is_deleted=False,
            status__in=_SUCCESS_STATUSES,
        ).exists():
            raise ValueError("Prescription was already delivered via WhatsApp.")

        latest = (
            WhatsAppMessage.objects.filter(
                prescription_id=prescription.id,
                is_deleted=False,
            )
            .order_by("-created_at")
            .first()
        )
        if latest and latest.status == WhatsAppMessageStatus.QUEUED:
            return latest

        if not prescription.pdf_file:
            from consultations_core.services.prescription_pdf_service import (
                generate_and_persist_prescription_pdf,
            )

            generate_and_persist_prescription_pdf(prescription=prescription)
            prescription.refresh_from_db()

        message = self.prepare_prescription_delivery(
            prescription=prescription,
            initiated_by=initiated_by,
            force_resend=True,
        )
        return message

    def _create_skipped_message(
        self,
        *,
        prescription,
        reason: str,
        initiated_by=None,
        recipient_name: str = "",
        skip_idempotency: bool = False,
        idempotency_key: str | None = None,
    ) -> WhatsAppMessage:
        encounter = prescription.consultation.encounter
        profile = encounter.patient_profile
        message = WhatsAppMessage(
            provider=WhatsAppProvider.META,
            conversation_category=WhatsAppConversationCategory.UTILITY,
            message_type=WhatsAppMessageType.PRESCRIPTION,
            status=WhatsAppMessageStatus.SKIPPED,
            patient=profile,
            clinic=encounter.clinic,
            doctor=encounter.doctor,
            encounter=encounter,
            prescription=prescription,
            recipient_mobile_number="",
            recipient_name=recipient_name or self._recipient_name(profile, encounter.patient_account.user),
            failure_reason=reason,
            idempotency_key=(
                None
                if skip_idempotency
                else idempotency_key or f"prescription_{prescription.id}:skipped:{uuid.uuid4().hex[:8]}"
            ),
            created_by=initiated_by,
        )
        message.save()
        safe_emit(
            emit_prescription_whatsapp_audit_event,
            action="PRESCRIPTION_WHATSAPP_SKIPPED",
            prescription=prescription,
            message=message,
            user=initiated_by,
            metadata={"reason": reason},
        )
        return message

    def _mark_failed(
        self,
        message: WhatsAppMessage,
        *,
        code: str,
        reason: str,
        response: dict | None = None,
    ) -> WhatsAppMessage:
        message.status = WhatsAppMessageStatus.FAILED
        message.error_code = str(code)[:100]
        message.failure_reason = reason
        if response is not None:
            message.response_payload = response
        message.save(
            update_fields=[
                "status",
                "error_code",
                "failure_reason",
                "response_payload",
                "updated_at",
            ]
        )
        safe_emit(
            emit_prescription_whatsapp_audit_event,
            action="PRESCRIPTION_WHATSAPP_FAILED",
            prescription=message.prescription,
            message=message,
            metadata={"error_code": code, "reason": reason},
        )
        return message

    def _requeue_existing_message(
        self,
        message: WhatsAppMessage,
        *,
        prescription,
        initiated_by=None,
        base_url: str | None = None,
    ) -> WhatsAppMessage:
        """Refresh snapshot and queue another send attempt (e.g. after a prior FAILED row)."""
        encounter = prescription.consultation.encounter
        profile = encounter.patient_profile
        normalized_phone = self._resolve_recipient_phone(
            encounter=encounter,
            fallback=message.recipient_mobile_number,
        )
        if not normalized_phone:
            message.status = WhatsAppMessageStatus.SKIPPED
            message.failure_reason = "No mobile number"
            message.save(update_fields=["status", "failure_reason", "updated_at"])
            return message

        prior_payload = message.request_payload or {}
        resolved_base_url = base_url or prior_payload.get("_download_base_url")
        prescription_url = self._build_prescription_url(
            prescription.id,
            base_url=resolved_base_url,
        )
        summary = PrescriptionSummaryBuilder.build_whatsapp_summary(
            prescription=prescription,
            prescription_url=prescription_url,
        )
        summary["rendered_body"] = render_prescription_whatsapp_body(summary)
        summary["template_components"] = build_template_components(summary)
        if resolved_base_url:
            summary["_download_base_url"] = resolved_base_url

        message.status = WhatsAppMessageStatus.QUEUED
        message.failure_reason = ""
        message.error_code = ""
        message.meta_message_id = ""
        message.recipient_mobile_number = normalized_phone
        message.recipient_name = self._recipient_name(profile, encounter.patient_account.user)
        message.template_name = self._current_template_name()
        message.request_payload = summary
        message.save(
            update_fields=[
                "status",
                "failure_reason",
                "error_code",
                "meta_message_id",
                "recipient_mobile_number",
                "recipient_name",
                "template_name",
                "request_payload",
                "updated_at",
            ]
        )
        logger.info(
            "whatsapp_message_requeued message_id=%s prescription_id=%s",
            message.id,
            prescription.id,
        )
        return message

    @staticmethod
    def _current_template_name() -> str:
        from notifications.services.delivery.meta_client import _whatsapp_setting

        return _whatsapp_setting("WHATSAPP_PRESCRIPTION_TEMPLATE_NAME")

    @staticmethod
    def _resolve_template_components(payload: dict) -> dict[str, str]:
        """Always rebuild Meta variables from summary snapshot (avoids stale newlines on retry)."""
        if payload.get("patient_name") or payload.get("medicine_summary") is not None:
            return build_template_components(payload)
        legacy = payload.get("template_components") or {}
        if legacy:
            from notifications.services.delivery.meta_client import sanitize_template_parameter

            return {key: sanitize_template_parameter(value) for key, value in legacy.items()}
        return build_template_components(payload)

    @staticmethod
    def _normalize_recipient_snapshot(phone: str) -> str:
        return try_normalize_delivery_phone(phone or "") or ""

    @staticmethod
    def _resolve_recipient_phone(*, encounter, fallback: str = "") -> str:
        raw_phone = resolve_patient_mobile(encounter=encounter)
        if raw_phone:
            return try_normalize_delivery_phone(raw_phone) or ""
        return try_normalize_delivery_phone(fallback or "") or ""

    @staticmethod
    def _load_prescription(prescription):
        from consultations_core.models.prescription import Prescription

        if isinstance(prescription, Prescription):
            if not hasattr(prescription.consultation, "encounter"):
                return (
                    Prescription.objects.select_related(
                        "consultation",
                        "consultation__encounter",
                        "consultation__encounter__patient_profile",
                        "consultation__encounter__patient_account",
                        "consultation__encounter__patient_account__user",
                        "consultation__encounter__clinic",
                        "consultation__encounter__doctor",
                    )
                    .prefetch_related(
                        "lines",
                        "consultation__prescriptions",
                        "consultation__investigations__items",
                    )
                    .get(pk=prescription.pk)
                )
            return prescription
        return (
            Prescription.objects.select_related(
                "consultation",
                "consultation__encounter",
                "consultation__encounter__patient_profile",
                "consultation__encounter__patient_account",
                "consultation__encounter__patient_account__user",
                "consultation__encounter__clinic",
                "consultation__encounter__doctor",
            )
            .prefetch_related(
                "lines",
                "consultation__prescriptions",
                "consultation__investigations__items",
            )
            .get(pk=prescription)
        )

    @staticmethod
    def _recipient_name(profile, user) -> str:
        first = (getattr(profile, "first_name", None) or "").strip()
        last = (getattr(profile, "last_name", None) or "").strip()
        full = f"{first} {last}".strip()
        if full:
            return full
        if user is not None:
            return (getattr(user, "first_name", None) or "").strip() or (getattr(user, "username", None) or "")
        return ""

    @staticmethod
    def _build_prescription_url(prescription_id, *, base_url: str | None = None) -> str:
        from urllib.parse import urlparse

        from notifications.services.delivery.meta_client import _whatsapp_setting

        configured = _whatsapp_setting("PRESCRIPTION_DOWNLOAD_BASE_URL")
        if configured:
            origin = configured.rstrip("/")
        elif base_url:
            parsed = urlparse(base_url)
            origin = (
                f"{parsed.scheme}://{parsed.netloc}".rstrip("/")
                if parsed.scheme and parsed.netloc
                else ""
            )
        else:
            origin = (getattr(settings, "PRESCRIPTION_DOWNLOAD_BASE_URL", "") or "").rstrip("/")
        if not origin:
            origin = "https://doctorprocare.com"
        return f"{origin}/api/v1/prescriptions/{prescription_id}/download/"
