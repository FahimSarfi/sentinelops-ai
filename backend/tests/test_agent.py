import asyncio
from unittest.mock import MagicMock

import httpx
import pytest
from fastapi.testclient import TestClient

from backend.app.agent import Agent, Conflict
from backend.app.agent_state import Store
from backend.app.provider import CompatibleModel, TransientError
from backend.app import main


def run(awaitable):
    return asyncio.run(awaitable)


DATA = {
    "metrics": {"p50_ms": 4, "p95_ms": 5, "result_count": 10, "sample_count": 100, "result_sha256": "abc"},
    "explain": {"sequential_scan": True, "demo_index_used": False},
    "schema": {"expected_columns_present": True, "demo_index_present": False},
}


def call(name, **arguments):
    return {"name": name, "arguments": arguments}


def diagnosis(**overrides):
    values = dict(finding="missing_checkout_email_index", confidence=.95,
                  evidence_ids=["e1", "e2", "e3"], repair_id="create_checkout_email_index")
    values.update(overrides)
    return call("diagnose", **values)


class Model:
    def __init__(self, calls):
        self.calls = iter(calls)
        self.messages = []

    async def next(self, messages, tools):
        self.messages.append(list(messages))
        value = next(self.calls)
        if isinstance(value, Exception):
            raise value
        return value


@pytest.fixture
def make(tmp_path):
    counter = 0
    def factory(calls, **kwargs):
        nonlocal counter
        counter += 1
        database = MagicMock()
        database.read.side_effect = lambda name: DATA[name]
        database.recover.return_value = {"verified": True, "results_identical": True, "p95_speedup": 12}
        agent = Agent(Store(tmp_path / f"state{counter}.sqlite3"), Model(calls), database, **kwargs)
        return agent, agent.create()["incident_id"]
    return factory


def sequence(order=("schema", "metrics", "explain")):
    return [*(call(name) for name in order), diagnosis()]


@pytest.mark.parametrize("order", [("schema", "metrics", "explain"), ("explain", "schema", "metrics")])
def test_model_controls_order_and_explicit_approval(make, order):
    agent, identifier = make(sequence(order))
    state = run(agent.investigate(identifier))
    assert state["status"] == "awaiting_approval"
    assert [c.args[0] for c in agent.database.read.call_args_list] == list(order)
    assert '"evidence_id": "e1"' in agent.model.messages[1][-1]["content"]
    agent.database.recover.assert_not_called()
    assert run(agent.decide(identifier, True))["status"] == "resolved"
    agent.database.recover.assert_called_once_with("create_checkout_email_index")
    with pytest.raises(Conflict):
        run(agent.decide(identifier, True))
    assert agent.store.get(identifier)["events"][-1]["event"] == "resolved"


def test_observation_driven_branch(make):
    agent, identifier = make([])
    class BranchingModel:
        async def next(self, messages, tools):
            if len(messages) == 2:
                return call("schema")
            # A deterministic stand-in that actually branches on the observation.
            if '"demo_index_present": true' in messages[-1]["content"]:
                return diagnosis(finding="insufficient_evidence", evidence_ids=["e1"], repair_id=None, confidence=.2)
            return call("metrics")
    agent.model = BranchingModel()
    agent.database.read.return_value = None
    agent.database.read.side_effect = lambda name: {**DATA[name], "demo_index_present": True}
    assert run(agent.investigate(identifier))["status"] == "escalated"
    assert agent.database.read.call_count == 1


@pytest.mark.parametrize("bad", [call("shell", command="secret"), call("metrics", sql="secret"),
    diagnosis(repair_id="DROP TABLE orders"), diagnosis(evidence_ids=["invented"]), call("refuse")])
def test_unauthorized_refusal_and_fabricated_evidence(make, bad):
    agent, identifier = make([bad])
    assert run(agent.investigate(identifier))["status"] == "escalated"
    agent.database.recover.assert_not_called()
    assert "secret" not in agent.store.path.read_bytes().decode(errors="ignore")


@pytest.mark.parametrize("last", [diagnosis(confidence=.2), diagnosis(evidence_ids=["e1"]),
    diagnosis(finding="insufficient_evidence", repair_id=None)])
def test_insufficient_evidence(make, last):
    agent, identifier = make(sequence()[:-1] + [last])
    assert run(agent.investigate(identifier))["status"] == "escalated"


def test_tool_failure_does_not_become_evidence(make):
    agent, identifier = make([call("metrics"), diagnosis(evidence_ids=[])])
    agent.database.read.side_effect = RuntimeError("super-secret")
    state = run(agent.investigate(identifier))
    assert state["status"] == "escalated"
    assert not state["evidence"]
    assert "super-secret" not in str(state)
    assert "tool_unavailable" in agent.model.messages[-1][-1]["content"]


def test_approval_enforcement_and_rejection(make):
    agent, identifier = make(sequence())
    with pytest.raises(Conflict):
        run(agent.decide(identifier, True))
    run(agent.investigate(identifier))
    assert run(agent.decide(identifier, False))["status"] == "rejected"
    with pytest.raises(Conflict):
        run(agent.decide(identifier, True))
    agent.database.recover.assert_not_called()


def test_tampered_proposal_revalidated(make):
    agent, identifier = make(sequence())
    state = run(agent.investigate(identifier))
    state["evidence"] = {}
    agent.store.save(state)
    with pytest.raises(Conflict):
        run(agent.decide(identifier, True))
    agent.database.recover.assert_not_called()


@pytest.mark.parametrize("failure", [False, RuntimeError("secret")])
def test_recovery_failure(make, failure):
    agent, identifier = make(sequence())
    run(agent.investigate(identifier))
    if failure is False:
        agent.database.recover.return_value = {"verified": False}
    else:
        agent.database.recover.side_effect = failure
    assert run(agent.decide(identifier, True))["status"] == "failed"


def test_transient_retry_and_step_bound(make):
    agent, identifier = make([TransientError(), call("history"), call("history")], max_steps=2)
    state = run(agent.investigate(identifier))
    assert state["events"][-1]["event"] == "step_limit"
    assert len(agent.model.messages) == 3


def test_timeout(make):
    agent, identifier = make([], timeout=.01)
    async def slow(*args):
        await asyncio.sleep(1)
    agent.model.next = slow
    assert run(agent.investigate(identifier))["events"][-1]["event"] == "investigation_timeout"


def test_provider_missing_configuration(make, monkeypatch):
    monkeypatch.delenv("SENTINELOPS_MODEL", raising=False)
    monkeypatch.delenv("SENTINELOPS_MODEL_API_KEY", raising=False)
    agent, identifier = make([])
    agent.model = CompatibleModel()
    assert run(agent.investigate(identifier))["status"] == "escalated"


def test_api(make, monkeypatch):
    agent, _ = make(sequence())
    monkeypatch.setattr(main, "get_agent", lambda: agent)
    with TestClient(main.app) as client:
        assert client.get("/").status_code == client.get("/health").status_code == 200
        identifier = client.post("/incidents").json()["incident_id"]
        url = f"/incidents/{identifier}"
        assert client.post(url + "/decision", json={"decision": "approve"}).status_code == 409
        assert client.post(url + "/investigate").json()["status"] == "awaiting_approval"
        assert client.post(url + "/decision", json={"decision": "approve", "sql": "x"}).status_code == 422
        assert client.post(url + "/decision", json={"decision": "approve"}).json()["status"] == "resolved"
        assert client.get(url + "/report").json()["recovery"]["verified"]
        assert client.get("/incidents/invalid").status_code == 404


def test_restart_does_not_replay_repair(make):
    agent, identifier = make([])
    state = agent.store.get(identifier)
    state["status"] = "recovering"
    agent.store.save(state)
    reopened = Store(agent.store.path)
    assert reopened.get(identifier)["status"] == "failed"
    agent.database.recover.assert_not_called()


@pytest.mark.parametrize("status,body,expected", [
    (200, {"choices": [{"message": {"tool_calls": [{"function": {"name": "schema", "arguments": "{}"}}]}}]}, "schema"),
    (200, {"choices": [{"message": {"refusal": "declined"}}]}, "refuse"),
    (429, {}, TransientError),
    (401, {}, httpx.HTTPStatusError),
    (200, {"choices": [{"message": {"tool_calls": []}}]}, ValueError),
])
def test_real_adapter_protocol(monkeypatch, status, body, expected):
    monkeypatch.setenv("SENTINELOPS_MODEL", "test-model")
    monkeypatch.setenv("SENTINELOPS_MODEL_API_KEY", "test-secret")
    monkeypatch.setenv("SENTINELOPS_MODEL_BASE_URL", "https://provider.example/v1")
    actual_client = httpx.AsyncClient
    def handler(request):
        import json
        sent = json.loads(request.content)
        assert request.url.path == "/v1/chat/completions"
        assert sent["model"] == "test-model"
        assert sent["tool_choice"] == "required"
        assert request.headers["authorization"] == "Bearer test-secret"
        return httpx.Response(status, json=body)
    monkeypatch.setattr(httpx, "AsyncClient", lambda **kwargs: actual_client(transport=httpx.MockTransport(handler), **kwargs))
    if isinstance(expected, str):
        assert run(CompatibleModel().next([], []))["name"] == expected
    else:
        with pytest.raises(expected):
            run(CompatibleModel().next([], []))


def test_retry_exhaustion(make):
    agent, identifier = make([TransientError(), TransientError(), TransientError()])
    assert run(agent.investigate(identifier))["status"] == "escalated"
    assert len(agent.model.messages) == 3


def test_concurrent_approvals_execute_once(make):
    agent, identifier = make(sequence())
    async def concurrent():
        await agent.investigate(identifier)
        return await asyncio.gather(agent.decide(identifier, True), agent.decide(identifier, True), return_exceptions=True)
    results = run(concurrent())
    assert sum(isinstance(result, Conflict) for result in results) == 1
    agent.database.recover.assert_called_once()
