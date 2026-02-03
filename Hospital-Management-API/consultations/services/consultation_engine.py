from typing import Dict, List, Any
import logging
from consultations.services.metadata_loader import MetadataLoader

logger = logging.getLogger(__name__)


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

        response = {
            "sections": []
        }

        for section in sections_cfg["sections"]:
            try:
                section_data = ConsultationEngine._load_section(section)
                response["sections"].append(section_data)
            except Exception as e:
                logger.error(f"Failed to load section '{section}': {str(e)}", exc_info=True)
                # Continue with other sections even if one fails

        logger.info(f"Returning {len(response['sections'])} sections: {[s['section'] for s in response['sections']]}")
        return response

    @staticmethod
    def _load_section(section: str) -> Dict[str, Any]:
        """
        Loads items + sub-fields for a section.
        Works for vitals, symptoms, allergies, history.
        """

        master_path = f"pre_consultation/{section}/{section}_master.json"
        details_path = f"pre_consultation/{section}/{section}_details.json"

        try:
            master = MetadataLoader.get(master_path)
            details = MetadataLoader.get(details_path)
        except FileNotFoundError as e:
            logger.error(f"Metadata file not found for section '{section}': {e}")
            raise
        except Exception as e:
            logger.error(f"Error loading metadata files for section '{section}': {e}")
            raise

        items = []

        if "items" not in master:
            logger.warning(f"Section '{section}' master.json missing 'items' key")
            return {
                "section": section,
                "items": []
            }

        for code, meta in master["items"].items():
            item = {
                "code": code,
                "label": meta.get("label"),
                "fields": details.get(code, {}).get("fields", [])
            }
            items.append(item)

        logger.debug(f"Loaded {len(items)} items for section '{section}'")
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