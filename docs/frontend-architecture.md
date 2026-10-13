# Frontend architecture and phased implementation

## Repository findings

Inspected `backend/app/main.py`, `models.py`, the root README, dependency layout,
and existing tests before adding the frontend. There was no existing JavaScript
application. The working backend, simulator, telemetry, evidence, and Entire
configuration have not been changed.

Actual API routes are `GET /`, `GET /health`, `POST /incidents`,
`POST /incidents/{id}/investigate`, `GET /incidents/{id}`,
`POST /incidents/{id}/decision`, and `GET /incidents/{id}/report`.
Decision accepts only `approve` or `reject` and forbids extra fields.
Inspect and report currently return the same persisted incident record.
There is no incident-list, workspace, authentication, streaming, or reset route.
The current demo API must remain loopback-only with one worker.

## Architecture

- `frontend/`: independent Next.js App Router application; strict TypeScript.
- Server-rendered marketing and documentation pages; small client boundaries for
  Radix navigation/dialogs/tabs and reduced-motion-aware Motion enhancement.
- Tailwind v4, CSS design tokens, Lucide icons, shadcn-compatible component
  aliases/configuration, CVA button variants, and Radix accessible primitives.
- Original wordmark and CSS illustrations: no proprietary reference artwork,
  remote image dependencies, external fonts, or analytics.
- Phase 1 has **no** backend proxy, API client, authentication endpoint, public
  credentials, database connection, form collection, or mutation capability.
- The preview is illustrative, never masquerading as real incident state.
  Recovery bars normalize the user-supplied 17.89× local synthetic benchmark;
  no invented before/after milliseconds or trace IDs are presented.

## Phase boundaries

1. **Marketing foundation (this change):** design system, responsive landing page,
   interactive preview, docs, availability notices, and browser test suite.
2. **Authentication/onboarding (requires approval):** evaluate a maintained provider,
   server sessions and account recovery, protected routes, resumable onboarding,
   persisted workspace membership, and authoritative backend authorization.
   Do not expose existing mutations through a browser proxy before authorization
   is enforced at the backend. Provider credentials will remain server-only.
3. **Command Center/API integration:** derive types from actual incident store
   contracts; validate requests, centralize errors, and poll persisted state.
   Add authorized incident listing only after deciding workspace ownership rules.
4. **Investigation/approval/verification:** show real evidence and actual event order;
   retain all existing allowlist and human-approval checks. Introduce Recharts and
   Zod when actual charts and API validation require them.
5. **Observability and polish:** surface real trace IDs; distinguish availability,
   export acceptance, and hosted finalization. Keep Entire in developer-only views.
6. **End-to-end demo preparation:** exercise authorized real-provider workflows,
   keyboard/mobile review, and an honest unavailable-service path. Any replay must
   be clearly labeled and explicitly selected.

## Design references

Neither the Stripe screenshot nor `Intercom web Oct 2025.zip` was available in the
repository or nearby user files searched. Design follows the written brief:
warm ivory marketing canvas, orange/pink/violet aurora, bold editorial hierarchy,
large whitespace, dark workspace preview, and restrained motion.

## Verification scope

Production build and strict type checking; Playwright checks across desktop,
tablet, and mobile for layout overflow, functional navigation, tab keyboard
behavior, modal focus restoration, truthful availability notices, no backend
mutations, and axe WCAG A/AA checks. Automated accessibility checks do not replace
manual assistive-technology testing. Existing Python tests are run separately;
real PostgreSQL tests are opt-in and not part of this frontend change.
