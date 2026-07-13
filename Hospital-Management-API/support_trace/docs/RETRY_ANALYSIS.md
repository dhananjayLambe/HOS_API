# Retry Analysis

`RetryAnalysisEngine` captures per-workflow retries:

- Recommendation, Booking, Delivery, WhatsApp, Payment
- Retry count, reason, success flag, ordered events

Sources: trace `retry_count` + timeline events tagged `retry`.
