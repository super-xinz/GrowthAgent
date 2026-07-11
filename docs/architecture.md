# Architecture

This first delivery implements Phase 0, Phase 1, and the Phase 2 offline seam. FastAPI owns the product/source/brain/query/opportunity contracts. Celery is present as the durable task boundary. Next.js is the observation console. PostgreSQL is authoritative; Redis is task transport.

The pipeline is intentionally staged rather than a free-running agent: ingest → evidence-backed brain → query graph → fixture normalization → deterministic candidate score. Live Reddit I/O, embeddings, publishing, and conversations remain behind future explicit phases.

## Reference-project decisions

- Adopted: normalized social content, staged scoring, evidence preservation, replayable model runs, clear opportunity tables.
- Rejected: account rotation, unsolicited DMs, browser automation, CAPTCHA/rate-limit bypass, generic multi-platform scraping, and wholesale LangGraph orchestration.
- Deferred: high-concurrency enrichment and sophisticated visual narratives; they add cost before opportunity precision is proven.

