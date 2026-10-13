# SentinelOps AI — neatHack submission

## Project description

An AI incident response engineer that investigates a slow PostgreSQL checkout
lookup, connects metrics, query plans and schema evidence, proposes a fixed index
repair, waits for human approval, and verifies measured recovery against identical
query results.

## Implemented

Real 100,000-row synthetic PostgreSQL workload; bounded read-only investigation;
persisted incident timeline; compatible tool-calling model adapter; approval gate;
fixed allowlisted SQL; real before/after timings and result fingerprints; rollback
on failed verification; responsive Next.js website and labeled sample workspace;
Supabase email/password implementation; optional Neatlogs telemetry.

## Demo disclosure

The recorded dashboard sample is illustrative and does not execute SQL. Real
approval is performed through the local FastAPI CLI. Database recovery and approval
are verified by integration tests with a deterministic model stand-in. Live model
configuration is missing, so live AI reasoning is not yet verified. Google OAuth is implemented and provider handoff is verified; real account completion remains unverified. Live Supabase account flows require separate validation.
The backend is local-only and has no multi-tenant authorization.
Do not copy old timing claims as new measurements.

## X post draft

Built SentinelOps AI for neatHack: investigate slow PostgreSQL queries, review
evidence, require human approval, then verify recovery. Demo shows the sample UI;
real database recovery passes integration tests. Live AI setup is pending.
#neatHack

Attach the demo video and add an approved public repository link if available.
Quote the official launch post at https://x.com/bettersayAJ/status/2109639214723932495 and keep the quote public. Include @neatlogs @EntireHQ @arithecfo and attach the demo video. Describe each tool truthfully; required tags do not imply verified integration.
No post, repository push or deployment has been performed.

## Package

Run python scripts/package_submission.py to create
submission/SentinelOps-AI-source.zip. It excludes private configuration, local
incident state, hooks, dependencies, generated output, and Git history.

## Official submission checklist (checked 13 October 2026)

Source: https://neatlogs.com/submission?utm_source=luma

- Listed window: 12 October 7:00 PM to 13 October 7:00 AM IST (UTC+05:30). The closing time equals 13 October 01:30 UTC / 02:30 BST. It had passed when checked. The page says Discord has the final say on deadlines: https://neatlogs.com/discord.
- Both the public quote-post and the form are required. Quote the official launch post, attach the demo video, and include all three required tags.
- A public GitHub repository is required. Verify that the published revision contains the current frontend and docs; the local source zip is not a public repository.
- Use the check-in email to verify team access. The team leader submits for everyone; teammates can view shared status.
- Remaining project/team fields are behind email verification and were not inspected. No verification email was sent, no post was published, and no submission was made.
- Demo should show the problem, why it matters, and how the solution works. Clearly distinguish the sample dashboard, tested database execution, and unverified live AI/account flows.
