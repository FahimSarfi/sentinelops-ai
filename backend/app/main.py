from fastapi import FastAPI

app = FastAPI(
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
