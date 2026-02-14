from django.db import transaction
from account.models import BusinessIDCounter


class BusinessIDService:
    """
    Centralized Business ID generator.

    Examples:
        CL-00001
        DOC-0001
        EMP-0001
        PAT-000001
    """

    @classmethod
    def generate_id(cls, prefix: str, min_digits: int) -> str:
        with transaction.atomic():
            counter_obj, _ = (
                BusinessIDCounter.objects
                .select_for_update()
                .get_or_create(
                    entity_type=prefix,
                    defaults={"counter": 0}
                )
            )

            counter_obj.counter += 1
            counter_obj.save(update_fields=["counter"])

            sequence = str(counter_obj.counter).zfill(min_digits)

            return f"{prefix}-{sequence}"