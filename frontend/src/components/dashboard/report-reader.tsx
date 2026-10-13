"use client";
import { useState } from "react";
import { ArrowRight, Plug } from "lucide-react";
import { isIncidentReport, type IncidentReport } from "@/lib/incidents";
import type { Session } from "@/lib/auth/types";
import { Button } from "@/components/ui/button";
export function ReportReader({
  onLoad,
  session,
}: {
  onLoad: (r: IncidentReport) => void;
  session: Session;
}) {
  const [id, setId] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  return (
    <section className="panel report-reader">
      <div className="panel-heading">
        <Plug size={20} />
        <h2>Read a local incident report</h2>
        <span className="status-badge">Read only</span>
      </div>
      <p>
        Enter the incident UUID from your local FastAPI workflow. Loading a
        report never starts an investigation or executes a repair. Reports are
        snapshots; load the ID again after backend changes. A page refresh
        restores the configured workspace source.
      </p>
      {session.mode === "demo" ? (
        <p className="form-notice">
          Sign in with a Supabase account to access local reports. Sample
          sessions use illustrative data.
        </p>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setPending(true);
            setError("");
            try {
              const res = await fetch(
                `/api/incidents/${encodeURIComponent(id.trim())}`,
              );
              const data: unknown = await res.json();
              if (!res.ok) {
                throw new Error(
                  typeof data === "object" && data && "error" in data
                    ? String(data.error)
                    : "Unable to load report.",
                );
              }
              if (!isIncidentReport(data))
                throw new Error("Unexpected report format.");
              onLoad(data);
            } catch (e) {
              setError(
                e instanceof Error ? e.message : "Could not load report.",
              );
            } finally {
              setPending(false);
            }
          }}
        >
          <label htmlFor="incident-id">
            Incident ID
            <input
              id="incident-id"
              value={id}
              onChange={(e) => setId(e.target.value)}
              required
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              maxLength={36}
            />
          </label>
          <Button disabled={pending}>
            {pending ? "Reading report…" : "Load report"}
            <ArrowRight size={15} />
          </Button>
        </form>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <a href="/docs#local-demo" className="text-link">
        Local connection setup →
      </a>
    </section>
  );
}
