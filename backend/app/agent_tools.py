"""Fixed operations only. Hooks receive safe metadata, never provider payloads."""
import psycopg

from simulator import core
from backend.app.telemetry import operation


def plan_summary(plan):
    nodes = list(core.plan_nodes(plan))
    return {"sequential_scan": any(n.get("Node Type") == "Seq Scan" for n in nodes),
            "demo_index_used": any(n.get("Index Name") == core.INDEX_NAME for n in nodes)}


def metrics_summary(result):
    return {key: result[key] for key in ("p50_ms", "p95_ms", "sample_count", "result_count", "result_sha256")}


class DatabaseTools:
    def read(self, name):
        with core.connect() as conn:
            with conn.transaction():
                conn.execute("SET TRANSACTION READ ONLY")
                conn.execute("SET LOCAL transaction_timeout = '15000ms'")
                if name == "metrics":
                    return metrics_summary(core.benchmark(conn))
                if name == "explain":
                    return plan_summary(core.explain(conn))
                if name == "schema":
                    return core.inspect_schema(conn)
                raise ValueError("Unknown read operation")

    def recover(self, action):
        if action != core.REPAIR_ACTION:
            raise ValueError("Unauthorized repair")
        with core.connect() as conn:
            # Transaction rolls back the index if any verification criterion fails.
            with conn.transaction() as transaction:
                conn.execute("SET LOCAL transaction_timeout = '60000ms'")
                before = core.benchmark(conn)
                if not plan_summary(before["plan"])["sequential_scan"] or core.check_demo_index(conn):
                    raise ValueError("Incident no longer degraded")
                core.repair(conn, action)
                after = core.benchmark(conn)
                with operation("recovery.verify", "TASK") as span:
                    comparison = core.compare_benchmarks(before, after)
                    span.payload("output", comparison)
                    if not comparison["verified"]:
                        span.error("verification_failed")
                report = {"before": metrics_summary(before), "after": metrics_summary(after), **comparison}
                if not comparison["verified"]:
                    raise psycopg.Rollback(transaction)
            return report
