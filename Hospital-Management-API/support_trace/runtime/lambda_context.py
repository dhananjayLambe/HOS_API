"""AWS Lambda runtime context from environment."""

from __future__ import annotations

import os

from support_trace.runtime.constants import (
    ENV_LAMBDA_FUNCTION_NAME,
    ENV_LAMBDA_FUNCTION_VERSION,
    ENV_LAMBDA_MEMORY,
    ENV_LAMBDA_REQUEST_ID,
)


class LambdaContextResolver:
    @classmethod
    def resolve(cls) -> dict[str, str | None]:
        request_id = os.getenv(ENV_LAMBDA_REQUEST_ID)
        if not request_id and not os.getenv(ENV_LAMBDA_FUNCTION_NAME):
            return {}
        return {
            "lambda_request_id": request_id,
            "lambda_function_name": os.getenv(ENV_LAMBDA_FUNCTION_NAME),
            "lambda_function_version": os.getenv(ENV_LAMBDA_FUNCTION_VERSION),
            "lambda_memory_mb": os.getenv(ENV_LAMBDA_MEMORY),
        }
