# SentinelOps AI

An incident response demo for neatHack 2026. The existing FastAPI app lives in
`backend/app`; Milestone 4 adds an independent PostgreSQL checkout incident simulator.

## Local setup

Run from the repository root on Ubuntu/WSL with Docker Desktop integration.
Use the existing Python virtual environment (Python 3.10+):

```bash
source .venv/bin/activate
python -m pip install -r simulator/requirements.txt
# Only if .env does not already exist:
cp -n .env.example .env
docker compose up -d --wait postgres
```

`.env.example` contains public, nonproduction demo credentials. `.env` is ignored
by Git; never commit real credentials. The CLI reads the repository `.env` and
respects any exported environment overrides. PostgreSQL initialization credentials
apply only when the named volume is first created; changing `.env` alone does not
change an existing database user's password.

The service uses PostgreSQL 17, container `sentinelops-postgres`, a health check,
and named volume `sentinelops_postgres_data` (Compose prefixes it with `sentinelops_`).
Its only published binding is **127.0.0.1:5433:5432**. The CLI fixes the endpoint
to localhost:5433 and checks the server major version. Existing `postgres-dev`
(5432), `mongo-dev` (27017), and `redis-dev` (6379) are not involved.

The backend still runs independently:

```bash
python -m uvicorn backend.app.main:app --reload
```

## Reproduce the incident and recovery

The complete cycle is one command:

```bash
python -m simulator verify --samples 200 --output evidence/milestone4-verification.json
```

`verify` removes only the demo repair index, seeds or validates the deterministic
fixture, benchmarks the missing-index incident, creates the allowlisted index,
and benchmarks recovery. It leaves the repaired index in place. Exit status is
0 only when results match, the initial plan uses a sequential scan, the repaired
plan uses the demo index, and both measured p50 and p95 improve. Status 1 means
verification failed (inspect the JSON); status 2 means configuration or execution
failed. On failure after repair, the index can remain present; use `reset` to
restore the incident. Run one simulator/test process at a time.

Individual operations are also available:

```bash
python -m simulator reset
python -m simulator seed
python -m simulator benchmark --samples 200 --output evidence/before.json
python -m simulator repair
python -m simulator benchmark --samples 200 --output evidence/after.json
python -m simulator reset
```

Seeding creates exactly 100,000 deterministic orders in `sentinelops_demo.orders`,
with synthetic `customer_email`, `status`, `total_amount`, and UTC `created_at`
fields plus an order ID primary key. There are 10,000 synthetic customers, each
with 10 orders; addresses use the reserved `example.invalid` domain. The initial
schema has only the ID primary-key index; `customer_email` is unindexed. Repeated
seed calls validate existing data and never overwrite it. Seed refuses unexpected
data or secondary indexes; after repair, run reset before seeding again.

Checkout lookup binds email with psycopg parameters and returns all matching
orders ordered by ID. The default customer is `customer-004242@example.invalid`.
Use `--email` to select another existing synthetic customer. Each benchmark:

- Performs 10 warmups by default (`--warmup`), then 100 measured samples by default.
- Times query execution and result fetching with a monotonic nanosecond clock;
  reports milliseconds, raw samples, sample count, and nearest-rank p50/p95.
- Captures a real `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` plan outside the timed samples.
- Checks every result against the baseline and records a SHA-256 result fingerprint.
  Verification compares result counts and fingerprints before and after repair.

This demonstrates a warm-cache scan versus indexed lookup, not a forced cold-cache
benchmark. PostgreSQL chooses the plans naturally; no planner options disable
sequential scans. Host load, Docker overhead, and caching affect timings. No
latencies or speedup claims are fabricated or hardcoded. If improvement is noisy,
reduce unrelated host load and rerun with more samples. The evidence includes
server version, complete plans and buffer statistics for inspection.

## Repair and reset safety

The only repair action is `create_checkout_email_index`, mapped to fixed SQL for
`orders_customer_email_demo_idx` on `sentinelops_demo.orders(customer_email)`.
There is no SQL input option or LLM-generated SQL execution path. Repair and reset
are idempotent. Before touching a same-named index, both verify its exact table,
column and index definition; conflicting objects are rejected.

Reset executes only a schema-qualified `DROP INDEX IF EXISTS` for that index.
It never drops a database, table, schema, primary key, unrelated index, or rows.
An independently created email index may keep lookups fast; reset leaves it alone,
and verification/seed refuses that altered fixture. The demo uses ordinary index
creation for this small isolated table; it is not a production online-DDL recipe.

## Tests

```bash
# Existing incident model tests plus simulator unit tests; database tests clearly skip.
python -m pytest -q -rs

# Explicitly enable the real database tests after starting the service.
SENTINELOPS_TEST_POSTGRES=1 python -m pytest -q -rs
```

The integration tests cover seeding, measured before/after performance, identical
lookup results, actual planner index use, idempotency, restoring the sequential
scan, SQL parameterization, index-name collision protection, and preservation of
rows and unrelated indexes. They run in rollback-only transactions, restoring the
prior database state after each test. When opted in but credentials or the local
test database are unavailable, they skip with a clear reason. Schema errors and
failed performance/correctness assertions fail rather than silently skipping.
These tests mutate the demo schema temporarily: use only this isolated fixture.

The existing app, incident models, and Entire/Codex hook settings are unchanged.
