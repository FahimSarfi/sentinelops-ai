"""Private, fail-open OTLP tracing for Neatlogs. No automatic HTTP/log capture.

Payloads are projected onto the application's fixed vocabulary before export;
unknown strings/keys, raw prompts, headers and exception text are never exported.
"""
from contextlib import contextmanager
from contextvars import ContextVar
from functools import wraps
from uuid import UUID
import json
import math
import os
import re

from opentelemetry import trace, context
from opentelemetry.trace import SpanKind, Status, StatusCode

_CURRENT = ContextVar("sentinelops_telemetry", default=None)
_WORDS = set("metrics explain schema history diagnose refuse missing_checkout_email_index insufficient_evidence create_checkout_email_index detected investigating awaiting_approval escalated rejected recovering resolved failed system user assistant tool function tool_unavailable approve reject required openai_compatible created investigation_started evidence_observed tool_failed model_refused investigation_timeout investigation_error human_approved human_rejected step_limit".split())
_KEYS = set("event tool name arguments finding confidence evidence_ids repair_id evidence_id data error p50_ms p95_ms sample_count result_count result_sha256 sequential_scan demo_index_used expected_columns_present demo_index_present incident_id status before after verified results_identical p50_speedup p95_speedup messages role content tool_calls tool_call_id id type function tools tool_choice decision step attempt retry_delay_ms result_count_matches result_hash_matches sequential_scan_before demo_index_used_after latency_improved before_sequential_scan after_index_used p50_improved p95_improved".split())
_ID = re.compile(r"(?:e[0-9]{1,3}|call_[0-9]{1,3}|[0-9a-f]{32}|[0-9a-f]{64}|[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})\Z")


def safe(value, depth=0):
    if depth > 12:
        return "[omitted]"
    if value is None or type(value) is bool:
        return value
    if type(value) in (int, float):
        return value if math.isfinite(value) else None
    if isinstance(value, str):
        secrets = (v for k, v in os.environ.items() if any(s in k.upper() for s in ("KEY", "TOKEN", "PASSWORD", "SECRET")) and v)
        if any(secret in value for secret in secrets):
            return "[omitted]"
        return value if value in _WORDS or _ID.fullmatch(value) else "[omitted]"
    if isinstance(value, dict):
        return {k: safe(v, depth + 1) for k, v in list(value.items())[:64] if k in _KEYS}
    if isinstance(value, (list, tuple)):
        return [safe(v, depth + 1) for v in value[:64]]
    return "[omitted]"


def message_view(messages):
    """Preserve ordered structured tool observations; omit free-form content."""
    result = []
    for message in messages:
        item = dict(message)
        if item.get("role") == "tool":
            try:
                item["content"] = json.loads(item["content"])
            except (ValueError, TypeError, KeyError):
                item["content"] = None
        if isinstance(item.get("tool_calls"), list):
            item["tool_calls"] = [dict(c, function=dict(c["function"], arguments={})) for c in item["tool_calls"]]
        result.append(item)
    return safe(result)


class Span:
    def __init__(self, raw=None, kind="WORKFLOW"):
        self.raw = raw
        self.kind = kind.lower()

    @property
    def trace_id(self):
        try:
            ctx = self.raw.get_span_context()
            return format(ctx.trace_id, "032x") if ctx.is_valid else None
        except Exception:
            return None

    def attribute(self, key, value):
        try:
            if self.raw is not None:
                self.raw.set_attribute(key, value)
        except Exception:
            pass

    def payload(self, direction, value):
        try:
            if direction in ("input", "output"):
                self.attribute(f"neatlogs.{self.kind}.{direction}", json.dumps(safe(value), allow_nan=False))
        except Exception:
            pass

    def error(self, category="operation_failed"):
        try:
            self.raw.set_status(Status(StatusCode.ERROR, category))
        except Exception:
            pass


class Telemetry:
    def __init__(self, provider=None):
        self.provider = provider
        self.exporter = None
        self.tracer = provider.get_tracer("sentinelops") if provider else None

    @contextmanager
    def span(self, name, kind, incident_id=None, **metadata):
        raw, token = None, None
        parent = _CURRENT.get()
        workflow_name = "sentinelops." + name if kind == "WORKFLOW" else (parent[3] if parent else "sentinelops.operation")
        incident_id = incident_id or (parent[1] if parent else None)
        try:
            incident_id = safe(str(UUID(incident_id))) if incident_id else None
        except (ValueError, TypeError, AttributeError):
            incident_id = None
        wrapped = Span()
        try:
            if self.tracer:
                attrs = {"neatlogs.span.kind": kind.lower(), "neatlogs.workflow_name": workflow_name}
                if incident_id:
                    attrs.update({"incident_id": incident_id, "neatlogs.session.id": incident_id})
                if kind == "TOOL":
                    attrs["neatlogs.tool.name"] = name
                    attrs["gen_ai.tool.name"] = name
                    attrs["gen_ai.operation.name"] = "execute_tool"
                elif kind == "LLM":
                    attrs["gen_ai.operation.name"] = "chat"
                elif kind == "WORKFLOW":
                    attrs["neatlogs.workflow.name"] = workflow_name
                raw = self.tracer.start_span(name, attributes=attrs,
                                             kind=SpanKind.CLIENT if kind == "LLM" else SpanKind.INTERNAL,
                                             context=context.Context() if kind == "WORKFLOW" else None)
                wrapped = Span(raw, kind)
                token = context.attach(trace.set_span_in_context(raw))
        except Exception:
            pass
        current_token = _CURRENT.set((wrapped, incident_id, self, workflow_name))
        try:
            for key, value in safe(metadata).items():
                wrapped.attribute("sentinelops." + key, value)
            yield wrapped
        except BaseException:
            wrapped.error("cancelled_or_failed")
            raise
        finally:
            _CURRENT.reset(current_token)
            if token is not None:
                try:
                    context.detach(token)
                except Exception:
                    pass
            if raw is not None:
                try:
                    raw.end()
                except Exception:
                    pass

    def event(self, kind, metadata):
        try:
            current = _CURRENT.get()
            if current and current[0].raw:
                current[0].raw.add_event(kind, {"data": json.dumps(safe(metadata))})
        except Exception:
            pass

    def flush(self):
        try:
            return bool(self.provider and self.provider.force_flush(timeout_millis=5000))
        except Exception:
            return False

    def shutdown(self):
        try:
            if self.provider:
                self.provider.shutdown()
        except Exception:
            pass


def configured():
    """Only explicitly supported Neatlogs destinations may receive the key."""
    key = os.getenv("NEATLOGS_API_KEY")
    if not key:
        return Telemetry()
    endpoint = os.getenv("NEATLOGS_OTLP_ENDPOINT", "ingest.neatlogs.com:443")
    if key.startswith("nlw_") or endpoint not in ("ingest.neatlogs.com:443", "eu.ingest.neatlogs.com:443"):
        return Telemetry()
    try:
        from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
        from opentelemetry.sdk.resources import Resource
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor
        provider = TracerProvider(resource=Resource({"service.name": "sentinelops-ai"}))
        exporter = DeliveryStatus(OTLPSpanExporter(endpoint=endpoint, insecure=False, headers=(("x-api-key", key),), timeout=3))
        provider.add_span_processor(BatchSpanProcessor(
            exporter,
            max_queue_size=512, max_export_batch_size=128, schedule_delay_millis=1000))
        telemetry = Telemetry(provider)
        telemetry.exporter = exporter
        return telemetry
    except Exception:
        return Telemetry()


def workflow(name):
    def decorate(fn):
        @wraps(fn)
        async def wrapped(self, identifier, *args, **kwargs):
            with self.telemetry.span(name, "WORKFLOW", identifier) as span:
                span.payload("input", {"incident_id": identifier})
                if name == "decision":
                    approve = args[0] if args else kwargs.get("approve")
                    span.payload("input", {"incident_id": identifier, "decision": "approve" if approve else "reject"})
                result = await fn(self, identifier, *args, **kwargs)
                span.payload("output", {"status": result["status"]})
                if result["status"] in ("failed", "escalated"):
                    span.error("incident_" + result["status"])
                if span.trace_id:
                    try:
                        result.setdefault("telemetry", {"session_id": identifier, "trace_ids": []})["trace_ids"].append(span.trace_id)
                        self.store.save(result)
                    except Exception:
                        pass  # Trace bookkeeping cannot fail a completed response.
                return result
        return wrapped
    return decorate


def provider_metadata(model, response=None, status=None):
    """Record only a configured model label and numeric provider usage, no bodies."""
    try:
        current = _CURRENT.get()
        if not current:
            return
        span = current[0]
        # Model labels are configuration, but still reject credential-shaped values.
        secrets = [v for k, v in os.environ.items() if any(s in k.upper() for s in ("KEY", "TOKEN", "PASSWORD", "SECRET")) and v]
        if isinstance(model, str) and re.fullmatch(r"[a-zA-Z0-9_./:-]{1,100}", model) and not any(s in model for s in secrets):
            span.attribute("neatlogs.llm.model_name", model)
            span.attribute("gen_ai.request.model", model)
        span.attribute("neatlogs.llm.provider", "openai_compatible")
        if type(status) is int and 100 <= status <= 599:
            span.attribute("http.response.status_code", status)
        if isinstance(response, dict):
            usage = response.get("usage")
            if isinstance(usage, dict):
                for source, target in (("prompt_tokens", "prompt"), ("completion_tokens", "completion"), ("total_tokens", "total")):
                    value = usage.get(source)
                    if type(value) is int and value >= 0:
                        span.attribute("neatlogs.llm.token_count." + target, value)
                        if target in ("prompt", "completion"):
                            span.attribute("gen_ai.usage." + ("input_tokens" if target == "prompt" else "output_tokens"), value)
    except Exception:
        pass


@contextmanager
def operation(name, kind):
    current = _CURRENT.get()
    telemetry = current[2] if current else Telemetry()
    with telemetry.span(name, kind) as span:
        yield span


class DeliveryStatus:
    """Expose transport success without retaining backend errors or response bodies."""
    def __init__(self, delegate):
        self.delegate = delegate
        self.accepted_spans = 0
        self.failed_spans = 0

    def export(self, spans):
        from opentelemetry.sdk.trace.export import SpanExportResult
        try:
            result = self.delegate.export(spans)
        except Exception:
            result = SpanExportResult.FAILURE
        if result == SpanExportResult.SUCCESS:
            self.accepted_spans += len(spans)
        else:
            self.failed_spans += len(spans)
        return result

    def shutdown(self):
        try:
            self.delegate.shutdown()
        except Exception:
            pass
