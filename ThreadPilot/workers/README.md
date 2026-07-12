# Workers

Celery currently exposes a health task and is ready for Phase 2 pipeline tasks. Network ingestion remains API-triggered for a debuggable Phase 1. All future tasks must accept stable entity IDs and implement idempotency keys.

