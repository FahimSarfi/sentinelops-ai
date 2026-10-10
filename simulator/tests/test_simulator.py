from contextlib import nullcontext
from decimal import Decimal
from unittest.mock import MagicMock

import pytest

from simulator import core
from simulator.__main__ import main


def test_synthetic_dataset_is_deterministic():
    rows = list(core.synthetic_orders())
    assert len(rows) == 100_000
    assert rows == list(core.synthetic_orders())
    assert len({row[0] for row in rows}) == 100_000
    assert len({row[1] for row in rows}) == 10_000
    assert all(row[1].endswith("@example.invalid") for row in rows)
    assert rows[0][3] == Decimal("10.00")
    assert sum(row[1] == core.DEFAULT_EMAIL for row in rows) == 10


@pytest.mark.parametrize("percent,expected", [(50, 50), (95, 95), (100, 100)])
def test_nearest_rank_percentile(percent, expected):
    assert core.percentile(list(range(100, 0, -1)), percent) == expected


@pytest.mark.parametrize("values,percent", [([], 95), ([1], 0), ([1], 101)])
def test_invalid_percentile(values, percent):
    with pytest.raises(ValueError):
        core.percentile(values, percent)


def test_lookup_binds_untrusted_input():
    conn = MagicMock()
    email = "x'; DROP TABLE orders; --"
    core.lookup(conn, email)
    conn.execute.assert_called_once_with(core.LOOKUP_SQL, (email,))
    assert email not in core.LOOKUP_SQL


def test_repair_rejects_sql_before_touching_database():
    conn = MagicMock()
    with pytest.raises(ValueError, match="allowlisted"):
        core.repair(conn, "DROP DATABASE sentinelops_demo")
    assert not conn.mock_calls


@pytest.mark.parametrize("operation", [core.reset, core.repair])
def test_index_name_collision_is_rejected(operation):
    conn = MagicMock()
    conn.transaction.return_value = nullcontext()
    conn.execute.return_value.fetchone.return_value = ("CREATE INDEX unrelated ON other_table (id)",)
    with pytest.raises(ValueError, match="another object"):
        operation(conn)
    assert conn.execute.call_count == 1


def test_reset_only_drops_fixed_demo_index():
    conn = MagicMock()
    conn.transaction.return_value = nullcontext()
    conn.execute.return_value.fetchone.return_value = (core.EXPECTED_INDEX,)
    core.reset(conn)
    assert conn.execute.call_args.args == (core.DROP_INDEX_SQL,)
    assert conn.execute.call_count == 2


def test_existing_repair_is_idempotent():
    conn = MagicMock()
    conn.transaction.return_value = nullcontext()
    conn.execute.return_value.fetchone.return_value = (core.EXPECTED_INDEX,)
    core.repair(conn)
    assert conn.execute.call_count == 1


def test_benchmark_detects_changed_results(monkeypatch):
    monkeypatch.setattr(core, "lookup", MagicMock(side_effect=[[(1,)], [(2,)]]))
    with pytest.raises(ValueError, match="changed"):
        core.benchmark(MagicMock(), samples=2, warmup=0)


def test_benchmark_reports_measured_percentiles(monkeypatch):
    monkeypatch.setattr(core, "lookup", lambda *args: [(1,)])
    monkeypatch.setattr(core, "perf_counter_ns", MagicMock(side_effect=[0, 1_000_000, 2_000_000, 5_000_000]))
    conn = MagicMock()
    result = core.benchmark(conn, samples=2, warmup=0)
    assert result["p50_ms"] == 1
    assert result["p95_ms"] == 3
    assert result["sample_count"] == 2
    assert "EXPLAIN (ANALYZE, BUFFERS" in conn.execute.call_args.args[0]
    assert conn.execute.call_args.args[1] == (core.DEFAULT_EMAIL,)


@pytest.mark.parametrize("samples,warmup", [(1, 0), (10, -1)])
def test_invalid_benchmark_settings(samples, warmup):
    with pytest.raises(ValueError):
        core.benchmark(MagicMock(), samples=samples, warmup=warmup)


def test_cli_missing_config_is_clear(monkeypatch, capsys):
    monkeypatch.setattr(core, "connect", MagicMock(side_effect=ValueError("Set demo environment")))
    assert main(["seed"]) == 2
    assert "Set demo environment" in capsys.readouterr().err


def test_connection_is_fixed_to_demo_port(monkeypatch):
    for key in ("POSTGRES_USER", "POSTGRES_PASSWORD", "POSTGRES_DB"):
        monkeypatch.setenv(key, "test")
    mocked = MagicMock()
    mocked.return_value.info.server_version = 170000
    monkeypatch.setattr(core.psycopg, "connect", mocked)
    core.connect()
    assert mocked.call_args.kwargs["host"] == "127.0.0.1"
    assert mocked.call_args.kwargs["port"] == 5433
