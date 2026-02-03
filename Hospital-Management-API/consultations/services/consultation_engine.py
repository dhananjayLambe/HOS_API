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
                section_data = ConsultationEngine._load_section(section, specialty)
                response["sections"].append(section_data)
            except Exception as e:
                logger.error(f"Failed to load section '{section}': {str(e)}", exc_info=True)
                # Continue with other sections even if one fails

        logger.info(f"Returning {len(response['sections'])} sections: {[s['section'] for s in response['sections']]}")
        return response

    @staticmethod
    def _load_section(section: str, specialty: str = None) -> Dict[str, Any]:
        """
        Loads items + sub-fields for a section.
        Works for vitals, symptoms, allergies, history.
        Merges specialty-specific validation ranges if available.
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

        # Load specialty-specific ranges if available (for vitals section)
        specialty_ranges = None
        if section == "vitals" and specialty:
            try:
                ranges_path = "pre_consultation/vitals/vitals_ranges.json"
                all_ranges = MetadataLoader.get(ranges_path)
                specialty_ranges = all_ranges.get(specialty) or all_ranges.get("default")
                logger.debug(f"Loaded specialty ranges for '{specialty}': {specialty_ranges is not None}")
            except FileNotFoundError:
                logger.debug(f"No specialty ranges file found, using defaults")
            except Exception as e:
                logger.warning(f"Error loading specialty ranges: {e}")

        items = []

        if "items" not in master:
            logger.warning(f"Section '{section}' master.json missing 'items' key")
            return {
                "section": section,
                "items": []
            }

        for code, meta in master["items"].items():
            fields = details.get(code, {}).get("fields", [])
            
            # Merge specialty-specific ranges into field validation if available
            if specialty_ranges and fields:
                fields = ConsultationEngine._merge_specialty_ranges(
                    fields, 
                    specialty_ranges, 
                    code
                )
            
            item = {
                "code": code,
                "label": meta.get("label"),
                "fields": fields
            }
            items.append(item)

        logger.debug(f"Loaded {len(items)} items for section '{section}'")
        return {
            "section": section,
            "items": items
        }

    @staticmethod
    def _merge_specialty_ranges(
        fields: List[Dict[str, Any]], 
        specialty_ranges: Dict[str, Any],
        item_code: str
    ) -> List[Dict[str, Any]]:
        """
        Merges specialty-specific validation ranges into field configurations.
        Priority: Specialty ranges > Field-specific ranges > Defaults
        """
        merged_fields = []
        
        for field in fields:
            field_key = field.get("key")
            if not field_key:
                merged_fields.append(field)
                continue
            
            # Check if specialty has range override for this field
            field_range_config = specialty_ranges.get(field_key)
            
            if field_range_config:
                # Create updated field with merged validation
                updated_field = {**field}
                
                # Update min/max from specialty config
                if "min" in field_range_config:
                    updated_field["min"] = field_range_config["min"]
                if "max" in field_range_config:
                    updated_field["max"] = field_range_config["max"]
                
                # Update range array if exists
                if "min" in field_range_config and "max" in field_range_config:
                    updated_field["range"] = [
                        field_range_config["min"],
                        field_range_config["max"]
                    ]
                
                # Update validation object if it exists
                if "validation" in updated_field:
                    if updated_field["validation"] is None:
                        updated_field["validation"] = {}
                    
                    # Update validation min/max
                    if "min" in field_range_config:
                        updated_field["validation"]["min"] = field_range_config["min"]
                    if "max" in field_range_config:
                        updated_field["validation"]["max"] = field_range_config["max"]
                    
                    # Update canonical_unit if specified in specialty config
                    if "canonical_unit" in field_range_config:
                        updated_field["canonical_unit"] = field_range_config["canonical_unit"]
                        updated_field["unit"] = field_range_config["canonical_unit"]
                    
                    # Update error messages with dynamic placeholders
                    if "error_messages" not in updated_field["validation"]:
                        updated_field["validation"]["error_messages"] = {}
                    
                    # Ensure error messages use placeholders for dynamic unit display
                    error_msgs = updated_field["validation"]["error_messages"]
                    if "min" not in error_msgs:
                        error_msgs["min"] = f"{updated_field.get('label', 'Field')} must be at least {{min}} {{unit}}"
                    if "max" not in error_msgs:
                        error_msgs["max"] = f"{updated_field.get('label', 'Field')} cannot exceed {{max}} {{unit}}"
                
                merged_fields.append(updated_field)
                logger.debug(f"Merged specialty range for {item_code}.{field_key}: {field_range_config}")
            else:
                # No specialty override, use field as-is
                merged_fields.append(field)
        
        return merged_fields

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