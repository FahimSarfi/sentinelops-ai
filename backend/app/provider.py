"""Small OpenAI-compatible chat tool adapter; credentials stay in memory."""
import json
import os
from urllib.parse import urlparse

import httpx

from backend.app.telemetry import provider_metadata


class TransientError(Exception):
    pass


class CompatibleModel:
    def __init__(self):
        self.base_url = os.getenv("SENTINELOPS_MODEL_BASE_URL", "https://api.openai.com/v1").rstrip("/")
        self.model = os.getenv("SENTINELOPS_MODEL")
        self.key = os.getenv("SENTINELOPS_MODEL_API_KEY")

    async def next(self, messages, tools):
        provider_metadata(self.model)
        if not self.model or not self.key:
            raise ValueError("Model configuration missing")
        url = urlparse(self.base_url)
        if url.scheme != "https" and not (url.scheme == "http" and url.hostname in ("localhost", "127.0.0.1")):
            raise ValueError("Provider must use HTTPS or local HTTP")
        try:
            async with httpx.AsyncClient(timeout=20, follow_redirects=False) as client:
                response = await client.post(self.base_url + "/chat/completions",
                    headers={"Authorization": "Bearer " + self.key},
                    json={"model": self.model, "messages": messages, "tools": tools, "tool_choice": "required"})
            provider_metadata(self.model, status=response.status_code)
            if response.status_code in (408, 429, 500, 502, 503, 504):
                raise TransientError()
            response.raise_for_status()
            if len(response.content) > 65536:
                raise ValueError("Oversized provider response")
            body = response.json()
            provider_metadata(self.model, body)
            message = body["choices"][0]["message"]
            if message.get("refusal"):
                return {"name": "refuse", "arguments": {}}
            calls = message.get("tool_calls", [])
            if len(calls) != 1:
                raise ValueError("Exactly one tool call required")
            call = calls[0]["function"]
            return {"name": call["name"], "arguments": json.loads(call["arguments"])}
        except (httpx.TimeoutException, httpx.NetworkError) as exc:
            raise TransientError() from exc
