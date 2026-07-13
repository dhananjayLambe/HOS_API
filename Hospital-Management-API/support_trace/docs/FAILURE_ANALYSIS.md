# Failure Analysis

`FailureAnalysisEngine` determines:

- Failure stage, time, workflow, component
- Failure type: Provider, Application, Infrastructure, Timeout, Validation
- Failure reason from timeline ERROR/CRITICAL events

Builds on M5.5 `ErrorClassificationBuilder` with incident-specific DTOs.
