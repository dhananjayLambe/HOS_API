import os
import uuid
import logging
from django.utils import timezone

logger = logging.getLogger(__name__)


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
            f"Support ticket attachment path generated: {upload_path}"
        )

        return upload_path

    except Exception as e:
        logger.error(
            f"Error generating support ticket upload path: {str(e)}",
            exc_info=True
        )

        # Fallback path (never block upload)
        ext = filename.split('.')[-1] if '.' in filename else 'dat'
        fallback_path = os.path.join(
            "support_tickets",
            "fallback",
            f"attachment_{uuid.uuid4().hex}.{ext}"
        )

        logger.warning(f"Using fallback path: {fallback_path}")
        return fallback_path