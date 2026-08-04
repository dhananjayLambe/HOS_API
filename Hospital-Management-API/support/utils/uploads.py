import os
import uuid

from django.utils import timezone

from shared.logging import LogModule, logger


def support_ticket_upload_path(instance, filename):
    """
    Generate upload path for support ticket attachments.

    Pattern:
    support_tickets/YYYY/MM/ticket_<ticket_uuid>/<ticket_number>_ATTACHMENT_<uuid>.<ext>
    """

    try:
        now = timezone.now()
        year = now.strftime("%Y")
        month = now.strftime("%m")

        ext = filename.split('.')[-1] if '.' in filename else 'dat'

        ticket = instance.ticket
        ticket_uuid = str(ticket.id).replace("-", "")
        ticket_number = ticket.ticket_number or "TICKET"

        unique_filename = (
            f"{ticket_number}_ATTACHMENT_{uuid.uuid4().hex}.{ext}"
        )

        upload_path = os.path.join(
            "support_tickets",
            year,
            month,
            f"ticket_{ticket_uuid}",
            unique_filename
        )

        logger.info(
            "Support ticket attachment path generated",
            module=LogModule.STORAGE,
            action="support.upload.path_generated",
            metadata={"ticket_id": str(ticket.id)},
        )

        return upload_path

    except Exception as exc:
        logger.exception(
            "Error generating support ticket upload path",
            module=LogModule.STORAGE,
            action="support.upload.path_failed",
            exc=exc,
        )

        # Fallback path (never block upload)
        ext = filename.split('.')[-1] if '.' in filename else 'dat'
        fallback_path = os.path.join(
            "support_tickets",
            "fallback",
            f"attachment_{uuid.uuid4().hex}.{ext}"
        )

        logger.warning(
            "Using fallback support ticket upload path",
            module=LogModule.STORAGE,
            action="support.upload.fallback_path",
        )
        return fallback_path
