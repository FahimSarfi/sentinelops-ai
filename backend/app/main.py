# Local-only demo: run one worker and bind to 127.0.0.1.
from functools import lru_cache
from contextlib import asynccontextmanager
import asyncio
import os
from pathlib import Path
from typing import Literal

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, ConfigDict

from backend.app.agent import Agent, Conflict
from backend.app.agent_state import Store
from backend.app.agent_tools import DatabaseTools
from backend.app.provider import CompatibleModel
from backend.app.telemetry import configured


@asynccontextmanager
async def lifespan(app):
    try:
        yield
    finally:
        if hasattr(get_agent, "cache_info") and get_agent.cache_info().currsize:
            telemetry = get_agent().telemetry
            await asyncio.to_thread(telemetry.flush)
            await asyncio.to_thread(telemetry.shutdown)


app = FastAPI(
    lifespan=lifespan,
    title="SentinelOps AI",
    description="Autonomous AI Incident Response Engineer",
    version="0.1.0",
)


@app.get("/")
def home():
    return {
        "project": "SentinelOps AI",
        "status": "online",
        "message": "Incident response system initialized",
    }


@app.get("/health")
def health():
    return {"status": "healthy"}


@lru_cache
def get_agent():
    load_dotenv(Path(__file__).resolve().parents[2] / ".env", override=False)
    return Agent(Store(os.getenv("SENTINELOPS_STATE_PATH", ".sentinelops/incidents.sqlite3")),
                 CompatibleModel(), DatabaseTools(), telemetry=configured())


class Decision(BaseModel):
    model_config = ConfigDict(extra="forbid")
    decision: Literal["approve", "reject"]


@app.post("/incidents", status_code=201)
async def create_incident():
    return get_agent().create()


@app.get("/incidents/{incident_id}")
@app.get("/incidents/{incident_id}/report")
async def inspect_incident(incident_id: str):
    try:
        return get_agent().store.get(incident_id)
    except KeyError:
        raise HTTPException(404, "Incident not found") from None


@app.post("/incidents/{incident_id}/investigate")
async def investigate_incident(incident_id: str):
    try:
        return await get_agent().investigate(incident_id)
    except KeyError:
        raise HTTPException(404, "Incident not found") from None
    except Conflict as exc:
        raise HTTPException(409, str(exc)) from None


@app.post("/incidents/{incident_id}/decision")
async def decide_incident(incident_id: str, decision: Decision):
    try:
        return await get_agent().decide(incident_id, decision.decision == "approve")
    except KeyError:
        raise HTTPException(404, "Incident not found") from None
    except Conflict as exc:
        raise HTTPException(409, str(exc)) from None
