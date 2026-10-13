# Demo runbook

Use WSL Ubuntu. Do not overwrite existing .env files or show secrets in a recording.

    cd ~/sentinelops-ai
    export PATH="$HOME/.nvm/versions/node/v24.21.0/bin:$PATH"
    source .venv/bin/activate
    docker compose up -d --wait postgres

Terminal 1:

    python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --workers 1

Terminal 2:

    cd ~/sentinelops-ai/frontend
    export PATH="$HOME/.nvm/versions/node/v24.21.0/bin:$PATH"
    npm run dev

Open http://127.0.0.1:3000 and enter the sample workspace. Clearly identify sample
data in your recording. Sample decisions never execute database changes.

## Real AI demonstration

Root .env currently lacks SENTINELOPS_MODEL and SENTINELOPS_MODEL_API_KEY.
Configure them privately for a tool-capable model and restart the backend.
Missing configuration escalates; there is no fake successful AI fallback.

Prepare only the isolated local synthetic fixture:

    python -m simulator reset
    python -m simulator seed
    python scripts/agent_demo.py

Reset removes only the exact allowlisted demo index and preserves rows.
Do not run tests and demo concurrently. Review evidence before typing APPROVE.
Any other input rejects. Show the report URL and actual measured recovery.
If the fixture is already repaired, escalation is expected.

Supabase accounts can load a known incident UUID under Connections when the
server-only SENTINELOPS_API_URL is configured. Sample accounts cannot read reports.
Real approval uses the CLI. Keep FastAPI loopback-only with one worker.

## Recording script

0:00–0:20: Slow checkout queries waste engineering time. SentinelOps connects
metrics, schema, and query-plan evidence before proposing a repair.
0:20–0:50: Tour the dashboard and incident evidence. Say this is illustrative.
0:50–1:20: Show the approval boundary and recovery/report screens. Sample approval
does not execute SQL.
For a live model recording, replace the sample decision with agent_demo.py, review
the evidence, type APPROVE, and show actual recovery and identical result checks.
Finish: Only one fixed repair is allowed; failed verification rolls it back.

Without model configuration, describe passing database integration tests as tests
with a deterministic model stand-in, never as a successful live AI demonstration.

## Authentication scope

Google OAuth is now implemented on sign-in and sign-up. Provider handoff is verified; completing a real account login still needs verification. Existing Supabase email/password and
sample access are implemented. Live email delivery, workspace RLS and live account
flows remain unverified. See frontend/README.md for setup.

## Checks and source package

    SENTINELOPS_TEST_POSTGRES=1 python -m pytest -q -rs
    cd frontend
    npm run typecheck
    npm run build
    npm run test:e2e
    cd ..
    python scripts/package_submission.py

Browser tests use a separate .next-e2e build with Supabase disabled at build time,
preserving normal .next output and .env.local. Use Linux npm in WSL.
