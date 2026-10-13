# SentinelOps AI frontend

Next.js App Router application with an original marketing site, Supabase accounts,
four-step onboarding, and an authenticated incident workspace. Backend, simulator,
telemetry, security controls, and Entire setup are preserved.

## Run locally

Use Node 20.9 or newer:

```bash
cd frontend
npm ci
cp -n .env.example .env.local
npm run dev
```

Open http://127.0.0.1:3000. Marketing works without external services. Sample access
at `/demo` is enabled in development. `/docs` explains the local backend workflow.

## Supabase setup

1. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in
   `.env.local`. Only use the public publishable key, never a service role key.
2. Set `NEXT_PUBLIC_SITE_URL` to your canonical application origin.
3. Apply [supabase/schema.sql](supabase/schema.sql) in the Supabase SQL editor.
4. Enable email/password authentication and configure the site URL. Allow
   `http://127.0.0.1:3000/auth/callback` (or your canonical origin), including
   `?next=/reset-password`, in Auth redirect URLs. Use the same hostname in your
   browser and `NEXT_PUBLIC_SITE_URL` so PKCE verifier cookies are available.
5. Keep the default confirmation/recovery email template using `{{ .ConfirmationURL }}`.
   Do not replace it with a bare redirect URL. The application exchanges the PKCE code server-side and then opens onboarding or
   password recovery.

Account access includes sign-up, confirmation, sign-in, sign-out, forgot password,
and password reset. Server-side `getUser()` verifies identity; the Next proxy
refreshes cookies. Protected pages and API reads verify identity independently.
Workspaces persist in Supabase with owner-only RLS. This prototype has one private
workspace per account. Team size and role are preferences; invitations, organization
membership, and production infrastructure authorization are not implemented.

## Sample access

`/demo` creates a separate, signed, HTTP-only, 24-hour sample session. It does not
verify identity or create a Supabase account. Hosted deployments must explicitly
set `DEMO_ACCESS_ENABLED=true`. Set `AUTH_SESSION_SECRET` to a random value of at
least 32 characters for stable sessions across restarts/workers. Production cookies
require HTTPS. Sample preferences disappear on sign-out. No demo decision executes
a repair, and sample accounts cannot read the local backend.

## Backend boundary

Set server-only `SENTINELOPS_API_URL=http://127.0.0.1:8000` to read reports. Verified
Supabase users can enter a known incident UUID under Connections. The server
validates the report shape, imposes an eight-second timeout, disallows redirects,
and only contacts an HTTP loopback origin. Reports stay in memory while navigating
and can be exported as labeled JSON; reload resets the view to the selected source.

The API has no list endpoint or workspace authorization. This read-only bridge is
for a trusted local demo, not public multi-tenant hosting. Run investigations and
submit human-approved decisions through the existing backend CLI. No frontend
mutation endpoint proxies incident creation, investigation, or repair execution.

## Verification

```bash
npm run typecheck
npm run build
npm run test:e2e
npm run format:check
```

Playwright starts a production server on port 3100 with sample access enabled and
Supabase disabled. It checks public routes, viewport overflow, keyboard workflow,
WCAG A/AA accessibility, protected routes, forged-session rejection, sample
onboarding, preferences, evidence, timeline, approval illustrations, JSON export,
empty/search states, and sign-out at desktop/tablet/mobile sizes. Real Supabase
email delivery and database RLS need a configured project for end-to-end validation.
Screenshots and traces are saved under ignored `test-results/`.

CSS ownership: `globals.css` contains tokens, primitives, and documentation;
`redesign.css` contains marketing; `preview.css` contains the illustrative preview;
`product.css` contains account, onboarding, and dashboard surfaces. System fonts and
CSS/native UI visuals need no remote assets. Reference screenshots are inspiration
only and are never shipped as SentinelOps assets.

## Google sign-in

Continue with Google is available on sign-in and sign-up. It uses the server-side
Supabase SSR client, stores the PKCE verifier in a cookie, and exchanges
the returned code at /auth/callback. Cancellation shows a recoverable sign-in
message. No Google client secret belongs in this frontend.

In Supabase Authentication > Providers > Google, enable the provider and configure
the Google OAuth client ID and secret. In Google Cloud, authorize the Supabase
callback shown in that provider panel (https://your-project.supabase.co/auth/v1/callback).
In Supabase URL Configuration, allow http://127.0.0.1:3000/auth/callback and set
NEXT_PUBLIC_SITE_URL to http://127.0.0.1:3000. Use that exact hostname when browsing.
For deployment, use your canonical HTTPS origin in both settings.
Official guide: https://supabase.com/docs/guides/auth/social-login/auth-google

Visual refresh: workspace-refresh.css scopes the account split-card, onboarding
checklist, and compact dashboard appearance. The forest image is generated and
stored in public/images. No fake third-party sign-in controls or testimonials
are included. The Intercom screenshots were unavailable during this pass.
