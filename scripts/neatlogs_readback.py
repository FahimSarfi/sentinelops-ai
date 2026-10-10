"""Bounded, credential-safe verification of the documented v3 product read path.

The response shape and x-api-key authentication are also used by the published
neatlogs 1.4.26 doctor_v2.py. No response body or credential is retained in evidence.
"""
import asyncio
import json
import re
import time

import httpx

HOSTS = {"ingest.neatlogs.com:443", "eu.ingest.neatlogs.com:443"}
KINDS = {"workflow": "WORKFLOW", "agent_action": "AGENT", "tool_call": "TOOL",
         "llm": "LLM", "task": "TASK", "chain": "CHAIN"}


def expected_tree(spans, trace_id):
    return {format(s.context.span_id, '016x'): {
        'name': s.name, 'kind': s.attributes['neatlogs.span.kind'].upper(),
        'parent': format(s.parent.span_id, '016x') if s.parent else None,
    } for s in spans if format(s.context.trace_id, '032x') == trace_id}


def inspect_trace(body, trace_id, expected=None):
    result = {'dashboard_finalization': 'unverified', 'hierarchy_verified': False}
    if not isinstance(body, dict) or body.get('_id') != trace_id:
        return {**result, 'reason': 'TRACE_ID_MISMATCH'}
    if body.get('status') != 'success':
        return {**result, 'reason': 'TRACE_NOT_FINALIZED'}
    result['dashboard_finalization'] = 'verified'
    if not expected:
        return {**result, 'reason': 'EXPECTED_TREE_UNAVAILABLE'}
    spans = body.get('spans')
    if not isinstance(spans, list) or len(spans) != len(expected):
        return {**result, 'reason': 'SPAN_COUNT_MISMATCH'}
    actual = {}
    for s in spans:
        if not isinstance(s, dict):
            return {**result, 'reason': 'INVALID_SPAN'}
        sid = s.get('span_id')
        if not isinstance(sid, str) or sid in actual:
            return {**result, 'reason': 'INVALID_OR_DUPLICATE_SPAN_ID'}
        kind = str(s.get('node_type') or s.get('span_type') or '').lower()
        actual[sid] = {'name': s.get('node_name') or s.get('span_name'),
                       'kind': KINDS.get(kind, kind.upper()),
                       'parent': s.get('parent_span_id') or None}
    if actual != expected:
        return {**result, 'reason': 'SPAN_TREE_MISMATCH'}
    return {**result, 'hierarchy_verified': True, 'span_count': len(actual),
            'llm_spans': sum(s['kind'] == 'LLM' for s in actual.values()),
            'tool_spans': sum(s['kind'] == 'TOOL' for s in actual.values()),
            'reason': 'EXACT_TREE_VERIFIED'}


async def readback(trace_id, key, endpoint, expected=None, *, timeout=30, transport=None):
    result = {'dashboard_finalization': 'unverified', 'hierarchy_verified': False}
    if endpoint not in HOSTS or not re.fullmatch(r'[0-9a-f]{32}', trace_id) or not key:
        return {**result, 'reason': 'READBACK_CONFIGURATION_INVALID'}
    url = 'https://' + endpoint.split(':')[0] + '/api/traces/v3/' + trace_id
    deadline = time.monotonic() + timeout
    async with httpx.AsyncClient(transport=transport, follow_redirects=False) as client:
        while time.monotonic() < deadline:
            try:
                async with client.stream('GET', url, headers={'x-api-key': key},
                                         timeout=min(5, max(.001, deadline - time.monotonic()))) as response:
                    result['readback_http_status'] = response.status_code
                    if response.status_code in (401, 403):
                        return {**result, 'reason': 'AUTH_FAILED'}
                    if response.status_code == 200:
                        data = bytearray()
                        async for chunk in response.aiter_bytes():
                            data.extend(chunk)
                            if len(data) > 1024 * 1024:
                                return {**result, 'reason': 'READBACK_TOO_LARGE'}
                        return {**result, **inspect_trace(json.loads(data), trace_id, expected)}
                    if response.status_code == 409:
                        return {**result, 'reason': 'FINALIZATION_FAILED'}
                    if response.status_code not in (202, 404):
                        return {**result, 'reason': 'READBACK_HTTP_ERROR'}
            except (ValueError, TypeError):
                return {**result, 'reason': 'READBACK_INVALID'}
            except httpx.HTTPError:
                return {**result, 'reason': 'READBACK_CONNECTION_FAILED'}
            await asyncio.sleep(min(2, max(0, deadline - time.monotonic())))
    return {**result, 'reason': 'TRACE_READBACK_TIMEOUT'}
