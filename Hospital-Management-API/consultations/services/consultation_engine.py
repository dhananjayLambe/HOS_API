from typing import Dict, List, Any
from consultations.services.metadata_loader import MetadataLoader


class ConsultationEngine:
    """
    Core engine to resolve pre-consultation metadata
    based on doctor specialty.
    """

    @staticmethod
    def get_pre_consultation_template(specialty: str) -> Dict[str, Any]:
        """
        Returns fully resolved pre-consultation template
        for a given doctor specialty.
        """

        sections_cfg = MetadataLoader.get(
            "pre_consultation/sections.json"
        )
        specialty_cfg = MetadataLoader.get(
            "pre_consultation/specialty_config.json"
        )

        allowed_sections = specialty_cfg.get(
            specialty,
            {}
        ).get("sections", [])

        response = {
            "sections": []
        }

        for section in sections_cfg["sections"]:
            if section not in allowed_sections:
                continue

            section_data = ConsultationEngine._load_section(section)
            response["sections"].append(section_data)

        return response

    @staticmethod
    def _load_section(section: str) -> Dict[str, Any]:
        """
        Loads items + sub-fields for a section.
        Works for vitals, symptoms, allergies, history.
        """

        master_path = f"pre_consultation/{section}/{section}_master.json"
        details_path = f"pre_consultation/{section}/{section}_details.json"

        master = MetadataLoader.get(master_path)
        details = MetadataLoader.get(details_path)

        items = []

        for code, meta in master["items"].items():
            item = {
                "code": code,
                "label": meta.get("label"),
                "fields": details.get(code, {}).get("fields", [])
            }
            items.append(item)

        return {
            "section": section,
            "items": items
        }

    @staticmethod
    def validate_submission(
        section: str,
        payload: List[Dict[str, Any]]
    ) -> None:
        """
        Basic validation for submitted pre-consult data.
        Ensures item codes are valid.
        """

        master = MetadataLoader.get(
            f"pre_consultation/{section}/{section}_master.json"
        )["items"]

        for entry in payload:
            code = entry.get("code")
            if code not in master:
                raise ValueError(
                    f"Invalid {section} code: {code}"
                )


# Purpose
# 	•	Resolve pre-consultation UI config for a doctor
# 	•	Merge:
# 	•	Sections
# 	•	Items
# 	•	Sub-fields
# 	•	Return frontend-ready JSON
# 	•	Central place for consultation logic