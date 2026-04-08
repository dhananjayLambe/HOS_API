from django.db import models


class DrugType(models.TextChoices):
    TABLET = "tablet"
    SYRUP = "syrup"
    INJECTION = "injection"
    INHALER = "inhaler"
    DROP = "drop"
    CREAM = "cream"
    INSULIN = "insulin"
    OINTMENT = "ointment"
    SUPPOSITORY = "suppository"
    SUPPLEMENT = "supplement"
    VACCINE = "vaccine"
    OTHER = "other"


__all__ = ["DrugType"]
