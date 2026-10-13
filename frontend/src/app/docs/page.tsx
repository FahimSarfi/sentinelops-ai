import type { Metadata } from "next";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { ButtonLink } from "@/components/ui/button";
export const metadata: Metadata = {
  title: "Local demo guide — SentinelOps AI",
};
const repository = "https://github.com/mohammadfahimhaque/sentinelops-ai";
export default function Docs() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="wrap docs">
        <span className="eyebrow">SENTINELOPS / DOCUMENTATION</span>
        <h1>
          A real workflow.
          <br />
          On your machine.
        </h1>
        <p className="intro">
          The frontend offers accounts, workspace setup, a labeled sample
          experience, and a read-only local report viewer. The existing Python
          backend runs the actual investigation, approval, and verification
          workflow.
        </p>
        <nav aria-label="Documentation sections">
          <a href="#local-demo">Local demo</a>
          <a href="#benchmark">Benchmark</a>
          <a href="#status">Current status</a>
          <a href="#development">Development</a>
        </nav>
        <section id="local-demo">
          <h2>Run the existing backend demo</h2>
          <p className="status-note">
            Local only: the existing API does not authenticate users. Bind it to
            127.0.0.1 with one worker. Use only the isolated synthetic
            PostgreSQL fixture.
          </p>
          <p>
            From the repository root, use the existing Python environment. The
            root README is the authoritative setup guide, including dependency
            installation and environment configuration.
          </p>
          <pre tabIndex={0} aria-label="Local demo terminal commands">
            <code>{`source .venv/bin/activate
python -m pip install -r backend/requirements.txt
python -m pip install -r simulator/requirements.txt
# On first setup only; do not overwrite an existing .env:
cp -n .env.example .env
docker compose up -d --wait postgres
python -m simulator seed`}</code>
          </pre>
          <p>
            Configure <code>SENTINELOPS_MODEL</code> and{" "}
            <code>SENTINELOPS_MODEL_API_KEY</code> in the ignored root{" "}
            <code>.env</code>. The model must support the tool-calling contract
            documented in the README. Never put backend credentials in frontend
            environment variables.
          </p>
          <pre tabIndex={0} aria-label="Local demo terminal commands">
            <code>{`python -m uvicorn backend.app.main:app --host 127.0.0.1 --workers 1

# In a second terminal, from the repository root:
source .venv/bin/activate
python scripts/agent_demo.py`}</code>
          </pre>
          <p>
            The script creates an incident, runs an investigation, prints the
            supporting evidence, and asks for literal APPROVE before
            remediation. Review the proposal before approving. Missing model
            configuration or unavailable services are not replaced with mock
            results.
          </p>
          <p>
            If a previous demo already repaired the fixture, follow the README’s
            explicit reset instructions. Reset is a local operator action and is
            not exposed by this website.
          </p>
          <ButtonLink
            href={`${repository}#milestone-5-autonomous-investigation-with-human-approval`}
            variant="secondary"
          >
            Full backend setup guide <ArrowUpRight size={16} />
          </ButtonLink>
        </section>
        <section id="frontend-setup">
          <h2>Configure accounts and workspace storage</h2>
          <p>
            Copy frontend/.env.example to frontend/.env.local. Configure
            NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, and
            NEXT_PUBLIC_SITE_URL. Apply frontend/supabase/schema.sql in your
            Supabase SQL editor. Use a public publishable key; never a service
            role key.
          </p>
          <p>
            Enable email/password sign-in in Supabase. Allow your site’s
            /auth/callback URL, including ?next=/reset-password for recovery.
            Keep the default ConfirmationURL email template so Supabase verifies
            the email and returns the PKCE code to the application.
          </p>
          <p>
            Workspaces are private to their owner through row-level security.
            Team size is a preference, not an invitation system. Sample sessions
            are separate from verified accounts and enabled in local
            development. Set DEMO_ACCESS_ENABLED=true to opt in on a hosted demo
            and configure a stable AUTH_SESSION_SECRET.
          </p>
          <h2>Read a local incident report</h2>
          <p>
            Set the server-only SENTINELOPS_API_URL to http://127.0.0.1:8000.
            Sign in, complete onboarding, then open Connections and enter an
            incident UUID from the backend. Only reads are exposed. Use the
            existing local script for investigation and explicit repair
            decisions. The backend has no multi-tenant authorization, so this
            connection is intended for trusted local demo use.
          </p>
        </section>
        <section id="benchmark">
          <h2>What the benchmark means</h2>
          <p>
            The reported <strong>17.89× P95 improvement</strong> comes from a
            local synthetic PostgreSQL demonstration. It does not represent
            customer production performance. The landing page’s bars normalize
            that reported ratio to a baseline of 1; they do not show current
            measured milliseconds.
          </p>
          <p>
            The simulator uses deterministic synthetic orders and compares
            warm-cache lookups before and after the allowlisted email index.
            Host load, Docker overhead, and caching affect timings. Actual
            verification requires identical result hashes and counts, a
            sequential scan before repair, index use after repair, and
            improvements in both P50 and P95.
          </p>
          <p>
            Reproduction steps and evidence format are described in the{" "}
            <a href={`${repository}#reproduce-the-incident-and-recovery`}>
              repository benchmark guide
            </a>
            . No benchmark or repair runs when you visit this website.
          </p>
        </section>
        <section id="status">
          <h2>What is implemented</h2>
          <ul>
            <li>
              Frontend: responsive marketing, Supabase accounts, password
              recovery, protected onboarding and dashboard routes, workspace
              preferences, and illustrative incident interactions.
            </li>
            <li>
              Existing backend: synthetic incident creation, LLM investigation,
              explicit decisions, persisted reports, allowlisted repairs, and
              recovery verification.
            </li>
            <li>
              Existing observability: OpenTelemetry instrumentation for
              neatlogs. Export acceptance and trace IDs alone do not prove
              hosted finalization.
            </li>
          </ul>
          <p>
            <strong>Not implemented in this frontend:</strong> incident
            execution, approval submission, multi-user invitations, live
            recovery charts, and hosted trace retrieval. No commercial
            subscriptions or production SLAs are offered.
          </p>
          <p>
            The backend’s existing incident API has create, investigate,
            inspect, decision, and report routes. It does not currently provide
            workspace authorization, a list endpoint, or a public reset
            endpoint. The report connection is restricted to loopback and
            verified accounts. It is intended for a trusted local demo, not a
            multi-tenant deployment.
          </p>
        </section>
        <section id="development">
          <h2>Development transparency</h2>
          <p>
            Entire configuration and local checkpoints are preserved in the
            repository. This website does not publish checkpoint IDs or treat
            development history as operational telemetry.
          </p>
          <p>
            Inspect the project source and its existing verification evidence
            separately from the illustrative product preview.
          </p>
          <ButtonLink href={repository} variant="secondary">
            Explore the repository <ArrowUpRight size={16} />
          </ButtonLink>
        </section>
        <section>
          <ButtonLink href="/" variant="ghost">
            <ArrowLeft size={16} /> Back to SentinelOps
          </ButtonLink>
        </section>
      </main>
    </>
  );
}
