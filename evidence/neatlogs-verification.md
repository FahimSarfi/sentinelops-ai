# Neatlogs integration evidence — 2026-10-10

Status: **PARTIAL — live LLM trace and dashboard finalization not verified.**

- Runtime: Python 3.14.4; installed neatlogs 1.1.8 has no Doctor command.
- Registry check: official stable neatlogs 1.4.26 requires Python <3.14.
  Installation was refused by pip; no unsupported SDK functions were used.
- Selected transport: official OTLP/gRPC, TLS, `ingest.neatlogs.com:443`;
  OpenTelemetry SDK/exporter 1.45.1. Project/region identity has not been
  independently read back from the dashboard.
- `NEATLOGS_API_KEY`: present, not an `nlw_` key; value never printed or committed.
- Real FastAPI error-path execution:
  `.venv/bin/python -m scripts.verify_neatlogs --allow-unconfigured`.
- Incident/session ID: `77ec9a85-db0a-4e0d-9662-8bee8f04406a`.
- Investigation trace ID: `d225c55c5973be09dd36badd031614b3`.
- Result: escalated because model configuration is missing.
- Transport: queue drained; 3 spans accepted, 0 failed. These correspond to the
  creation root, investigation root, and failed model-attempt span.
- Genuine LLM requests: **none**. Executed tools: **none**. Repairs: **none**.
- Dashboard visibility/finalization: **unverified**. Acceptance is not readback.

Supported TOOL spans: `metrics`, `explain`, `schema`, `history`, `diagnose`,
`refuse`, and (only after human approval) `create_checkout_email_index`.
Recovery comparison executes inside `recovery.verify` TASK; its returned report
is captured in `recovery.verification_result` TASK. Model requests, structured
responses, numeric usage, retry events, errors, decisions and lifecycle events
have explicit capture paths. Payloads intentionally omit free-form text.

Validation: `SENTINELOPS_TEST_POSTGRES=1 .venv/bin/python -m pytest -q -rs`
completed with **107 passed**, including 17 new telemetry tests. The only warning
is the existing Starlette/httpx TestClient deprecation. `git diff --check` and
Python compilation checks also passed. Sandboxed asyncio test runs stalled in
thread wake-up; the completed suite ran outside that sandbox.

Local tests use actual OTel spans with an in-memory mock exporter, deterministic
models, mocked HTTP transport, and broken telemetry clients/exporters. Real
PostgreSQL tests exercise the isolated fixture using rollback-only transactions.
Neither category is represented as hosted live LLM evidence.

Remaining prerequisites:

1. Set `SENTINELOPS_MODEL` and `SENTINELOPS_MODEL_API_KEY` securely in ignored `.env`.
2. Confirm target project and ingest region; default transport accepted the key,
   but dashboard project identity has not been inspected.
3. Run `python -m scripts.verify_neatlogs` to collect a fresh genuine investigation.
4. Read back that exact finalized trace through the dashboard or authenticated
   official CLI/Public API. No saved CLI login or `NEATLOGS_TOKEN` is available.
5. Optionally complete the interactive, human-approved repair and verify its
   separate trace under the same session. No repair was approved by this task.

No arbitrary SQL, unrelated container changes, commits, or pushes were performed.
