"""Verify exact finalized traces; never treat transport acceptance as success.

python -m scripts.verify_neatlogs --minimal   # generated data, no model/DB calls
python -m scripts.verify_neatlogs             # real investigation, no repair
python -m scripts.verify_neatlogs --trace-id <id>  # readback only
"""
import argparse
import asyncio
import json
import os
from pathlib import Path

from dotenv import load_dotenv
import httpx
from opentelemetry.sdk.trace.export import SimpleSpanProcessor
from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter

from backend.app.main import app, get_agent
from backend.app.telemetry import configured
from scripts.neatlogs_readback import expected_tree, readback


async def verify(allow_unconfigured=False, *, minimal=False, trace_id=None, timeout=30):
    load_dotenv(Path(__file__).resolve().parents[1] / '.env', override=False)
    key = os.getenv('NEATLOGS_API_KEY')
    endpoint = os.getenv('NEATLOGS_OTLP_ENDPOINT', 'ingest.neatlogs.com:443')
    if trace_id:
        evidence = await readback(trace_id, key, endpoint, timeout=timeout)
        print(json.dumps({'trace_id': trace_id, **evidence}, indent=2))
        return 0 if evidence['dashboard_finalization'] == 'verified' else 3
    required = ['NEATLOGS_API_KEY']
    if not minimal:
        required += ['SENTINELOPS_MODEL', 'SENTINELOPS_MODEL_API_KEY']
    missing = [name for name in required if not os.getenv(name)]
    if missing and not allow_unconfigured:
        print(json.dumps({'status': 'blocked', 'missing': missing}))
        return 2
    telemetry = configured() if minimal else get_agent().telemetry
    if telemetry.provider is None:
        print(json.dumps({'status': 'blocked', 'reason': 'telemetry_not_configured'}))
        return 2
    capture = InMemorySpanExporter()
    telemetry.provider.add_span_processor(SimpleSpanProcessor(capture))
    try:
        if minimal:
            with telemetry.span('diagnostic.minimal', 'WORKFLOW') as root:
                root.payload('input', {'verified': True})
                with telemetry.span('diagnostic.llm', 'LLM') as span:
                    span.attribute('neatlogs.llm.model_name', 'diagnostic-no-model-call')
                    span.payload('input', {'verified': True})
                    span.payload('output', {'verified': True})
                with telemetry.span('diagnostic.tool', 'TOOL') as span:
                    span.payload('input', {'verified': True})
                    span.payload('output', {'verified': True})
                root.payload('output', {'verified': True})
            trace_id = root.trace_id
            evidence = {'mode': 'synthetic', 'real_model_called': False}
        else:
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url='http://sentinelops.local', timeout=120) as client:
                response = await client.post('/incidents')
                response.raise_for_status()
                identifier = response.json()['incident_id']
                response = await client.post(f'/incidents/{identifier}/investigate')
                response.raise_for_status()
                state = response.json()
            trace_id = state.get('telemetry', {}).get('trace_ids', [None])[-1]
            evidence = {'mode': 'investigation', 'incident_id': identifier,
                        'incident_status': state['status'], 'repair_executed': False,
                        'observed_tools': [e['tool'] for e in state['evidence'].values()]}
        drained = await asyncio.to_thread(telemetry.flush)
        delivery = telemetry.exporter
        tree = expected_tree(capture.get_finished_spans(), trace_id)
        successful_model_calls = sum(
            s.attributes.get('http.response.status_code') == 200
            and s.attributes.get('neatlogs.span.kind') == 'llm'
            and format(s.context.trace_id, '032x') == trace_id
            for s in capture.get_finished_spans())
        evidence['successful_model_calls'] = successful_model_calls
        check = await readback(trace_id, key, endpoint, tree, timeout=timeout) if trace_id else {
            'dashboard_finalization': 'unverified', 'hierarchy_verified': False, 'reason': 'TRACE_ID_MISSING'}
        evidence.update(trace_id=trace_id, export_queue_drained=drained,
                        transport_accepted_spans=delivery.accepted_spans,
                        transport_failed_spans=delivery.failed_spans, **check)
        print(json.dumps(evidence, indent=2))
        success = (not missing and (minimal or successful_model_calls > 0) and
                   drained and not delivery.failed_spans and
                   check['hierarchy_verified'] and check.get('llm_spans', 0) > 0 and
                   check.get('tool_spans', 0) > 0)
        return 0 if success else 3
    finally:
        await asyncio.to_thread(telemetry.shutdown)
        capture.clear()
        get_agent.cache_clear()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--allow-unconfigured', action='store_true')
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument('--minimal', action='store_true')
    mode.add_argument('--trace-id')
    parser.add_argument('--timeout', type=float, default=30)
    args = parser.parse_args()
    raise SystemExit(asyncio.run(verify(args.allow_unconfigured, minimal=args.minimal,
                                       trace_id=args.trace_id, timeout=args.timeout)))
