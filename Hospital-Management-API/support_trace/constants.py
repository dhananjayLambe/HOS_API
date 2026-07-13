"""Field lengths and index names for Support Trace schema."""

CORRELATION_ID_LENGTH = 36
# clinical:consultation:{uuid} and similar deterministic IDs need >36 chars
WORKFLOW_INSTANCE_ID_LENGTH = 80
REQUEST_ID_LENGTH = 64
ORGANIZATION_ID_LENGTH = 64
RESOURCE_ID_LENGTH = 64
STATE_LENGTH = 64
WORKFLOW_STEP_LENGTH = 128
EVENT_LENGTH = 128
FINGERPRINT_LENGTH = 71  # sha256: + 64 hex
PHONE_LENGTH = 20
IDENTIFIER_LENGTH = 64
PROVIDER_REFERENCE_LENGTH = 128
WHATSAPP_MESSAGE_ID_LENGTH = 128

WORKFLOW_TYPE_LENGTH = 32
RESOURCE_TYPE_LENGTH = 32
STATUS_LENGTH = 16
SYNC_STATUS_LENGTH = 16
TRACE_SOURCE_LENGTH = 32
WORKFLOW_HEALTH_LENGTH = 16

PROJECTION_VERSION_DEFAULT = 1
PROJECTION_VERSION = 1  # bump when projection logic changes (M5.3 rebuild)
TRACE_VERSION_DEFAULT = 1

# Django index names (max 30 chars), prefix st_
INDEX_WORKFLOW_UNIQUE = "st_wf_unique_idx"
INDEX_FINGERPRINT = "st_fingerprint_idx"
INDEX_PARENT = "st_parent_idx"
INDEX_CORRELATION_UPDATED = "st_corr_upd_idx"
INDEX_WORKFLOW_UPDATED = "st_wf_upd_idx"
INDEX_RESOURCE = "st_resource_idx"
INDEX_PATIENT_UPDATED = "st_pat_upd_idx"
INDEX_SYNC_UPDATED = "st_sync_upd_idx"
INDEX_CORRELATION = "st_correlation_idx"
INDEX_ORGANIZATION = "st_organization_idx"
INDEX_STATUS = "st_status_idx"
INDEX_SYNC_STATUS = "st_sync_status_idx"
INDEX_WORKFLOW_HEALTH = "st_health_idx"
INDEX_LAST_SOURCE = "st_last_source_idx"
INDEX_PATIENT_ACCOUNT = "st_patient_acct_idx"
INDEX_CONSULTATION = "st_consultation_idx"
INDEX_BOOKING = "st_booking_idx"
INDEX_RECOMMENDATION = "st_recommendation_idx"
INDEX_REPORT = "st_report_idx"
INDEX_PROVIDER_REF = "st_provider_ref_idx"
INDEX_WHATSAPP = "st_whatsapp_idx"
INDEX_PHONE = "st_phone_idx"

MAX_EVENT_LABEL_LENGTH = EVENT_LENGTH
MAX_WORKFLOW_STEP_LENGTH = WORKFLOW_STEP_LENGTH
