import asyncio
import json

import httpx
import pytest

from scripts.neatlogs_readback import inspect_trace, readback

TID = 'a' * 32
EXPECTED = {'1': {'name': 'root', 'kind': 'WORKFLOW', 'parent': None},
            '2': {'name': 'model', 'kind': 'LLM', 'parent': '1'},
            '3': {'name': 'tool', 'kind': 'TOOL', 'parent': '1'}}


def finalized():
    return {'_id': TID, 'status': 'success', 'spans': [
        {'span_id': sid, 'parent_span_id': s['parent'], 'node_name': s['name'],
         'node_type': {'WORKFLOW': 'workflow', 'LLM': 'llm', 'TOOL': 'tool_call'}[s['kind']]}
        for sid, s in EXPECTED.items()]}


def test_exact_finalized_tree():
    result = inspect_trace(finalized(), TID, EXPECTED)
    assert result['hierarchy_verified']
    assert result['llm_spans'] == result['tool_spans'] == 1


@pytest.mark.parametrize('mutation', ['id', 'processing', 'missing', 'duplicate', 'parent', 'kind', 'name'])
def test_rejects_incomplete_or_different_tree(mutation):
    body = finalized()
    if mutation == 'id':
        body['_id'] = 'b' * 32
    elif mutation == 'processing':
        body['status'] = 'processing'
    elif mutation == 'missing':
        body['spans'].pop()
    elif mutation == 'duplicate':
        body['spans'][2] = body['spans'][1]
    else:
        field = {'parent': 'parent_span_id', 'kind': 'node_type', 'name': 'node_name'}[mutation]
        body['spans'][1][field] = 'wrong'
    assert not inspect_trace(body, TID, EXPECTED)['hierarchy_verified']


def test_pending_then_finalized_uses_authenticated_readback():
    requests = []
    def handler(request):
        requests.append(request)
        assert request.headers['x-api-key'] == 'test-secret'
        assert request.url.path == '/api/traces/v3/' + TID
        return httpx.Response(200, json=finalized())
    result = asyncio.run(readback(TID, 'test-secret', 'ingest.neatlogs.com:443', EXPECTED,
                                 transport=httpx.MockTransport(handler)))
    assert result['hierarchy_verified']
    assert 'test-secret' not in json.dumps(result)
    assert len(requests) == 1


@pytest.mark.parametrize('code,reason', [(202, 'TRACE_READBACK_TIMEOUT'), (401, 'AUTH_FAILED'),
                                        (409, 'FINALIZATION_FAILED'), (302, 'READBACK_HTTP_ERROR')])
def test_acceptance_auth_failure_and_redirect_are_not_success(code, reason):
    result = asyncio.run(readback(TID, 'test-secret', 'ingest.neatlogs.com:443', EXPECTED,
        timeout=.01, transport=httpx.MockTransport(lambda r: httpx.Response(code, json={'secret': 'never print'}))))
    assert result['dashboard_finalization'] == 'unverified'
    assert result['reason'] == reason
    assert 'never print' not in json.dumps(result)


def test_untrusted_destination_receives_no_key():
    def handler(request):
        pytest.fail('must not send request')
    result = asyncio.run(readback(TID, 'test-secret', 'evil.example:443',
                                 transport=httpx.MockTransport(handler)))
    assert result['reason'] == 'READBACK_CONFIGURATION_INVALID'


def test_invalid_or_oversized_response_is_sanitized():
    for body, reason in [(b'not json secret', 'READBACK_INVALID'),
                         (b'X' * (1024 * 1024 + 1), 'READBACK_TOO_LARGE')]:
        result = asyncio.run(readback(TID, 'test-secret', 'ingest.neatlogs.com:443', EXPECTED,
            transport=httpx.MockTransport(lambda r: httpx.Response(200, content=body))))
        assert result['reason'] == reason
        assert 'secret' not in json.dumps(result)


def test_minimal_verifier_does_not_pass_on_transport_acceptance(monkeypatch, capsys):
    from unittest.mock import MagicMock
    from opentelemetry.sdk.trace import TracerProvider
    from backend.app.telemetry import Telemetry
    from scripts import verify_neatlogs
    telemetry = Telemetry(TracerProvider())
    telemetry.exporter = MagicMock(accepted_spans=3, failed_spans=0)
    monkeypatch.setenv('NEATLOGS_API_KEY', 'test-secret')
    monkeypatch.setattr(verify_neatlogs, 'configured', lambda: telemetry)
    async def pending(*args, **kwargs):
        assert len(args[3]) == 3
        return {'dashboard_finalization': 'unverified', 'hierarchy_verified': False,
                'reason': 'TRACE_READBACK_TIMEOUT'}
    monkeypatch.setattr(verify_neatlogs, 'readback', pending)
    assert asyncio.run(verify_neatlogs.verify(minimal=True)) == 3
    evidence = json.loads(capsys.readouterr().out)
    assert evidence['transport_accepted_spans'] == 3
    assert evidence['successful_model_calls'] == 0
    assert evidence['dashboard_finalization'] == 'unverified'
