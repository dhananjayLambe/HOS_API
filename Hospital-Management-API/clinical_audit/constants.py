"""Field lengths and index names for the Clinical Audit schema."""

CORRELATION_ID_LENGTH = 36
USER_ID_LENGTH = 64
USER_ROLE_LENGTH = 64
ENTITY_ID_LENGTH = 64
MODULE_LENGTH = 64
EVENT_LENGTH = 128
ACTION_LENGTH = 64
OUTCOME_LENGTH = 16
RESOURCE_TYPE_LENGTH = 32
SOURCE_LENGTH = 32
DEVICE_INFORMATION_LENGTH = 255

# Django limits index names to 30 characters.
INDEX_CORRELATION_TIMESTAMP = "ca_corr_ts_idx"
INDEX_PATIENT_ACCOUNT_TIMESTAMP = "ca_patient_ts_idx"
INDEX_CONSULTATION_TIMESTAMP = "ca_consult_ts_idx"
INDEX_ENCOUNTER_TIMESTAMP = "ca_encounter_ts_idx"
INDEX_USER_TIMESTAMP = "ca_user_ts_idx"
INDEX_RESOURCE = "ca_resource_idx"
INDEX_ACTION_TIMESTAMP = "ca_action_ts_idx"
INDEX_TIMESTAMP = "ca_timestamp_idx"

# Service-layer limits
MAX_SUMMARY_LENGTH = EVENT_LENGTH
MAX_PAYLOAD_BYTES = 64 * 1024
MAX_SNAPSHOT_BYTES = 64 * 1024
MAX_REMARKS_LENGTH = 4000

# Metadata envelope keys inside new_value
META_KEY = "_meta"
PAYLOAD_KEY = "payload"
META_ORGANIZATION_ID = "organization_id"
META_REQUEST_ID = "request_id"
META_OCCURRED_AT = "occurred_at"
META_TIMEZONE = "timezone"
META_APPLICATION_VERSION = "application_version"
META_SERVICE_NAME = "service_name"
META_HOSTNAME = "hostname"
