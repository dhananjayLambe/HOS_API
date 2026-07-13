"""Stable timeline event ID generation."""

from __future__ import annotations

import uuid
from datetime import datetime

from support_trace.timeline.constants import TIMELINE_EVENT_NAMESPACE


def generate_timeline_event_id(
    *,
    reference_type: str,
    reference_id: str,
    timestamp: datetime,
) -> str:
    name = f"{reference_type}:{reference_id}:{timestamp.isoformat()}"
    return str(uuid.uuid5(uuid.UUID(TIMELINE_EVENT_NAMESPACE), name))
