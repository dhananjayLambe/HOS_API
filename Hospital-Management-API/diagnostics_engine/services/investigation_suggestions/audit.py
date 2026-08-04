from __future__ import annotations

import json
from typing import Any

from shared.logging import LogModule, logger


def log_suggestion_event(payload: dict[str, Any]) -> None:
    try:
        logger.info(
            "Investigation suggestion event emitted",
            module=LogModule.LABORATORY,
            action="diagnostics.investigation_suggestion.event",
            metadata={"payload": payload},
        )
    except Exception:
        logger.exception(
            "Failed to emit investigation suggestion audit event",
            module=LogModule.LABORATORY,
            action="diagnostics.investigation_suggestion.event_failed",
            metadata={"payload": json.dumps(payload, default=str)},
        )
