"""WhatsApp delivery orchestration for prescriptions."""

from __future__ import annotations

import logging
import time
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
        return self.prepare_consultation_delivery(
            consultation=prescription.consultation,
            prescription=prescription,
            initiated_by=initiated_by,
            force_resend=force_resend,
            base_url=base_url,
        )

    def prepare_consultation_delivery(
        self,
        *,
        consultation,
        prescription=None,
        initiated_by=None,
        force_resend: bool = False,
        base_url: str | None = None,
    ) -> WhatsAppMessage:
        """Queue WhatsApp template send; medicines and/or tests may be empty."""
        consultation = self._load_consultation(consultation)
        if prescription is not None:
            prescription = self._load_prescription(prescription)
            idempotency_key = f"prescription_{prescription.id}"
            delivery_subject = prescription
        else:
            idempotency_key = f"consultation_{consultation.id}"
            delivery_subject = None

        if force_resend:
            success_filter = {"is_deleted": False, "status__in": _SUCCESS_STATUSES}
            if prescription is not None:
                already = WhatsAppMessage.objects.filter(
                    prescription_id=prescription.id,
                    **success_filter,
                ).exists()
            else:
                already = WhatsAppMessage.objects.filter(
                    encounter_id=consultation.encounter_id,
                    prescription__isnull=True,
                    **success_filter,
                ).exists()
            if already:
                return self._create_skipped_message(
                    consultation=consultation,
                    prescription=prescription,
                    reason="Already delivered",
                    initiated_by=initiated_by,
                    skip_idempotency=True,
                )
            idempotency_key = f"{idempotency_key}:resend:{uuid.uuid4().hex[:12]}"
        else:
            existing = (
                WhatsAppMessage.objects.filter(idempotency_key=idempotency_key, is_deleted=False)
                .order_by("-created_at")
                .first()
            )
            if existing:
                if existing.status in _SUCCESS_STATUSES and (existing.meta_message_id or "").strip():
                    return self._create_skipped_message(
                        consultation=consultation,
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
                        consultation=consultation,
                        prescription=prescription,
                        initiated_by=initiated_by,
                        base_url=base_url,
                    )

        if prescription is not None:
            if prescription.status != PrescriptionStatus.FINALIZED or not prescription.is_active:
                return self._create_skipped_message(
                    consultation=consultation,
                    prescription=prescription,
                    reason="Prescription inactive",
                    initiated_by=initiated_by,
                    idempotency_key=idempotency_key,
                )
            if not prescription.pdf_file:
                return self._create_skipped_message(
                    consultation=consultation,
                    prescription=prescription,
                    reason="PDF not available",
                    initiated_by=initiated_by,
                    idempotency_key=idempotency_key,
                )

        encounter = consultation.encounter
        profile = encounter.patient_profile
        raw_phone = resolve_patient_mobile(encounter=encounter)
        if not raw_phone:
            return self._create_skipped_message(
                consultation=consultation,
                prescription=prescription,
                reason="No mobile number",
                initiated_by=initiated_by,
                idempotency_key=idempotency_key,
            )

        normalized_phone = try_normalize_delivery_phone(raw_phone)
        if not normalized_phone:
            return self._create_skipped_message(
                consultation=consultation,
                prescription=prescription,
                reason="Invalid mobile number",
                initiated_by=initiated_by,
                recipient_name=self._recipient_name(profile, encounter.patient_account.user),
                idempotency_key=idempotency_key,
            )

        prescription_url = ""
        if prescription is not None:
            prescription_url = self._build_prescription_url(prescription.id, base_url=base_url)
        summary = PrescriptionSummaryBuilder.build_whatsapp_summary_from_consultation(
            consultation=consultation,
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
            prescription=delivery_subject,
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
        if prescription is not None and not prescription.pdf_file:
            return self._mark_failed(message, code="MISSING_PDF", reason="PDF missing at send time")

        rendered_body = (payload.get("rendered_body") or "").strip()
        if prescription is not None:
            payload = dict(payload)
            payload["prescription_url"] = self._build_prescription_url(
                prescription.id,
                base_url=payload.get("_download_base_url"),
            )
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

        components = self._resolve_template_components(payload)
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

    def prepare_recommendation_delivery(
        self,
        *,
        consultation,
        recommendation_result,
        recommendation_id,
        recommendation_metadata: dict,
        prescription=None,
        prescription_message_id: str | None = None,
        initiated_by=None,
    ) -> WhatsAppMessage:
        """Queue diagnostic recommendation or unavailability WhatsApp."""
        consultation = self._load_consultation(consultation)
        if prescription is not None:
            prescription = self._load_prescription(prescription)

        idempotency_key = f"diagnostic_recommendation_{consultation.id}"
        existing = (
            WhatsAppMessage.objects.filter(idempotency_key=idempotency_key, is_deleted=False)
            .order_by("-created_at")
            .first()
        )
        if existing:
            if existing.status in _SUCCESS_STATUSES and (existing.meta_message_id or "").strip():
                logger.info(
                    "recommendation.duplicate_skipped consultation_id=%s message_id=%s",
                    consultation.id,
                    existing.id,
                )
                return existing
            if existing.status == WhatsAppMessageStatus.QUEUED:
                return existing

        retry_message = (
            existing
            if existing
            and existing.status
            in {
                WhatsAppMessageStatus.FAILED,
                WhatsAppMessageStatus.SKIPPED,
            }
            else None
        )
        if retry_message and existing.status == WhatsAppMessageStatus.FAILED:
            logger.info(
                "recommendation.retry_queue consultation_id=%s message_id=%s",
                consultation.id,
                existing.id,
            )

        encounter = consultation.encounter
        profile = encounter.patient_profile
        raw_phone = resolve_patient_mobile(encounter=encounter)
        if not raw_phone:
            return self._create_recommendation_skipped_message(
                consultation=consultation,
                prescription=prescription,
                reason="No mobile number",
                initiated_by=initiated_by,
                idempotency_key=idempotency_key,
            )

        normalized_phone = try_normalize_delivery_phone(raw_phone)
        if not normalized_phone:
            return self._create_recommendation_skipped_message(
                consultation=consultation,
                prescription=prescription,
                reason="Invalid mobile number",
                initiated_by=initiated_by,
                recipient_name=self._recipient_name(profile, encounter.patient_account.user),
                idempotency_key=idempotency_key,
            )

        patient_name = self._recipient_name(profile, encounter.patient_account.user)
        variant = "available" if recommendation_result.available else "unavailable"
        from notifications.services.delivery.whatsapp_template_renderer import (
            DIAGNOSTIC_RECOMMENDATION_UNAVAILABLE_BODY,
            build_recommendation_template_components,
            render_recommendation_whatsapp_body,
            resolve_recommendation_pricing_display_mode,
        )

        payload: dict = {
            "variant": variant,
            "consultation_id": str(consultation.id),
            "recommendation_id": str(recommendation_id),
            "recommendation_metadata": recommendation_metadata,
            "failure_reason": recommendation_result.failure_reason,
            "collection_mode": recommendation_result.collection_mode,
            "laboratory_id": str(recommendation_result.recommended_lab.pk)
            if recommendation_result.recommended_lab
            else None,
            "branch_id": str(recommendation_result.recommended_branch.pk)
            if recommendation_result.recommended_branch
            else None,
            "quoted_price": str(recommendation_result.quoted_price)
            if recommendation_result.quoted_price is not None
            else None,
            "prescription_message_id": prescription_message_id,
        }
        if variant == "available":
            pricing_display_mode = resolve_recommendation_pricing_display_mode(recommendation_result)
            payload["pricing_display_mode"] = pricing_display_mode
            payload["patient_name"] = patient_name
            if pricing_display_mode == "flat":
                from notifications.services.delivery.whatsapp_template_renderer import (
                    build_recommendation_flat_template_components,
                    render_recommendation_flat_price_body,
                )

                payload["template_components"] = build_recommendation_flat_template_components(
                    patient_name=patient_name,
                    result=recommendation_result,
                )
                payload["rendered_body"] = render_recommendation_flat_price_body(
                    patient_name=patient_name,
                    result=recommendation_result,
                )
            else:
                payload["template_components"] = build_recommendation_template_components(
                    patient_name=patient_name,
                    result=recommendation_result,
                )
                payload["rendered_body"] = render_recommendation_whatsapp_body(
                    patient_name=patient_name,
                    result=recommendation_result,
                )
            payload["flow_action_data"] = {
                "recommendation_id": str(recommendation_id),
                "consultation_id": str(consultation.id),
                "collection_mode": recommendation_result.collection_mode or "",
            }
        else:
            payload["rendered_body"] = DIAGNOSTIC_RECOMMENDATION_UNAVAILABLE_BODY

        from notifications.services.delivery.meta_client import recommendation_template_name

        pricing_mode = (payload.get("pricing_display_mode") or "discount").strip()
        if variant == "available" and pricing_mode == "flat":
            from notifications.services.delivery.meta_client import (
                recommendation_flat_template_name,
                recommendation_prefer_text_when_no_discount,
            )

            flat_template = recommendation_flat_template_name()
            if flat_template:
                template_name = flat_template
            elif recommendation_prefer_text_when_no_discount():
                template_name = ""
            else:
                template_name = recommendation_template_name()
        else:
            template_name = recommendation_template_name() if variant == "available" else ""

        if retry_message is not None:
            retry_message.status = WhatsAppMessageStatus.QUEUED
            retry_message.failure_reason = ""
            retry_message.error_code = ""
            retry_message.meta_message_id = ""
            retry_message.template_name = template_name
            retry_message.request_payload = payload
            retry_message.recipient_mobile_number = normalized_phone
            retry_message.recipient_name = patient_name
            retry_message.prescription = prescription
            retry_message.save(
                update_fields=[
                    "status",
                    "failure_reason",
                    "error_code",
                    "meta_message_id",
                    "template_name",
                    "request_payload",
                    "recipient_mobile_number",
                    "recipient_name",
                    "prescription",
                    "updated_at",
                ]
            )
            safe_emit(
                emit_prescription_whatsapp_audit_event,
                action="DIAGNOSTIC_RECOMMENDATION_WHATSAPP_QUEUED",
                prescription=prescription,
                message=retry_message,
                metadata={"variant": variant, "consultation_id": str(consultation.id), "retry": True},
            )
            return retry_message

        message = WhatsAppMessage(
            provider=WhatsAppProvider.META,
            conversation_category=WhatsAppConversationCategory.MARKETING,
            message_type=WhatsAppMessageType.TEST_BOOKING,
            status=WhatsAppMessageStatus.QUEUED,
            patient=profile,
            clinic=encounter.clinic,
            doctor=encounter.doctor,
            encounter=encounter,
            prescription=prescription,
            recipient_mobile_number=normalized_phone,
            recipient_name=patient_name,
            idempotency_key=idempotency_key,
            template_name=template_name,
            request_payload=payload,
            created_by=initiated_by,
        )
        message.save()
        safe_emit(
            emit_prescription_whatsapp_audit_event,
            action="DIAGNOSTIC_RECOMMENDATION_WHATSAPP_QUEUED",
            prescription=prescription,
            message=message,
            metadata={"variant": variant, "consultation_id": str(consultation.id)},
        )
        return message

    def send_recommendation_message(self, *, message_id) -> WhatsAppMessage:
        message = WhatsAppMessage.objects.select_related(
            "prescription",
            "encounter",
        ).get(pk=message_id, is_deleted=False)
        if message.status != WhatsAppMessageStatus.QUEUED:
            logger.info(
                "recommendation_send_skip message_id=%s status=%s",
                message_id,
                message.status,
            )
            return message

        payload = message.request_payload or {}
        to = self._normalize_recipient_snapshot(message.recipient_mobile_number)
        if not to:
            return self._mark_recommendation_failed(
                message,
                code="MISSING_PHONE",
                reason="Recipient phone snapshot missing",
            )

        variant = (payload.get("variant") or "").strip()
        client = MetaWhatsAppClient()
        started = time.monotonic()

        try:
            if variant == "available":
                from notifications.services.delivery.meta_client import (
                    recommendation_flat_template_name,
                    recommendation_prefer_text_when_no_discount,
                    recommendation_template_name,
                )

                pricing_mode = (payload.get("pricing_display_mode") or "discount").strip()
                flat_template = recommendation_flat_template_name()
                use_flat_text = (
                    pricing_mode == "flat"
                    and not flat_template
                    and recommendation_prefer_text_when_no_discount()
                )
                template_name = message.template_name or recommendation_template_name()
                if pricing_mode == "flat" and flat_template:
                    template_name = flat_template
                if not template_name and not use_flat_text:
                    return self._mark_recommendation_failed(
                        message,
                        code="MISSING_TEMPLATE",
                        reason="WHATSAPP_DIAGNOSTIC_RECOMMENDATION_TEMPLATE_NAME is not configured.",
                    )
                rendered_body = (payload.get("rendered_body") or "").strip()
                components = payload.get("template_components") or {}
                from notifications.services.delivery.meta_client import recommendation_uses_flow_button

                flow_action_data = payload.get("flow_action_data") or {}
                if use_flat_text:
                    result = client.send_text_message(to=to, body=rendered_body)
                    message.template_name = ""
                else:
                    result = client.send_recommendation_template(
                        to=to,
                        template_name=template_name,
                        components=components,
                        rendered_body=rendered_body,
                        flow_action_data=flow_action_data if recommendation_uses_flow_button() else None,
                        flow_token=str(payload.get("recommendation_id") or ""),
                        flat_template=pricing_mode == "flat" and bool(flat_template),
                    )
                    message.template_name = template_name
            else:
                from notifications.services.delivery.whatsapp_template_renderer import (
                    DIAGNOSTIC_RECOMMENDATION_UNAVAILABLE_BODY,
                )

                body = (payload.get("rendered_body") or DIAGNOSTIC_RECOMMENDATION_UNAVAILABLE_BODY).strip()
                result = client.send_text_message(to=to, body=body)
                message.template_name = ""
        except MetaWhatsAppError as exc:
            return self._mark_recommendation_failed(
                message,
                code=exc.code,
                reason=exc.message,
                response=exc.payload,
            )
        except Exception as exc:
            logger.exception("recommendation_send_unexpected message_id=%s", message_id)
            return self._mark_recommendation_failed(
                message,
                code="SEND_ERROR",
                reason=str(exc),
            )

        meta_message_id = (result.get("meta_message_id") or "").strip()
        if not result.get("simulated") and not meta_message_id:
            return self._mark_recommendation_failed(
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
            "outbound": {
                "to": to,
                "variant": variant,
                "template_name": message.template_name,
                "rendered_body": result.get("rendered_body") or payload.get("rendered_body"),
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
                "template_name",
                "updated_at",
            ]
        )
        execution_time_ms = int((time.monotonic() - started) * 1000)
        logger.info(
            "recommendation.sent consultation_id=%s recommendation_available=%s laboratory_id=%s "
            "branch_id=%s quoted_price=%s collection_mode=%s template_name=%s "
            "whatsapp_message_id=%s execution_time=%s",
            payload.get("consultation_id"),
            variant == "available",
            payload.get("laboratory_id"),
            payload.get("branch_id"),
            payload.get("quoted_price"),
            payload.get("collection_mode"),
            message.template_name,
            message.id,
            execution_time_ms,
        )
        safe_emit(
            emit_prescription_whatsapp_audit_event,
            action="DIAGNOSTIC_RECOMMENDATION_WHATSAPP_SENT",
            prescription=message.prescription,
            message=message,
            metadata={"variant": variant},
        )
        from diagnostics_engine.audit import schedule_test_recommendation_sent

        schedule_test_recommendation_sent(message=message, user=None)
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
            "encounter",
            "encounter__consultation",
            "encounter__patient_profile",
            "encounter__patient_account",
            "encounter__patient_account__user",
            "encounter__clinic",
            "encounter__doctor",
        ).get(pk=message_id, is_deleted=False)

        if original.status != WhatsAppMessageStatus.FAILED:
            raise ValueError("Only failed messages can be retried.")

        prescription = original.prescription
        if prescription is not None:
            encounter = prescription.consultation.encounter
        else:
            encounter = original.encounter
        if encounter is None:
            raise ValueError("Message is not linked to an encounter.")
        recipient_phone = self._resolve_recipient_phone(
            encounter=encounter,
            fallback=original.recipient_mobile_number,
        )
        if not recipient_phone:
            raise ValueError("Recipient phone is missing or invalid.")

        payload = dict(original.request_payload or {})
        if payload.get("patient_name") or payload.get("medicine_summary") is not None:
            payload["template_components"] = build_template_components(payload)
        if prescription is not None:
            retry_idempotency_key = f"prescription_{prescription.id}:retry:{uuid.uuid4().hex[:12]}"
        else:
            consultation_id = getattr(getattr(encounter, "consultation", None), "id", None) or encounter.pk
            retry_idempotency_key = f"consultation_{consultation_id}:retry:{uuid.uuid4().hex[:12]}"

        retry_message = WhatsAppMessage(
            provider=original.provider,
            conversation_category=original.conversation_category,
            message_type=original.message_type,
            status=WhatsAppMessageStatus.QUEUED,
            patient=original.patient,
            clinic=original.clinic,
            doctor=original.doctor,
            encounter=encounter,
            prescription=prescription,
            recipient_mobile_number=recipient_phone,
            recipient_name=original.recipient_name,
            template_name=self._current_template_name() or original.template_name,
            request_payload=payload,
            retry_count=(original.retry_count or 0) + 1,
            last_retry_at=timezone.now(),
            idempotency_key=retry_idempotency_key,
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

    def resend_consultation_delivery(
        self,
        *,
        consultation_id,
        initiated_by=None,
        base_url: str | None = None,
    ) -> WhatsAppMessage:
        """Re-prepare WhatsApp for tests-only consultations (no prescription record)."""
        consultation = self._load_consultation(consultation_id)
        encounter_id = consultation.encounter_id

        if WhatsAppMessage.objects.filter(
            encounter_id=encounter_id,
            prescription__isnull=True,
            is_deleted=False,
            status__in=_SUCCESS_STATUSES,
        ).exists():
            raise ValueError("Consultation summary was already delivered via WhatsApp.")

        latest = (
            WhatsAppMessage.objects.filter(
                encounter_id=encounter_id,
                prescription__isnull=True,
                is_deleted=False,
            )
            .order_by("-created_at")
            .first()
        )
        if latest and latest.status == WhatsAppMessageStatus.QUEUED:
            return latest

        return self.prepare_consultation_delivery(
            consultation=consultation,
            prescription=None,
            initiated_by=initiated_by,
            force_resend=True,
            base_url=base_url,
        )

    def _create_skipped_message(
        self,
        *,
        consultation,
        prescription=None,
        reason: str,
        initiated_by=None,
        recipient_name: str = "",
        skip_idempotency: bool = False,
        idempotency_key: str | None = None,
    ) -> WhatsAppMessage:
        encounter = consultation.encounter
        profile = encounter.patient_profile
        default_key = (
            f"prescription_{prescription.id}:skipped:{uuid.uuid4().hex[:8]}"
            if prescription is not None
            else f"consultation_{consultation.id}:skipped:{uuid.uuid4().hex[:8]}"
        )
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
                else idempotency_key or default_key
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

    def _create_recommendation_skipped_message(
        self,
        *,
        consultation,
        prescription=None,
        reason: str,
        initiated_by=None,
        recipient_name: str = "",
        idempotency_key: str,
    ) -> WhatsAppMessage:
        encounter = consultation.encounter
        profile = encounter.patient_profile
        message = WhatsAppMessage(
            provider=WhatsAppProvider.META,
            conversation_category=WhatsAppConversationCategory.MARKETING,
            message_type=WhatsAppMessageType.TEST_BOOKING,
            status=WhatsAppMessageStatus.SKIPPED,
            patient=profile,
            clinic=encounter.clinic,
            doctor=encounter.doctor,
            encounter=encounter,
            prescription=prescription,
            recipient_mobile_number="",
            recipient_name=recipient_name or self._recipient_name(profile, encounter.patient_account.user),
            failure_reason=reason,
            idempotency_key=idempotency_key,
            created_by=initiated_by,
        )
        message.save()
        return message

    def _mark_recommendation_failed(
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
        payload = message.request_payload or {}
        logger.info(
            "recommendation.failed consultation_id=%s recommendation_available=%s laboratory_id=%s "
            "branch_id=%s quoted_price=%s collection_mode=%s template_name=%s "
            "whatsapp_message_id=%s failure_reason=%s",
            payload.get("consultation_id"),
            (payload.get("variant") or "") == "available",
            payload.get("laboratory_id"),
            payload.get("branch_id"),
            payload.get("quoted_price"),
            payload.get("collection_mode"),
            message.template_name,
            message.id,
            reason,
        )
        safe_emit(
            emit_prescription_whatsapp_audit_event,
            action="DIAGNOSTIC_RECOMMENDATION_WHATSAPP_FAILED",
            prescription=message.prescription,
            message=message,
            metadata={"error_code": code, "reason": reason},
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
        consultation,
        prescription=None,
        initiated_by=None,
        base_url: str | None = None,
    ) -> WhatsAppMessage:
        """Refresh snapshot and queue another send attempt (e.g. after a prior FAILED row)."""
        encounter = consultation.encounter
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
        prescription_url = ""
        if prescription is not None:
            prescription_url = self._build_prescription_url(
                prescription.id,
                base_url=resolved_base_url,
            )
        summary = PrescriptionSummaryBuilder.build_whatsapp_summary_from_consultation(
            consultation=consultation,
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
            "whatsapp_message_requeued message_id=%s consultation_id=%s prescription_id=%s",
            message.id,
            consultation.id,
            prescription.id if prescription is not None else None,
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
            from notifications.services.delivery.meta_client import (
                filter_template_components,
                sanitize_template_parameter,
            )

            sanitized = {
                key: sanitize_template_parameter(value)
                for key, value in legacy.items()
            }
            return filter_template_components(sanitized)
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
    def _load_consultation(consultation):
        from consultations_core.models.consultation import Consultation

        if isinstance(consultation, Consultation):
            if hasattr(consultation, "encounter") and consultation.encounter is not None:
                return consultation
            return (
                Consultation.objects.select_related(
                    "encounter",
                    "encounter__patient_profile",
                    "encounter__patient_account",
                    "encounter__patient_account__user",
                    "encounter__clinic",
                    "encounter__doctor",
                )
                .prefetch_related(
                    "prescriptions__lines",
                    "investigations__items",
                )
                .get(pk=consultation.pk)
            )
        return (
            Consultation.objects.select_related(
                "encounter",
                "encounter__patient_profile",
                "encounter__patient_account",
                "encounter__patient_account__user",
                "encounter__clinic",
                "encounter__doctor",
            )
            .prefetch_related(
                "prescriptions__lines",
                "investigations__items",
            )
            .get(pk=consultation)
        )

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
