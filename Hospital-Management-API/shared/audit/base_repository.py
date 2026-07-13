"""Append-only repository patterns for audit models."""

from __future__ import annotations

from typing import TypeVar

from django.db import DatabaseError, IntegrityError

from shared.audit.exceptions import AuditRepositoryError

T = TypeVar("T")


class AppendOnlyAuditRepository:
    """Generic append-only persistence for audit records."""

    def __init__(self, model_cls: type[T]) -> None:
        self._model_cls = model_cls

    def save(self, record: T) -> T:
        try:
            record.save()
        except (DatabaseError, IntegrityError) as exc:
            raise AuditRepositoryError(str(exc)) from exc
        return record

    def bulk_save(self, records: list[T]) -> list[T]:
        if not records:
            return []
        try:
            return self._model_cls.objects.bulk_create(records)
        except (DatabaseError, IntegrityError) as exc:
            raise AuditRepositoryError(str(exc)) from exc
