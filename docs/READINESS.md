# Submission readiness — 13 October 2026

## Verified locally in WSL

- 124 Python tests passed with PostgreSQL integration enabled; no skips.
- Real database tests exercise approval-gated recovery, measured improvement,
  identical results, actual planner index use and rollback on verification failure.
- Integration tests roll back fixture changes and preserve prior database state.
- Frontend production build, TypeScript and formatting checks passed.
- Browser suite: 23 passed, four intentional duplicate viewport checks skipped.
- UI checks include accessibility, mobile layouts, onboarding, sample decisions,
  forged-session rejection and read-only report denial.
- Captioned sample walkthrough saved under submission/SentinelOps-AI-demo.mp4 (also available as WebM).
- Fresh simulator measurements saved as submission/database-verification.json,
  generated inside a rollback-only transaction.

## Blockers and limitations

Root .env has database configuration but no model name or API key.
Live AI reasoning was not verified. Integration tests use a deterministic model
stand-in; do not describe them as a live model demo. No fake fallback was added.
Supabase email/password is implemented; live signup, email, RLS and successful
account report read remain unverified. Google OAuth is deferred.
The dashboard sample is clearly labeled and never executes real repairs.
No repository push, public deployment or X post was performed.

## Changes

Fixed browser-test isolation: Supabase settings must be disabled at build time.
Browser tests now build into .next-e2e, preserving the normal .next build and
.env.local. Formatted tsconfig after Next updated generated type paths.
Added demo runbook, submission description, readiness note, recording script and
source packaging script. Existing untracked frontend/docs/evidence were preserved.

## Publish checklist

1. Decide whether to configure a live model before recording a real CLI run.
2. Watch the sample video and check captions are appropriate for your submission.
3. Confirm official X hashtag, required links and deadline.
4. Review repository changes and exclude .env, state, .codex and .entire artifacts
   before staging. Source archive uses a separate source-only allowlist.
5. Add a public repository/demo link to the post only after approving a push/upload.

## Google login update — 13 October 2026

Continue with Google is now implemented on sign-in and sign-up. The connected
Supabase project reports Google enabled. In the running local app, OAuth selects
Google, sends a PKCE challenge, stores the verifier cookie and uses the correct
callback URL. A live authorize request successfully redirects to accounts.google.com.
Cancellation is handled with a clear message and preserves the canonical hostname.
The user still needs to complete a Google account login to verify session creation
and workspace onboarding. The previously recorded sample video predates this update.

Google update validation: TypeScript and formatting pass; production test build
passes; 26 browser tests pass, with four intentional duplicate viewport skips.

## Account and workspace visual refresh — 13 October 2026

Sign-in and sign-up now follow the supplied split-card reference: photo panel,
glass introduction, compact provider/email form, and account mode links.
Onboarding uses a restrained setup checklist; dashboards use a compact navigation
rail, neutral workspace sidebar, smaller typography and consistent panels.
The earlier Intercom screenshots are unavailable in the local mirror, so these
screens follow that general visual direction rather than an exact reference copy.
Google OAuth, form actions, onboarding persistence, report access and approval
boundaries remain intact. A narrow-screen evidence overflow was corrected.
Production test build and TypeScript pass; 29 browser tests pass with four
intentional duplicate viewport skips, including 320px and 390px evidence checks.

Account photo pixelation applied at user request. The original image is preserved;
both sign-in and sign-up use auth-forest-pixelated.png. The image renders correctly
in the running app, with the Google control and overlay text kept crisp.

## Account sizing polish — 13 October 2026

Removed the top sign-in/sign-up switch; the existing link below each form remains.
Google now uses the four-color mark. Account, onboarding and dashboard action
buttons share a 40px base height with consistent padding and typography.
Both account screens fit 1366x768, 1280x720, 390x844 and 375x667 without document
scrolling. Compact phone layouts reduce decorative content rather than clipping
the form. Very small windows or expanded error messages may need natural scroll.

## Google failure investigation and full-page layout

Account screens now fill the viewport without a card border, rounded outer frame,
or drop shadows. The OAuth callback preserves localhost/127.0.0.1 when developing
locally, avoiding a PKCE cookie hostname mismatch. Provider failures, cancellation
and expired sessions have separate sanitized messages. Signups and Google are
enabled in the connected Supabase project. Google account selection is reachable,
but the user reports a provider failure after selecting an account; live login
remains unresolved pending Supabase Auth log details. The public workspace endpoint
returns PGRST205 (missing table); apply frontend/supabase/schema.sql in the project
SQL editor before completing onboarding. Authenticated session reads now tolerate
that missing table and direct new accounts to setup rather than crashing.
