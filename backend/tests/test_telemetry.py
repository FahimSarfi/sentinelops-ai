import asyncio
import json
from unittest.mock import MagicMock

import httpx
import pytest
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import SimpleSpanProcessor
from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter
from opentelemetry.trace import StatusCode

from backend.app.agent import Agent, Conflict
from backend.app.agent_state import Store
from backend.app.provider import CompatibleModel, TransientError
from backend.app.telemetry import Telemetry, configured, safe
from backend.tests.test_agent import Model, DATA, sequence, call, run


@pytest.fixture
def capture(tmp_path):
    exporter = InMemorySpanExporter()
    provider = TracerProvider()
    provider.add_span_processor(SimpleSpanProcessor(exporter))
    telemetry = Telemetry(provider)
    database = MagicMock()
    database.read.side_effect = lambda name: DATA[name]
    database.recover.return_value = {"verified": True, "results_identical": True}
    agent = Agent(Store(tmp_path / 'trace.sqlite3'), Model(sequence()), database, telemetry=telemetry)
    yield agent, exporter, telemetry
    provider.shutdown()


def spans(exporter, name):
    return [s for s in exporter.get_finished_spans() if s.name == name]


def test_real_hierarchy_approval_and_session(capture):
    agent, exporter, telemetry = capture
    identifier = agent.create()['incident_id']
    state = run(agent.investigate(identifier))
    agent.database.recover.assert_not_called()
    root = spans(exporter, 'investigate')[0]
    assert state['telemetry']['trace_ids'] == [format(root.context.trace_id, '032x')]
    assert len(spans(exporter, 'model.request')) == 4
    for span in exporter.get_finished_spans():
        assert span.end_time >= span.start_time
        assert span.attributes['incident_id'] == identifier
        assert span.attributes['neatlogs.session.id'] == identifier
        if span.name not in ('create', 'investigate'):
            assert span.parent.span_id == root.context.span_id
    assert json.loads(spans(exporter, 'schema')[0].attributes['neatlogs.tool.output'])['data']['expected_columns_present']
    state = run(agent.decide(identifier, True))
    assert state['status'] == 'resolved'
    assert len(state['telemetry']['trace_ids']) == 2
    decision = spans(exporter, 'decision')[0]
    assert decision.context.trace_id != root.context.trace_id
    repair = spans(exporter, 'create_checkout_email_index')[0]
    assert repair.parent.span_id == decision.context.span_id
    assert spans(exporter, 'recovery.verification_result')[0].parent.span_id == repair.context.span_id
    assert telemetry.flush()


def test_retries_and_secrets(capture):
    agent, exporter, _ = capture
    secret = 'secret-bearer-password-example'
    agent.model = Model([TransientError(secret), call('metrics'), call('shell', password=secret)])
    agent.database.read.side_effect = RuntimeError(secret)
    result = run(agent.investigate(agent.create()['incident_id']))
    assert result['status'] == 'escalated'
    assert len(spans(exporter, 'model.request')) == 3
    assert spans(exporter, 'model.request')[0].status.status_code == StatusCode.ERROR
    assert spans(exporter, 'metrics')[0].status.status_code == StatusCode.ERROR
    assert any(e.name == 'model_retry' for e in spans(exporter, 'investigate')[0].events)
    encoded = str([(s.attributes, s.events, s.status.description) for s in exporter.get_finished_spans()])
    assert secret not in encoded
    assert 'password' not in encoded
    assert not spans(exporter, 'shell')


def test_timeout_and_cancellation_end_spans(capture):
    agent, exporter, _ = capture
    async def slow(*args):
        await asyncio.sleep(5)
    agent.model.next = slow
    agent.timeout = .01
    result = run(agent.investigate(agent.create()['incident_id']))
    assert result['status'] == 'escalated'
    assert spans(exporter, 'model.request')[0].end_time
    assert spans(exporter, 'model.request')[0].status.status_code == StatusCode.ERROR
    async def cancel():
        task = asyncio.create_task(agent.investigate(agent.create()['incident_id']))
        await asyncio.sleep(.001)
        task.cancel()
        with pytest.raises(asyncio.CancelledError):
            await task
    run(cancel())
    assert len(spans(exporter, 'investigate')) == 2


def test_rejection_and_conflict_do_not_repair(capture):
    agent, exporter, _ = capture
    identifier = agent.create()['incident_id']
    with pytest.raises(Conflict):
        run(agent.decide(identifier, True))
    run(agent.investigate(identifier))
    assert run(agent.decide(identifier, False))['status'] == 'rejected'
    agent.database.recover.assert_not_called()
    assert not spans(exporter, 'create_checkout_email_index')
    assert spans(exporter, 'decision')[0].status.status_code == StatusCode.ERROR


@pytest.mark.parametrize('failure', ['start', 'attribute', 'end', 'flush', 'shutdown'])
def test_broken_telemetry_never_changes_response(capture, failure):
    agent, exporter, telemetry = capture
    if failure == 'start':
        telemetry.tracer = MagicMock()
        telemetry.tracer.start_span.side_effect = RuntimeError('secret')
    elif failure in ('attribute', 'end'):
        span = MagicMock()
        span.get_span_context.return_value.is_valid = False
        getattr(span, 'set_attribute' if failure == 'attribute' else 'end').side_effect = RuntimeError('secret')
        telemetry.tracer = MagicMock()
        telemetry.tracer.start_span.return_value = span
    else:
        telemetry.provider = MagicMock()
        getattr(telemetry.provider, 'force_flush' if failure == 'flush' else 'shutdown').side_effect = RuntimeError('secret')
    identifier = agent.create()['incident_id']
    assert run(agent.investigate(identifier))['status'] == 'awaiting_approval'
    assert run(agent.decide(identifier, True))['status'] == 'resolved'
    telemetry.flush()
    telemetry.shutdown()


def test_projection_omits_free_text_headers_and_credentials():
    value = {'Authorization': 'Bearer secret', 'password': 'secret', 'data': {'p95_ms': 5, 'name': 'sk-live-secret', 'unexpected': 'secret'}, 'content': 'postgres://user:password@host'}
    projected = json.dumps(safe(value))
    assert 'secret' not in projected and 'password' not in projected and 'postgres://' not in projected
    assert '5' in projected


def test_missing_key_and_untrusted_destination(monkeypatch):
    monkeypatch.delenv('NEATLOGS_API_KEY', raising=False)
    assert configured().provider is None
    monkeypatch.setenv('NEATLOGS_API_KEY', 'test-key')
    monkeypatch.setenv('NEATLOGS_OTLP_ENDPOINT', 'attacker.example:443')
    assert configured().provider is None
    monkeypatch.setenv('NEATLOGS_OTLP_ENDPOINT', 'ingest.neatlogs.com:443')
    monkeypatch.setenv('NEATLOGS_API_KEY', 'nlw_test')
    assert configured().provider is None


def test_provider_usage_and_response_capture(capture, monkeypatch):
    agent, exporter, _ = capture
    monkeypatch.setenv('SENTINELOPS_MODEL', 'test-model')
    monkeypatch.setenv('SENTINELOPS_MODEL_API_KEY', 'provider-secret')
    body = {'usage': {'prompt_tokens': 17, 'completion_tokens': 8, 'total_tokens': 25}, 'choices': [{'message': {'tool_calls': [{'function': {'name': 'refuse', 'arguments': '{}'}}]}}]}
    actual = httpx.AsyncClient
    monkeypatch.setattr(httpx, 'AsyncClient', lambda **kwargs: actual(transport=httpx.MockTransport(lambda r: httpx.Response(200, json=body)), **kwargs))
    agent.model = CompatibleModel()
    run(agent.investigate(agent.create()['incident_id']))
    span = spans(exporter, 'model.request')[0]
    assert span.attributes['http.response.status_code'] == 200
    assert span.attributes['neatlogs.llm.token_count.prompt'] == 17
    assert span.attributes['neatlogs.llm.model_name'] == 'test-model'
    assert json.loads(span.attributes['neatlogs.llm.output'])['name'] == 'refuse'
    assert 'provider-secret' not in str(span.attributes)


def test_independent_async_sessions_do_not_mix(capture, tmp_path):
    first, exporter, telemetry = capture
    second = Agent(Store(tmp_path / 'other.sqlite3'), Model(sequence()), first.database, telemetry=telemetry)
    ids = [first.create()['incident_id'], second.create()['incident_id']]
    async def both():
        return await asyncio.gather(first.investigate(ids[0]), second.investigate(ids[1]))
    results = run(both())
    roots = spans(exporter, 'investigate')
    assert len({s.context.trace_id for s in roots}) == 2
    mapping = {s.context.trace_id: s.attributes['incident_id'] for s in roots}
    for span in exporter.get_finished_spans():
        if span.name != 'create':
            assert span.attributes['incident_id'] == mapping[span.context.trace_id]
    assert {r['telemetry']['session_id'] for r in results} == set(ids)


def test_otlp_configuration_and_failed_export(monkeypatch):
    from backend.app.telemetry import DeliveryStatus
    from opentelemetry.sdk.trace.export import SpanExportResult
    import opentelemetry.exporter.otlp.proto.grpc.trace_exporter as grpc_export
    delegate = MagicMock()
    factory = MagicMock(return_value=delegate)
    monkeypatch.setattr(grpc_export, 'OTLPSpanExporter', factory)
    monkeypatch.setenv('NEATLOGS_API_KEY', 'test-project-secret')
    monkeypatch.setenv('NEATLOGS_OTLP_ENDPOINT', 'eu.ingest.neatlogs.com:443')
    telemetry = configured()
    assert factory.call_args.kwargs['headers'] == (('x-api-key', 'test-project-secret'),)
    assert factory.call_args.kwargs['insecure'] is False
    assert factory.call_args.kwargs['endpoint'] == 'eu.ingest.neatlogs.com:443'
    telemetry.shutdown()
    exporter = DeliveryStatus(delegate)
    delegate.export.side_effect = RuntimeError('secret server response')
    assert exporter.export([object()]) == SpanExportResult.FAILURE
    assert exporter.failed_spans == 1 and exporter.accepted_spans == 0


def test_false_recovery_is_visible(capture):
    agent, exporter, _ = capture
    identifier = agent.create()['incident_id']
    run(agent.investigate(identifier))
    agent.database.recover.return_value = {'verified': False}
    assert run(agent.decide(identifier, True))['status'] == 'failed'
    assert spans(exporter, 'create_checkout_email_index')[0].status.status_code == StatusCode.ERROR
    assert spans(exporter, 'recovery.verification_result')[0].status.status_code == StatusCode.ERROR


def test_known_secret_even_when_shaped_like_allowed_id(monkeypatch):
    value = 'a' * 32
    monkeypatch.setenv('EXAMPLE_API_KEY', value)
    assert safe({'incident_id': value}) == {'incident_id': '[omitted]'}


def test_worker_context_and_foreign_parent_isolation(capture):
    from backend.app.telemetry import operation
    from opentelemetry import trace
    agent, exporter, telemetry = capture
    foreign_provider = TracerProvider()
    try:
        with foreign_provider.get_tracer('foreign').start_as_current_span('unrelated') as foreign:
            async def worker():
                with telemetry.span('investigate', 'WORKFLOW', agent.create()['incident_id']):
                    def compare():
                        with operation('recovery.verify', 'TASK'):
                            return trace.get_current_span().get_span_context().trace_id
                    return await asyncio.to_thread(compare)
            child_trace_id = run(worker())
        root = spans(exporter, 'investigate')[0]
        assert root.parent is None
        assert child_trace_id == root.context.trace_id != foreign.get_span_context().trace_id
        child = spans(exporter, 'recovery.verify')[0]
        assert child.parent.span_id == root.context.span_id
    finally:
        foreign_provider.shutdown()


def test_canonical_io_and_genai_span_semantics(capture):
    from opentelemetry.trace import SpanKind
    from backend.app.telemetry import provider_metadata
    agent, exporter, telemetry = capture
    with telemetry.span('investigate', 'WORKFLOW') as root:
        root.payload('input', {'status': 'investigating'})
        with telemetry.span('model.request', 'LLM') as model:
            provider_metadata('test-model', {'usage': {'prompt_tokens': 11, 'completion_tokens': 7}})
            model.payload('output', {'name': 'metrics'})
        with telemetry.span('metrics', 'TOOL') as tool:
            tool.payload('output', {'verified': True})
    workflow = spans(exporter, 'investigate')[0]
    llm = spans(exporter, 'model.request')[0]
    tool = spans(exporter, 'metrics')[0]
    assert workflow.parent is None
    assert workflow.attributes['neatlogs.workflow.name'] == 'sentinelops.investigate'
    assert json.loads(workflow.attributes['neatlogs.workflow.input']) == {'status': 'investigating'}
    assert llm.kind == SpanKind.CLIENT
    assert llm.attributes['gen_ai.operation.name'] == 'chat'
    assert llm.attributes['gen_ai.request.model'] == 'test-model'
    assert llm.attributes['gen_ai.usage.input_tokens'] == 11
    assert llm.attributes['gen_ai.usage.output_tokens'] == 7
    assert json.loads(llm.attributes['neatlogs.llm.output']) == {'name': 'metrics'}
    assert tool.attributes['gen_ai.operation.name'] == 'execute_tool'
    assert tool.attributes['gen_ai.tool.name'] == 'metrics'
    assert json.loads(tool.attributes['neatlogs.tool.output']) == {'verified': True}
    assert llm.parent.span_id == tool.parent.span_id == workflow.context.span_id
    assert all('neatlogs.output.value' not in s.attributes for s in exporter.get_finished_spans())
