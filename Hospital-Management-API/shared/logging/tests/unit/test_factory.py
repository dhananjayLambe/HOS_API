"""Unit tests for shared.logging.factory."""

from __future__ import annotations

import json

import pytest

from shared.logging import logger
from shared.logging.config import HANDLER_CLOUDWATCH, HANDLER_CONSOLE, LoggingConfig
from shared.logging.constants import Environment, LogLevel
from shared.logging.dispatcher import LogDispatcher
from shared.logging.exceptions import ConfigurationError
from shared.logging.factory import (
    LoggingFactory,
    configure_logging,
    ensure_configured,
    set_pending_logging_config,
)
from shared.logging.formatter import JSONLogFormatter
from shared.logging.handlers import CloudWatchLogHandler, ConsoleLogHandler
from shared.logging.record import build_record
from shared.logging.constants import LogStatus


def _dev_config() -> LoggingConfig:
    return LoggingConfig(
        environment=Environment.DEVELOPMENT,
        service_name="doctorprocare-api",
        application_version="1.0.0",
        log_level=LogLevel.INFO,
        handlers=(HANDLER_CONSOLE,),
        json_pretty=True,
    )


def _prod_config() -> LoggingConfig:
    return LoggingConfig(
        environment=Environment.PRODUCTION,
        service_name="doctorprocare-api",
        application_version="2.0.0",
        log_level=LogLevel.INFO,
        handlers=(HANDLER_CONSOLE, HANDLER_CLOUDWATCH),
        json_pretty=False,
        cloudwatch_log_group="/doctorprocare/application",
        cloudwatch_region="ap-south-1",
    )


@pytest.mark.parametrize(
    ("handlers", "cloudwatch_kwargs"),
    [
        ((HANDLER_CONSOLE,), {}),
        (
            (HANDLER_CONSOLE, HANDLER_CLOUDWATCH),
            {
                "cloudwatch_log_group": "/doctorprocare/application",
                "cloudwatch_region": "ap-south-1",
            },
        ),
    ],
)
def test_environment_matrix_handler_types(handlers, cloudwatch_kwargs) -> None:
    config = LoggingConfig(
        environment=Environment.STAGING,
        service_name="doctorprocare-api",
        application_version="1.0.0",
        log_level=LogLevel.INFO,
        handlers=handlers,
        **cloudwatch_kwargs,
    )
    factory = LoggingFactory(config)
    created = factory.create_handlers()
    if HANDLER_CONSOLE in handlers:
        assert any(isinstance(h, ConsoleLogHandler) for h in created)
    if HANDLER_CLOUDWATCH in handlers:
        assert any(isinstance(h, CloudWatchLogHandler) for h in created)


def test_production_creates_console_and_cloudwatch_handlers() -> None:
    handlers = LoggingFactory(_prod_config()).create_handlers()
    assert len(handlers) == 2
    assert isinstance(handlers[0], ConsoleLogHandler)
    assert isinstance(handlers[1], CloudWatchLogHandler)


def test_configure_logging_updates_dispatcher_not_logger_identity(capsys) -> None:
    original_logger = logger
    configure_logging(_dev_config())
    assert logger is original_logger
    assert isinstance(logger._dispatcher, LogDispatcher)

    output = capsys.readouterr().out
    assert "logging.initialized" in output


def test_configure_logging_idempotent(capsys) -> None:
    config = _dev_config()
    for _ in range(10):
        configure_logging(config)
    output = capsys.readouterr().out
    assert output.count('"message": "Logging initialized"') == 1


def test_startup_summary_metadata(capsys) -> None:
    configure_logging(_prod_config())
    payload = json.loads(capsys.readouterr().out.strip().splitlines()[-1])
    assert payload["metadata"]["event"] == "logging.initialized"
    assert payload["metadata"]["handlers"] == ["console", "cloudwatch"]
    assert payload["metadata"]["application_version"] == "2.0.0"


def test_cloudwatch_handler_emit_record_with_mock_client() -> None:
    from unittest.mock import MagicMock

    from shared.logging.constants import LogStatus
    from shared.logging.formatter import JSONLogFormatter
    from shared.logging.record import build_record

    client = MagicMock()
    client.describe_log_groups.return_value = {
        "logGroups": [{"logGroupName": "/doctorprocare/application"}]
    }
    client.create_log_stream.return_value = {}
    client.put_log_events.return_value = {"nextSequenceToken": "t1"}

    handler = CloudWatchLogHandler(
        log_group="/doctorprocare/application",
        region="ap-south-1",
        formatter=JSONLogFormatter(),
        logs_client=client,
        hostname="test-host",
        date_str="2026-07-01",
    )
    record = build_record(
        level=LogLevel.INFO,
        module=None,
        action="logging.test",
        message="test",
        status=LogStatus.SUCCESS,
    )
    handler.emit_record(record)
    handler.flush()
    client.put_log_events.assert_called_once()


def test_lazy_init_via_pending_config(capsys) -> None:
    from shared.logging.constants import LogModule

    set_pending_logging_config(_dev_config())
    ensure_configured()
    assert capsys.readouterr().out  # startup summary

    logger.info("after lazy init", module=LogModule.API, action="api.request")
    assert "after lazy init" in capsys.readouterr().out


def test_lazy_init_on_first_log_call(capsys) -> None:
    from shared.logging.constants import LogModule

    set_pending_logging_config(_dev_config())
    logger.info("lazy path", module=LogModule.API, action="api.request")
    out = capsys.readouterr().out
    assert "logging.initialized" in out
    assert "lazy path" in out


def test_cloudwatch_invalid_constructor_raises() -> None:
    from shared.logging.formatter import JSONLogFormatter

    with pytest.raises(ConfigurationError):
        CloudWatchLogHandler(
            log_group="",
            region="ap-south-1",
            formatter=JSONLogFormatter(),
        )


def test_logging_factory_config_property() -> None:
    config = _dev_config()
    factory = LoggingFactory(config)
    assert factory.config is config


def test_unregistered_handler_raises_configuration_error(monkeypatch) -> None:
    import shared.logging.factory as factory_module

    monkeypatch.setattr(factory_module, "HANDLER_REGISTRY", {})
    with pytest.raises(ConfigurationError, match="handler not registered"):
        LoggingFactory(_dev_config()).create_handlers()


def test_shutdown_logging_closes_active_dispatcher() -> None:
    import shared.logging.factory as factory_module

    configure_logging(_dev_config())
    assert factory_module._active_dispatcher is not None
    factory_module._shutdown_logging()
    assert factory_module._active_dispatcher is None
