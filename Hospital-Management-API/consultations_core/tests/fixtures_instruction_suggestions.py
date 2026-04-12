"""
Shared fake instruction metadata for suggestion service and API tests.
"""
from __future__ import annotations

from typing import Any, Dict


class FakeInstructionMetadata:
    """Minimal master + details + specialty payloads."""

    MASTER: Dict[str, Any] = {
        "version": 1,
        "items": {
            "adequate_rest": {
                "label": "Take adequate rest",
                "category": "general_advice",
                "requires_input": False,
            },
            "monitor_blood_pressure": {
                "label": "Monitor blood pressure regularly",
                "category": "monitoring",
                "requires_input": True,
            },
            "visit_er_if_chest_pain": {
                "label": "Visit emergency room if chest pain worsens",
                "category": "warning_signs",
                "requires_input": False,
            },
            "low_salt_diet": {
                "label": "Follow low salt diet",
                "category": "diet_lifestyle",
                "requires_input": False,
            },
        },
    }
    DETAILS: Dict[str, Any] = {
        "version": 1,
        "meta": {},
        "monitor_blood_pressure": {
            "fields": [
                {
                    "key": "frequency_per_day",
                    "label": "Times per day",
                    "type": "number",
                    "min": 1,
                    "max": 6,
                }
            ]
        },
    }
    SPECIALTY: Dict[str, Any] = {
        "version": 1,
        "meta": {},
        "cardiologist": [
            "visit_er_if_chest_pain",
            "monitor_blood_pressure",
            "low_salt_diet",
            "adequate_rest",
        ],
    }

    @classmethod
    def loader_get(cls, path: str) -> Dict[str, Any]:
        if path.endswith("instructions_master.json"):
            return cls.MASTER
        if path.endswith("instruction_details.json"):
            return cls.DETAILS
        if path.endswith("specialty_instructions.json"):
            return cls.SPECIALTY
        raise FileNotFoundError(path)
