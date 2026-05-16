TEMPLATE_VERSION = "v1"
GENERATED_BY_DEFAULT = "DoctorPro"

METADATA_SHEET_NAME = "metadata"
PRICING_SHEET_NAME = "pricing_catalog"
INSTRUCTIONS_SHEET_NAME = "instructions"

# pricing_catalog layout (banner + header + data)
ROW_INSTRUCTION = 1
ROW_HEADER = 2
ROW_DATA_START = 3
FREEZE_PANES = "C3"

INSTRUCTION_BANNER_TEXT = (
    "Opt-in onboarding: set is_available=TRUE and add prices only for tests you offer. "
    "Leave is_available=FALSE for unsupported tests. "
    "Green = available | Gray = not offered | Red = available but missing price."
)

COLUMN_WIDTHS: dict[str, float] = {
    "A": 20,
    "B": 40,
    "C": 28,
    "D": 22,
    "E": 17,
    "F": 14,
    "G": 14,
    "H": 14,
    "I": 16,
    "J": 22,
    "K": 14,
    "L": 35,
}

LOCKED_COLUMN_FILL = "E8EEF4"
EDITABLE_COLUMN_FILL = "FFF9E6"
INSTRUCTION_BANNER_FILL = "FFF2CC"
HEADER_FILL = "1F4E79"
THIN_BORDER_COLOR = "D0D0D0"
CONDITIONAL_MISSING_PRICE_FILL = "FFC7CE"
CONDITIONAL_INVALID_MARGIN_FILL = "FF9C9C"
CONDITIONAL_AVAILABLE_TRUE_FILL = "C6EFCE"
CONDITIONAL_AVAILABLE_FALSE_FILL = "EDEDED"
CONDITIONAL_ENABLED_NO_PRICE_FILL = "FFC7CE"

METADATA_KEYS = (
    "branch_code",
    "lab_name",
    "branch_name",
    "city",
    "pincode",
    "template_version",
    "generated_at",
    "generated_by",
)

PRICING_HEADERS = (
    "service_code",
    "service_name",
    "category_name",
    "lab_department",
    "sample_type",
    "default_tat_hours",
    "selling_price",
    "cost_price",
    "report_delivery_hours",
    "home_collection_supported",
    "is_available",
    "remarks",
)

# 1-based column indexes (openpyxl)
COL_SERVICE_CODE = 1
COL_SERVICE_NAME = 2
COL_CATEGORY_NAME = 3
COL_LAB_DEPARTMENT = 4
COL_SAMPLE_TYPE = 5
COL_DEFAULT_TAT = 6
COL_SELLING_PRICE = 7
COL_COST_PRICE = 8
COL_REPORT_TAT = 9
COL_HOME_COLLECTION = 10
COL_IS_AVAILABLE = 11
COL_REMARKS = 12

EDITABLE_COLUMNS = frozenset(
    {
        COL_SELLING_PRICE,
        COL_COST_PRICE,
        COL_REPORT_TAT,
        COL_HOME_COLLECTION,
        COL_IS_AVAILABLE,
        COL_REMARKS,
    }
)

BOOLEAN_TRUE = "TRUE"
BOOLEAN_FALSE = "FALSE"

# Excel-only helper: category.name -> filter department (never imported to DB).
LAB_DEPARTMENT_MAPPING: dict[str, str] = {
    # Pathology subcategories
    "Hematology": "PATHOLOGY",
    "Biochemistry": "PATHOLOGY",
    "Clinical Pathology": "PATHOLOGY",
    "Serology": "PATHOLOGY",
    "Microbiology": "PATHOLOGY",
    "Molecular Diagnostics": "PATHOLOGY",
    "Immunology": "PATHOLOGY",
    "Histopathology": "PATHOLOGY",
    "Cytology": "PATHOLOGY",
    # Radiology subcategories
    "Radiology": "RADIOLOGY",
    "Ultrasound": "RADIOLOGY",
    "CT Scan": "RADIOLOGY",
    "MRI": "RADIOLOGY",
    "X-Ray": "RADIOLOGY",
    "Mammography": "RADIOLOGY",
    "Doppler & Vascular Imaging": "RADIOLOGY",
    "Interventional Radiology": "RADIOLOGY",
    # Specialty diagnostics
    "Cardiology Diagnostics": "CARDIOLOGY",
    "Pulmonology Diagnostics": "PULMONOLOGY",
    "Nephrology Diagnostics": "NEPHROLOGY",
    "Gastroenterology Diagnostics": "GASTRO",
    "Gynecology Diagnostics": "GYNECOLOGY",
    "Endocrinology Diagnostics": "ENDOCRINOLOGY",
    "Wellness & Preventive Health": "WELLNESS",
    # Parent categories (categories.csv)
    "Pathology": "PATHOLOGY",
    "Cardiology": "CARDIOLOGY",
    "Pulmonology": "PULMONOLOGY",
    "Gastroenterology": "GASTRO",
    "Nephrology": "NEPHROLOGY",
    "Gynecology": "GYNECOLOGY",
    "Endocrinology": "ENDOCRINOLOGY",
    "Diabetology": "ENDOCRINOLOGY",
    "Neurology": "OTHER",
    "Pediatrics": "OTHER",
    "Urology": "OTHER",
    "Orthopedics": "OTHER",
    "ENT": "OTHER",
    "Ophthalmology": "OTHER",
    "Dermatology": "OTHER",
    "Infectious Diseases": "OTHER",
    "Clinical Immunology": "OTHER",
    "Oncology": "OTHER",
    "Fertility & Reproductive Medicine": "OTHER",
    "Dental": "OTHER",
    "Nuclear Medicine": "RADIOLOGY",
    "Vascular Diagnostics": "OTHER",
    "Sleep Medicine": "PULMONOLOGY",
    "Health Packages": "WELLNESS",
}

DEPARTMENT_DEFAULT = "OTHER"

# Subtle row fills by department code (Excel only).
DEPARTMENT_ROW_FILLS: dict[str, str] = {
    "PATHOLOGY": "DCE6F1",
    "RADIOLOGY": "E2EFDA",
    "CARDIOLOGY": "FCE4D6",
    "WELLNESS": "FFF2CC",
    "OTHER": "EDEDED",
}

DEPARTMENT_ROW_FILL_DEFAULT = DEPARTMENT_ROW_FILLS["OTHER"]


def resolve_lab_department(category_name: str, *, parent_name: str | None = None) -> str:
    """Map DiagnosticCategory.name to an Excel filter department code."""
    name = (category_name or "").strip()
    if name:
        dept = LAB_DEPARTMENT_MAPPING.get(name)
        if dept:
            return dept
    parent = (parent_name or "").strip()
    if parent:
        dept = LAB_DEPARTMENT_MAPPING.get(parent)
        if dept:
            return dept
    return DEPARTMENT_DEFAULT


def department_row_fill(department_code: str) -> str:
    return DEPARTMENT_ROW_FILLS.get(department_code, DEPARTMENT_ROW_FILL_DEFAULT)
