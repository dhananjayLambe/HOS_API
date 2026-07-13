"""Deployment metadata resolution from environment."""

from __future__ import annotations

import os
import socket

from support_trace.runtime.constants import (
    ENV_APPLICATION_VERSION,
    ENV_AVAILABILITY_ZONE,
    ENV_AWS_ACCOUNT,
    ENV_CONTAINER_ID,
    ENV_ENVIRONMENT,
    ENV_GIT_COMMIT,
    ENV_POD_NAME,
    ENV_RELEASE_VERSION,
    ENV_SERVICE_NAME,
)


class DeploymentMetadata:
    @classmethod
    def resolve(cls) -> dict[str, str | None]:
        hostname = cls._hostname()
        return {
            "deployment_version": os.getenv(ENV_APPLICATION_VERSION) or "0.0.0",
            "git_commit": os.getenv(ENV_GIT_COMMIT),
            "release_version": os.getenv(ENV_RELEASE_VERSION),
            "hostname": hostname,
            "environment": os.getenv(ENV_ENVIRONMENT, "development"),
            "service_name": os.getenv(ENV_SERVICE_NAME, "doctorprocare-api"),
            "availability_zone": os.getenv(ENV_AVAILABILITY_ZONE),
            "aws_account": os.getenv(ENV_AWS_ACCOUNT),
            "container_id": os.getenv(ENV_CONTAINER_ID) or hostname,
            "pod_name": os.getenv(ENV_POD_NAME),
        }

    @staticmethod
    def _hostname() -> str | None:
        try:
            return socket.gethostname()
        except OSError:
            return None
