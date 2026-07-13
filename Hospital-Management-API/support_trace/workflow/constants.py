"""Constants for the Workflow State Engine."""

CLINICAL_WORKFLOW_PREFIX = "clinical"
CONSULTATION_WORKFLOW_PREFIX = f"{CLINICAL_WORKFLOW_PREFIX}:consultation:"
PRESCRIPTION_WORKFLOW_PREFIX = f"{CLINICAL_WORKFLOW_PREFIX}:prescription:"
REPORT_WORKFLOW_PREFIX = f"{CLINICAL_WORKFLOW_PREFIX}:report:"

RETRY_ACTIONS = frozenset(
    {
        "recommendation.retried",
        "report.delivery_retried",
        "workflow.retrying",
    }
)

TERMINAL_FSM_STATES = frozenset(
    {
        "Completed",
        "Failed",
        "Cancelled",
        "Expired",
        "Closed",
        "Shared",
        "Delivered",  # prescription delivered / report delivery delivered may be terminal
        "Read",  # recommendation read may lead to Completed
    }
)
