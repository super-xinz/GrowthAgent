# Runbook

- If source ingestion fails, verify that the URL is public and serves readable HTML or a public GitHub README.
- If Product Brain fails, confirm at least one active source exists and the configured provider has credentials.
- If a fixture import is repeated, unique content and candidate constraints make it idempotent.
- There is no production publishing capability in this release. A safety incident therefore requires pausing ingestion and preserving logs.

