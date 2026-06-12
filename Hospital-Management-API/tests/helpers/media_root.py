"""Test helpers for keeping FileField uploads out of the project media/ tree."""

from __future__ import annotations

import shutil
import tempfile

from django.test import override_settings


class IsolatedMediaRootMixin:
    """Route MEDIA_ROOT to a temp directory for the test class lifetime."""

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls._media_root = tempfile.mkdtemp(prefix="hos_test_media_")
        cls._media_root_override = override_settings(MEDIA_ROOT=cls._media_root)
        cls._media_root_override.enable()

    @classmethod
    def tearDownClass(cls):
        cls._media_root_override.disable()
        shutil.rmtree(cls._media_root, ignore_errors=True)
        super().tearDownClass()
