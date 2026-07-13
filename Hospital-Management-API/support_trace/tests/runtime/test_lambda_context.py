"""Lambda context resolver tests."""

from __future__ import annotations

import os
from unittest.mock import patch

from django.test import SimpleTestCase

from support_trace.runtime.lambda_context import LambdaContextResolver


class LambdaContextTests(SimpleTestCase):
    def test_resolve_empty_when_not_lambda(self) -> None:
        with patch.dict(os.environ, {}, clear=False):
            os.environ.pop("AWS_LAMBDA_FUNCTION_NAME", None)
            os.environ.pop("AWS_REQUEST_ID", None)
            result = LambdaContextResolver.resolve()
            self.assertEqual(result, {})

    def test_resolve_with_lambda_env(self) -> None:
        with patch.dict(
            os.environ,
            {
                "AWS_LAMBDA_FUNCTION_NAME": "my-func",
                "AWS_REQUEST_ID": "lambda-req-1",
            },
            clear=False,
        ):
            result = LambdaContextResolver.resolve()
            self.assertEqual(result.get("lambda_request_id"), "lambda-req-1")
