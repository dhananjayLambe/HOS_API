"""Storage provider abstraction for diagnostic artifacts."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

from django.core.files.storage import default_storage

from diagnostics_engine.storage.s3_report_storage import delete_object


class StorageProvider(Protocol):
    def upload(self, key: str, file_obj) -> str:
        ...

    def download_url(self, key: str, *, expires_in: int | None = None, filename: str | None = None) -> str | None:
        ...

    def exists(self, key: str) -> bool:
        ...

    def archive(self, key: str) -> bool:
        ...

    def delete(self, key: str) -> bool:
        ...


@dataclass(frozen=True)
class DefaultStorageProvider:
    """Default provider for local/S3-backed Django storage."""

    def upload(self, key: str, file_obj) -> str:
        return default_storage.save(key, file_obj)

    def download_url(self, key: str, *, expires_in: int | None = None, filename: str | None = None) -> str | None:
        del expires_in, filename
        return None

    def exists(self, key: str) -> bool:
        return default_storage.exists(key)

    def archive(self, key: str) -> bool:
        # Archive is metadata-driven in current phase.
        return default_storage.exists(key)

    def delete(self, key: str) -> bool:
        return delete_object(key)
