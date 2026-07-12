"""Immutability validation for Clinical Audit certification."""

from __future__ import annotations

import inspect

from clinical_audit.certification.certification_result import ValidatorResult
from clinical_audit.domain.repository import ClinicalAuditRepository
from clinical_audit.exceptions import ClinicalAuditImmutabilityError
from clinical_audit.models import ClinicalAudit


class ImmutabilityValidator:
    """Confirm ClinicalAudit rows and repository are append-only."""

    name = "immutability"

    def validate(self, audits: list[ClinicalAudit]) -> ValidatorResult:
        errors: list[str] = []

        repository = ClinicalAuditRepository()
        for method_name in ("update", "delete"):
            if hasattr(repository, method_name):
                errors.append(
                    f"ClinicalAuditRepository must not expose {method_name}()."
                )

        public_methods = [
            name
            for name, member in inspect.getmembers(repository, predicate=inspect.isfunction)
            if not name.startswith("_")
        ]
        for method_name in public_methods:
            if method_name in {"update", "delete"}:
                errors.append(f"Repository exposes forbidden method: {method_name}.")

        sample = audits[0] if audits else None
        if sample is None:
            sample = ClinicalAudit.objects.order_by("timestamp").first()

        if sample is None:
            return ValidatorResult(
                name=self.name,
                passed=not errors,
                errors=errors,
                warnings=["No audit rows available for immutability mutation checks."],
            )

        try:
            sample.save()
            errors.append("save() on existing audit row did not raise.")
        except ClinicalAuditImmutabilityError:
            pass
        except Exception as exc:  # noqa: BLE001
            errors.append(f"save() raised unexpected error: {type(exc).__name__}.")

        try:
            sample.delete()
            errors.append("delete() on audit row did not raise.")
        except ClinicalAuditImmutabilityError:
            pass
        except Exception as exc:  # noqa: BLE001
            errors.append(f"delete() raised unexpected error: {type(exc).__name__}.")

        queryset = ClinicalAudit.objects.filter(pk=sample.pk)
        try:
            queryset.update(remarks="mutated")
            errors.append("QuerySet.update() did not raise.")
        except ClinicalAuditImmutabilityError:
            pass
        except Exception as exc:  # noqa: BLE001
            errors.append(f"QuerySet.update() raised unexpected error: {type(exc).__name__}.")

        try:
            queryset.delete()
            errors.append("QuerySet.delete() did not raise.")
        except ClinicalAuditImmutabilityError:
            pass
        except Exception as exc:  # noqa: BLE001
            errors.append(f"QuerySet.delete() raised unexpected error: {type(exc).__name__}.")

        return ValidatorResult(name=self.name, passed=not errors, errors=errors)
