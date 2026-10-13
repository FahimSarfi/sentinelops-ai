# SentinelOps AI — user and evaluator manual

## What the project does

SentinelOps investigates a slow PostgreSQL checkout lookup. It collects metrics,
query plans and schema evidence, proposes one allowlisted index repair, waits for
a human decision, and checks correctness and measured performance after approval.

The web dashboard has two sources: a clearly labeled illustrative sample and a
read-only snapshot of an actual local backend incident. Clicking sample approval
does not execute SQL. Real investigation and repair run through the local CLI.

## Start the application

Open Ubuntu/WSL. If the frontend is already running, just open
http://localhost:3000. Keep the same hostname throughout sign-in.

```bash
cd ~/sentinelops-ai/frontend
npm run dev
```

Leave that terminal open. If WSL picks Windows npm, use the installed Linux Node:

```bash
export PATH="$HOME/.nvm/versions/node/v24.21.0/bin:$PATH"
npm run dev
```

For a real local investigation, open a separate terminal:

```bash
cd ~/sentinelops-ai
source .venv/bin/activate
docker compose up -d --wait postgres
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --workers 1
```

Use existing environment files. Do not overwrite them or display their contents
in screenshots or recordings. Starting these services does not reset the fixture.

## Accounts and onboarding

Choose Continue with Google or email/password on the account screen. A new
account enters onboarding; an account with a saved workspace opens the dashboard.
Google requires matching OAuth Client ID and Secret in Supabase. Email signup and
password recovery depend on the configured provider and email delivery.

For a quick tour without an account, choose Explore a sample workspace, accept
the sample notice, and continue. This session cannot load real backend reports.

Onboarding has four steps:

1. Name your workspace (2–60 characters).
2. Choose demo data for a ready-to-explore incident, or connect telemetry later
   for an empty workspace.
3. Choose your role, team size and goal. Team size is a preference, not an invitation.
4. Review the details and open the workspace. Back preserves your current choices.

Real accounts store workspace preferences in Supabase with owner-only policies.
If saving fails, check that `frontend/supabase/schema.sql` has been applied and
the authenticated role has the required policies and permissions. Do not repeatedly
rerun policy creation if Supabase says a policy already exists.

## Use each dashboard feature

| Feature | How to use it | What to expect |
|---|---|---|
| Overview | Select Overview in the single sidebar. | Counts for the currently loaded incident, source notice, analytics and next action. Counts are not fleet-wide statistics. |
| Analytics | Change Chart metric between timeline events and evidence observations. | Cumulative observations from recorded timestamps in UTC. No generated historical performance data. |
| Citation coverage | Inspect the ring. | Percentage of collected observations referenced by diagnosis. This is not accuracy or model confidence. |
| Customize view | Open Customize view, toggle citation coverage, select Done. | Changes the current view. This preference is not saved across reloads. |
| Incident search | Enter a service, symptom or status in Search incidents. | Matching row or a clear empty result. Clear the field to restore the row. |
| Incident drawer | Click an incident row. | Evidence, timeline, approval and recovery in a side drawer. Close with X or Escape; keyboard focus returns to the opener. |
| Incidents | Open Incidents, then the section buttons. | Full investigation detail with evidence IDs and tool observations. Expand/collapse evidence entries. |
| Timeline | Select Timeline in incident details. | Recorded incident events and UTC timestamps. |
| Approvals | Open Approvals and review the proposal and cited evidence. | Sample controls preview approve/reject only. Real report decisions use the CLI. |
| Recovery | Select Recovery. | Actual verification results when the report contains them; otherwise an explicit no-recovery state. |
| Reports | Open Reports and Download JSON report. | A JSON snapshot labeled with its sample or local source. |
| Connections | Open Connections or Connect a report. | A read-only incident-ID loader for signed-in accounts, plus connection status. |
| Settings | Edit workspace preferences and Save preferences. | Success/error feedback. Saved preferences should survive a reload. |
| Mobile menu | Select Open workspace navigation. | One expandable menu containing all routes and sign-out. Selecting a route closes it. |
| Sign out | Use the sign-out icon at the bottom of navigation. | Return to sign-in; protected routes require a session again. |

Sample decisions persist across dashboard routes and drawers until reset or a
full page reload; they do not change the backend incident status.
Closing a drawer preserves the loaded report within this browser session's
dashboard navigation. A full reload restores the workspace's configured source;
local reports must be loaded again. A report is a snapshot, not live telemetry.

## Load a real report

Sign in with a real Supabase account. The frontend server needs
`SENTINELOPS_API_URL` pointing to the local backend, typically
`http://127.0.0.1:8000`; restart it after configuration changes.

Run the CLI workflow below and copy its incident UUID. Open Connections, enter
that UUID and select Load report. Inspect source, status, evidence and timeline.
After the CLI decision finishes, select Refresh report to see updated recovery.
The web report reader cannot start investigations or approve repairs.

## Run the real human-approved workflow

Privately configure the root environment with a supported tool-capable model,
`SENTINELOPS_MODEL` and `SENTINELOPS_MODEL_API_KEY`; optional provider endpoint is
`SENTINELOPS_MODEL_BASE_URL`. Restart the backend after changes. Without model
configuration the app escalates rather than inventing a successful investigation.

For the isolated local synthetic fixture only, prepare the missing-index scenario
in a new terminal. Do not run database tests concurrently with this demonstration.

```bash
cd ~/sentinelops-ai
source .venv/bin/activate
python -m simulator reset
python -m simulator seed
python scripts/agent_demo.py
```

`reset` removes only the validated demo repair index; it preserves fixture rows.
Use these commands only against this project's local simulator database.

Read the collected evidence and proposed operation before typing `APPROVE`.
Other input rejects the repair. The supported repair is
`create_checkout_email_index`, mapped to fixed SQL. The model cannot supply
arbitrary repair SQL. Successful recovery requires measured improvement, index
use and identical query results. Failed verification rolls back the repair.
An already repaired or unexpected fixture should escalate, not claim a new fix.

## Judge the project: practical acceptance tour

Record Pass, Fail or Not tested for each item. Keep sample and live results separate.

| Check | Pass condition |
|---|---|
| Account access | Google/email login returns to onboarding or the existing workspace; no raw tokens appear in UI. |
| Onboarding | Back preserves choices; finish saves and opens the expected sample/empty workspace. |
| Navigation | Every menu destination works on desktop and phone, without duplicated menus or overlap. |
| Evidence clarity | You can explain the symptom, query plan and missing index using the cited observations. |
| Analytics honesty | Counts match the loaded report; empty data remains empty; citation coverage is labeled correctly. |
| Dialog usability | Keyboard opens controls; Tab stays in the dialog; Escape closes it and restores focus. |
| Approval boundary | Sample decisions cannot mutate infrastructure; real repair requires explicit CLI approval. |
| Rejection | A rejected real proposal does not execute its repair. |
| Recovery proof | Real report shows matching results, index use and improved measured latency; no proof means no success claim. |
| Report export | Downloaded JSON contains the incident ID, source, evidence, timeline and recovery snapshot. |
| Preferences | Save, reload and confirm the new workspace name and options. |
| Session protection | Sign out, revisit dashboard, and confirm a sign-in redirect. |
| Errors | Invalid incident ID/unavailable backend produces readable feedback and allows retry. |

For an initial five-minute review: enter sample → complete onboarding → overview
analytics → open incident drawer → inspect evidence and timeline → preview a
decision → inspect empty recovery → export report → save preferences → sign out.
Then perform the separate live CLI demonstration when model configuration is ready.

## Current limits

- One private workspace per account; no team invitations or shared ownership.
- One incident snapshot in the dashboard; no fleet ingestion, background monitoring
  or persisted report selection.
- OpenTelemetry/neatlogs backend configuration exists; hosted trace retrieval is
  not wired into this frontend.
- Real repair approval is CLI-only. Live model behavior requires configuration and
  a completed real run; deterministic integration tests are not a live AI demo.
- Automated browser tests isolate Supabase and use sample sessions. They do not
  establish live Google login, email delivery or remote RLS correctness.
- No public deployment or submission posting is implied by local startup.

## Troubleshooting

| Symptom | Next action |
|---|---|
| Google says invalid client secret | Replace the secret in Supabase with the valid secret belonging to the matching Google Web OAuth client. Keep it out of frontend files. |
| Workspace cannot save | Check workspace schema, grants and owner policies in Supabase. |
| Frontend port already in use | Open the running app rather than launching another instance. |
| UI shows old code | Hard-refresh the browser with Ctrl+Shift+R. |
| Local report unavailable | Check backend startup, server-only API URL, account session and UUID. |
| Model escalates | Check model/provider configuration and evidence; inspect the reason before retrying. |
| No measured recovery | Do not present a repair as verified. Inspect the actual backend result. |
