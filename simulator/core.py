"""Fixed SQL only; all customer input is bound as query parameters."""

import hashlib
import json
import math
import os
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from time import perf_counter_ns

import psycopg

ROW_COUNT = 100_000
DEFAULT_EMAIL = "customer-004242@example.invalid"
INDEX_NAME = "orders_customer_email_demo_idx"
REPAIR_ACTION = "create_checkout_email_index"
LOOKUP_SQL = """SELECT id, customer_email, status, total_amount, created_at
FROM sentinelops_demo.orders WHERE customer_email = %s ORDER BY id"""
CREATE_INDEX_SQL = """CREATE INDEX orders_customer_email_demo_idx
ON sentinelops_demo.orders USING btree (customer_email)"""
DROP_INDEX_SQL = "DROP INDEX IF EXISTS sentinelops_demo.orders_customer_email_demo_idx"
EXPECTED_INDEX = (
    "CREATE INDEX orders_customer_email_demo_idx ON sentinelops_demo.orders "
    "USING btree (customer_email)"
)


def connect():
    """Deliberately fixed local endpoint: cannot accidentally target postgres-dev."""
    required = ("POSTGRES_USER", "POSTGRES_PASSWORD", "POSTGRES_DB")
    if any(not os.environ.get(key) for key in required):
        raise ValueError("Set POSTGRES_USER, POSTGRES_PASSWORD and POSTGRES_DB in .env")
    conn = psycopg.connect(
        host="127.0.0.1", port=5433, user=os.environ["POSTGRES_USER"],
        password=os.environ["POSTGRES_PASSWORD"], dbname=os.environ["POSTGRES_DB"],
        connect_timeout=3, autocommit=True,
        options="-c timezone=UTC -c statement_timeout=30000 -c lock_timeout=5000",
        application_name="sentinelops-demo",
    )
    if not 170000 <= conn.info.server_version < 180000:
        conn.close()
        raise ValueError("Simulator requires PostgreSQL 17")
    return conn


def synthetic_orders():
    start = datetime(2026, 1, 1, tzinfo=timezone.utc)
    for number in range(ROW_COUNT):
        yield (
            number + 1, f"customer-{number % 10_000:06d}@example.invalid",
            ("pending", "paid", "shipped", "cancelled")[number % 4],
            Decimal(1000 + number % 49000) / 100,
            start + timedelta(seconds=number),
        )


def seed(conn):
    """Create once or validate existing rows; never truncate or overwrite data."""
    with conn.transaction():
        conn.execute("CREATE SCHEMA IF NOT EXISTS sentinelops_demo")
        conn.execute("""CREATE TABLE IF NOT EXISTS sentinelops_demo.orders (
            id bigint PRIMARY KEY, customer_email text NOT NULL,
            status text NOT NULL, total_amount numeric(12,2) NOT NULL,
            created_at timestamptz NOT NULL)""")
        count = conn.execute("SELECT count(*) FROM sentinelops_demo.orders").fetchone()[0]
        if count == 0:
            with conn.cursor().copy(
                "COPY sentinelops_demo.orders (id, customer_email, status, total_amount, created_at) FROM STDIN"
            ) as copy:
                for row in synthetic_orders():
                    copy.write_row(row)
        actual = conn.execute("SELECT * FROM sentinelops_demo.orders ORDER BY id").fetchall()
        if actual != list(synthetic_orders()):
            raise ValueError("Existing demo rows differ; refusing to overwrite them")
        indexes = conn.execute("""SELECT indexname FROM pg_indexes
            WHERE schemaname = 'sentinelops_demo' AND tablename = 'orders'
            AND indexname <> 'orders_pkey'""").fetchall()
        if indexes:
            raise ValueError("Seed requires an unindexed incident; run reset for the demo index")
        conn.execute("ANALYZE sentinelops_demo.orders")
    return {"rows": ROW_COUNT, "customer_email_indexed": False}


def lookup(conn, email):
    return conn.execute(LOOKUP_SQL, (email,)).fetchall()


def fingerprint(rows):
    return hashlib.sha256(json.dumps(rows, default=str, separators=(",", ":")).encode()).hexdigest()


def percentile(values, percent):
    """Nearest-rank percentile, in the same units as values."""
    if not values or not 0 < percent <= 100:
        raise ValueError("Nonempty samples and percentile in (0, 100] required")
    return sorted(values)[math.ceil(len(values) * percent / 100) - 1]


def benchmark(conn, email=DEFAULT_EMAIL, samples=100, warmup=10):
    if samples < 2 or warmup < 0:
        raise ValueError("Use at least two samples and nonnegative warmup")
    baseline = lookup(conn, email)
    if not baseline:
        raise ValueError("Benchmark email must match synthetic orders")
    for _ in range(warmup):
        if lookup(conn, email) != baseline:
            raise ValueError("Results changed during warmup")
    latencies = []
    for _ in range(samples):
        start = perf_counter_ns()
        rows = lookup(conn, email)
        latencies.append((perf_counter_ns() - start) / 1_000_000)
        if rows != baseline:
            raise ValueError("Results changed during benchmark")
    plan = conn.execute("EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) " + LOOKUP_SQL, (email,)).fetchone()[0]
    return {
        "email": email, "sample_count": samples, "warmup_count": warmup,
        "p50_ms": percentile(latencies, 50), "p95_ms": percentile(latencies, 95),
        "latencies_ms": latencies, "result_count": len(baseline),
        "result_sha256": fingerprint(baseline), "plan": plan,
        "postgres_version": conn.info.server_version,
    }


def check_demo_index(conn):
    definition = conn.execute("""SELECT pg_get_indexdef(c.oid)
        FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'sentinelops_demo' AND c.relname = %s""", (INDEX_NAME,)).fetchone()
    if definition and definition[0] != EXPECTED_INDEX:
        raise ValueError("Demo index name belongs to another object; refusing to modify it")
    return bool(definition)


def repair(conn, action=REPAIR_ACTION):
    if action != REPAIR_ACTION:
        raise ValueError("Repair action is not allowlisted")
    with conn.transaction():
        if not check_demo_index(conn):
            conn.execute(CREATE_INDEX_SQL)
    return {"action": REPAIR_ACTION, "index": INDEX_NAME}


def reset(conn):
    with conn.transaction():
        check_demo_index(conn)
        conn.execute(DROP_INDEX_SQL)
    return {"removed_only": INDEX_NAME}


def plan_nodes(value):
    if isinstance(value, dict):
        if "Node Type" in value:
            yield value
        for child in value.values():
            yield from plan_nodes(child)
    elif isinstance(value, list):
        for child in value:
            yield from plan_nodes(child)


def verify(conn, email=DEFAULT_EMAIL, samples=100, warmup=10):
    """Restore incident, measure, apply the sole repair, and measure recovery."""
    reset(conn)
    seed(conn)
    before = benchmark(conn, email, samples, warmup)
    repair(conn)
    after = benchmark(conn, email, samples, warmup)
    identical = (before["result_sha256"], before["result_count"]) == (
        after["result_sha256"], after["result_count"])
    sequential_before = any(n["Node Type"] == "Seq Scan" for n in plan_nodes(before["plan"]))
    indexed_after = any(n.get("Index Name") == INDEX_NAME for n in plan_nodes(after["plan"]))
    improved = after["p95_ms"] < before["p95_ms"] and after["p50_ms"] < before["p50_ms"]
    return {
        "before": before, "after": after, "results_identical": identical,
        "sequential_scan_before": sequential_before, "demo_index_used_after": indexed_after,
        "latency_improved": improved, "p95_speedup": before["p95_ms"] / after["p95_ms"],
        "verified": identical and sequential_before and indexed_after and improved,
    }
