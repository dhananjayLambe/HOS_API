"""Performance benchmark harness for the logging platform."""

from __future__ import annotations

import statistics
import threading
import time
import tracemalloc
from dataclasses import dataclass
from typing import Callable

from shared.logging import Logger, LogModule
from shared.logging.dispatcher import LogDispatcher
from shared.logging.formatter import JSONLogFormatter
from shared.logging.handlers import ConsoleLogHandler


@dataclass(frozen=True)
class BenchmarkResult:
    """Result of a single benchmark scenario."""

    name: str
    elapsed_ms: float
    iterations: int
    peak_memory_kb: float | None = None
    errors: int = 0


def _dev_null_logger() -> Logger:
    import io

    class _WriterHandler(ConsoleLogHandler):
        def __init__(self) -> None:
            super().__init__(formatter=JSONLogFormatter(pretty=False))
            self._buffer = io.StringIO()

        def emit(self, formatted_record: str) -> None:
            self._buffer.write(formatted_record)

    return Logger(dispatcher=LogDispatcher(handlers=[_WriterHandler()]))


def benchmark_single_log_call(iterations: int = 100) -> BenchmarkResult:
    """Measure median latency for a single info log call."""
    logger = _dev_null_logger()
    timings: list[float] = []
    for _ in range(iterations):
        start = time.perf_counter()
        logger.info("benchmark", module=LogModule.API, action="api.request")
        timings.append((time.perf_counter() - start) * 1000)
    return BenchmarkResult(
        name="single_log_call",
        elapsed_ms=statistics.median(timings),
        iterations=iterations,
    )


def benchmark_sequential_logs(count: int = 1000) -> BenchmarkResult:
    """Emit many sequential logs and measure total time."""
    logger = _dev_null_logger()
    start = time.perf_counter()
    errors = 0
    for i in range(count):
        try:
            logger.info(f"log {i}", module=LogModule.API, action="api.request")
        except Exception:
            errors += 1
    elapsed = (time.perf_counter() - start) * 1000
    return BenchmarkResult(
        name="sequential_logs",
        elapsed_ms=elapsed,
        iterations=count,
        errors=errors,
    )


def benchmark_exceptions(count: int = 100) -> BenchmarkResult:
    """Emit exception logs and track peak memory."""
    logger = _dev_null_logger()
    tracemalloc.start()
    start = time.perf_counter()
    for i in range(count):
        try:
            raise ValueError(f"failure {i}")
        except ValueError as exc:
            logger.exception(
                "benchmark exception",
                module=LogModule.API,
                action="api.failed",
                exc=exc,
            )
    elapsed = (time.perf_counter() - start) * 1000
    _, peak = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    return BenchmarkResult(
        name="exception_logs",
        elapsed_ms=elapsed,
        iterations=count,
        peak_memory_kb=peak / 1024,
    )


def benchmark_concurrent_logging(threads: int = 10, per_thread: int = 50) -> BenchmarkResult:
    """Concurrent logging from multiple threads."""
    logger = _dev_null_logger()
    errors = 0
    lock = threading.Lock()

    def worker() -> None:
        nonlocal errors
        for _ in range(per_thread):
            try:
                logger.info("concurrent", module=LogModule.API, action="api.request")
            except Exception:
                with lock:
                    errors += 1

    start = time.perf_counter()
    workers = [threading.Thread(target=worker) for _ in range(threads)]
    for t in workers:
        t.start()
    for t in workers:
        t.join()
    elapsed = (time.perf_counter() - start) * 1000
    return BenchmarkResult(
        name="concurrent_logging",
        elapsed_ms=elapsed,
        iterations=threads * per_thread,
        errors=errors,
    )


def benchmark_handler_init() -> BenchmarkResult:
    """Measure CloudWatch handler initialization with mocked client."""
    from unittest.mock import MagicMock

    from shared.logging.handlers import CloudWatchLogHandler

    client = MagicMock()
    start = time.perf_counter()
    CloudWatchLogHandler(
        log_group="/doctorprocare/application",
        region="ap-south-1",
        formatter=JSONLogFormatter(pretty=False),
        logs_client=client,
    )
    elapsed = (time.perf_counter() - start) * 1000
    return BenchmarkResult(name="handler_init", elapsed_ms=elapsed, iterations=1)


def run_all_benchmarks() -> list[BenchmarkResult]:
    """Run all benchmark scenarios."""
    return [
        benchmark_single_log_call(),
        benchmark_sequential_logs(),
        benchmark_exceptions(),
        benchmark_concurrent_logging(),
        benchmark_handler_init(),
    ]


def main() -> None:
    """CLI entry point for benchmarks."""
    for result in run_all_benchmarks():
        print(
            f"{result.name}: {result.elapsed_ms:.2f} ms "
            f"({result.iterations} iterations, errors={result.errors})"
        )


if __name__ == "__main__":
    main()
