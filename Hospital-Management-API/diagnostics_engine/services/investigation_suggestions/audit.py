from __future__ import annotations

import json
import logging
from typing import Any

logger = logging.getLogger(__name__)


def log_suggestion_event(payload: dict[str, Any]) -> None:
    try:
        logger.info("investigation_suggestion_event=%s", json.dumps(payload, default=str))
    except Exception:
        logger.exception("Failed to emit investigation suggestion audit event")

