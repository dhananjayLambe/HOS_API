"""Unit tests for shared.logging.config."""

import pytest

from shared.logging.config import (
    HANDLER_CLOUDWATCH,
    HANDLER_CONSOLE,
    LoggingConfig,
    validate_logging_config,
)
from shared.logging.constants import Environment, LogLevel
from shared.logging.exceptions import ConfigurationError


def _base_config(**overrides) -> LoggingConfig:
    defaults = {
        "environment": Environment.DEVELOPMENT,
        "service_name": "doctorprocare-api",
        "application_version": "1.0.0",
        "log_level": LogLevel.INFO,
        "handlers": (HANDLER_CONSOLE,),
        "json_pretty": True,
    }
    defaults.update(overrides)
    return LoggingConfig(**defaults)


def test_development_config_validates() -> None:
    config = validate_logging_config(_base_config())
    assert config.handlers == (HANDLER_CONSOLE,)


def test_test_environment_config_validates() -> None:
    config = validate_logging_config(
        _base_config(environment=Environment.TEST, json_pretty=False)
    )
    assert config.environment == Environment.TEST


def test_staging_config_with_cloudwatch_validates() -> None:
    config = validate_logging_config(
        _base_config(
            environment=Environment.STAGING,
            handlers=(HANDLER_CONSOLE, HANDLER_CLOUDWATCH),
            json_pretty=False,
            cloudwatch_log_group="/doctorprocare/application",
            cloudwatch_region="ap-south-1",
        )
    )
    assert HANDLER_CLOUDWATCH in config.handlers


def test_production_config_with_cloudwatch_validates() -> None:
    config = validate_logging_config(
        _base_config(
            environment=Environment.PRODUCTION,
            handlers=(HANDLER_CONSOLE, HANDLER_CLOUDWATCH),
            json_pretty=False,
            cloudwatch_log_group="/doctorprocare/application",
            cloudwatch_region="us-east-1",
        )
    )
    assert config.application_version == "1.0.0"


def test_cloudwatch_without_log_group_raises() -> None:
    with pytest.raises(ConfigurationError):
        validate_logging_config(
            _base_config(
                handlers=(HANDLER_CLOUDWATCH,),
                cloudwatch_region="ap-south-1",
            )
        )


def test_cloudwatch_without_region_raises() -> None:
    with pytest.raises(ConfigurationError):
        validate_logging_config(
            _base_config(
                handlers=(HANDLER_CLOUDWATCH,),
                cloudwatch_log_group="/doctorprocare/application",
            )
        )


def test_empty_handlers_raises() -> None:
    with pytest.raises(ConfigurationError):
        validate_logging_config(_base_config(handlers=()))


def test_unknown_handler_raises() -> None:
    with pytest.raises(ConfigurationError):
        validate_logging_config(_base_config(handlers=("opensearch",)))


def test_empty_service_name_raises() -> None:
    with pytest.raises(ConfigurationError):
        validate_logging_config(_base_config(service_name="   "))


def test_empty_application_version_raises() -> None:
    with pytest.raises(ConfigurationError):
        validate_logging_config(_base_config(application_version=""))
