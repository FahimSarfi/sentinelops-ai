"use client";
import { useContext, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  CircleDot,
  Download,
  FileText,
  Fingerprint,
  Plug,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { Session } from "@/lib/auth/types";
import {
  isIncidentReport,
  sampleIncident,
  type IncidentReport,
} from "@/lib/incidents";
import { Button, ButtonLink } from "@/components/ui/button";
import { IncidentContext } from "./shell";
import { SettingsForm } from "./settings-form";
import { ReportReader } from "./report-reader";
import { IncidentDetail } from "./incident-detail";
import { ReportAnalytics } from "./report-analytics";
import { Overlay } from "./overlay";
import { Empty } from "./empty-state";
export type View =
  | "overview"
  | "investigations"
  | "approvals"
  | "reports"
  | "integrations"
  | "settings";
const names: Record<View, string> = {
  overview: "Your incident command center.",
  investigations: "Follow the incident.",
  approvals: "Every decision, with context.",
  reports: "The investigation, on record.",
  integrations: "Bring your signals together.",
  settings: "Make this workspace yours.",
};
function download(report: IncidentReport, sample: boolean) {
  const url = URL.createObjectURL(
    new Blob(
      [
        JSON.stringify(
          {
            source: sample ? "illustrative sample" : "local FastAPI report",
            ...report,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    ),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `sentinelops-${report.incident_id}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
export function WorkspaceView({
  session,
  view,
}: {
  session: Session;
  view: View;
}) {
  const { report, setReport } = useContext(IncidentContext);
  const sample = report?.incident_id === "sample-checkout";
  const [drawer, setDrawer] = useState<"incident" | "connect" | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState("");
  async function refreshReport() {
    if (!report || sample) return;
    setRefreshing(true);
    setRefreshError("");
    try {
      const response = await fetch(
        `/api/incidents/${encodeURIComponent(report.incident_id)}`,
      );
      const data: unknown = await response.json();
      if (!response.ok || !isIncidentReport(data))
        throw new Error(
          "Could not refresh the report. Check the backend and try again.",
        );
      setReport(data);
    } catch {
      setRefreshError(
        "Could not refresh the report. Check the backend and try again.",
      );
    } finally {
      setRefreshing(false);
    }
  }
  const [query, setQuery] = useState("");
  const match =
    report &&
    `${report.service_name} ${report.description} ${report.status}`
      .toLowerCase()
      .includes(query.toLowerCase());
  return (
    <>
      {drawer && (
        <Overlay
          title={drawer === "connect" ? "Connect a report" : "Incident details"}
          onClose={() => setDrawer(null)}
          drawer
        >
          {drawer === "connect" ? (
            <ReportReader
              session={session}
              onLoad={(next) => {
                setReport(next);
                setDrawer(null);
              }}
            />
          ) : (
            report && <IncidentDetail report={report} sample={sample} />
          )}
        </Overlay>
      )}
      <div className="dashboard-page-heading">
        <div>
          <span className="eyebrow">
            {view === "overview"
              ? `WELCOME, ${session.user.name.split(" ")[0].toUpperCase()}`
              : "YOUR ENGINEERING WORKSPACE"}
          </span>
          <h1>{names[view]}</h1>
          <p>
            {view === "overview"
              ? "A focused space for investigation, evidence, and the next right decision."
              : view === "settings"
                ? "Preferences that fit the way your team works."
                : "Evidence before action. Keep the full story in view."}
          </p>
        </div>
        {view !== "settings" && (
          <Button variant="secondary" onClick={() => setDrawer("connect")}>
            <Plug size={16} /> Connect a report
          </Button>
        )}
      </div>
      {refreshError && (
        <p role="alert" className="form-error">
          {refreshError}
        </p>
      )}
      {report && !sample && view !== "settings" && (
        <div className="report-refresh">
          <span>Incident {report.incident_id}</span>
          <Button
            variant="secondary"
            disabled={refreshing}
            onClick={refreshReport}
          >
            {refreshing ? "Refreshing…" : "Refresh report"}
          </Button>
        </div>
      )}
      {view !== "settings" && (
        <div className="workspace-notice">
          <span className="status-dot" />
          <strong>
            {sample
              ? "Sample workspace"
              : report
                ? "Local report loaded"
                : "No source connected"}
          </strong>
          <span>
            {sample
              ? "Illustrative data. No agent or repair is running."
              : report
                ? "Read-only snapshot from FastAPI. Reload for the latest state."
                : "Start with a sample incident or connect an existing local report."}
          </span>
        </div>
      )}
      {view === "settings" ? (
        <SettingsForm session={session} />
      ) : view === "integrations" ? (
        <>
          <ReportReader session={session} onLoad={setReport} />
          <div className="panel connection-status">
            <Activity size={22} />
            <div>
              <h2>OpenTelemetry → neatlogs</h2>
              <p>
                Configured in the existing backend. Hosted trace retrieval is
                not connected to this frontend.
              </p>
              <a className="text-link" href="/docs#status">
                View technical status →
              </a>
            </div>
          </div>
          {report && (
            <IncidentDetail
              key={report.incident_id}
              report={report}
              sample={sample}
            />
          )}
        </>
      ) : (
        <>
          {view === "overview" && (
            <>
              <div className="workspace-stats">
                {[
                  {
                    label: "Incidents in this view",
                    value: report ? "1" : "0",
                    icon: CircleDot,
                  },
                  {
                    label: "Awaiting a decision",
                    value: report?.status === "awaiting_approval" ? "1" : "0",
                    icon: ShieldCheck,
                  },
                  {
                    label: "Observed evidence",
                    value: String(Object.keys(report?.evidence ?? {}).length),
                    icon: Fingerprint,
                  },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label}>
                    <Icon size={18} />
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
              <div className="workspace-next">
                <Sparkles size={22} />
                <div>
                  <h2>
                    {report
                      ? "Your next step: review the evidence."
                      : "Start your first investigation."}
                  </h2>
                  <p>
                    {report
                      ? "Understand the observations before considering the proposal."
                      : "Explore a synthetic checkout incident. No infrastructure required."}
                  </p>
                </div>
                {report ? (
                  <ButtonLink href="/dashboard/investigations">
                    Open incident <ArrowRight size={16} />
                  </ButtonLink>
                ) : (
                  <Button onClick={() => setReport(sampleIncident)}>
                    Load sample incident
                  </Button>
                )}
              </div>
            </>
          )}
          {(view === "overview" || view === "investigations") && (
            <section className="panel incident-list">
              <div className="panel-heading">
                <h2>
                  {view === "overview" ? "Needs your attention" : "Incidents"}
                </h2>
                <span className="status-badge">
                  {sample ? "Sample" : "Current view"}
                </span>
                <label className="incident-search">
                  <Search size={15} />
                  <span className="sr-only">Search incidents</span>
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search incidents"
                  />
                </label>
              </div>
              {match ? (
                <button
                  className="incident-row"
                  onClick={() => setDrawer("incident")}
                >
                  <span className="incident-severity" />
                  <div>
                    <strong>{report.description}</strong>
                    <small>
                      {report.service_name} ·{" "}
                      {sample ? "Synthetic PostgreSQL" : "Local backend"} ·{" "}
                      {report.severity} severity
                    </small>
                  </div>
                  <span className="status-badge warning">
                    {report.status.replaceAll("_", " ")}
                  </span>
                  <ArrowRight size={16} />
                </button>
              ) : (
                <Empty
                  title={
                    report ? "No matching incidents" : "A quiet workspace."
                  }
                  text={
                    report
                      ? "Try a different service name or symptom."
                      : "Connect a local report, or load the sample to explore the workflow."
                  }
                />
              )}
            </section>
          )}
          {view === "overview" && (
            <ReportAnalytics report={report} sample={sample} />
          )}
          {view === "reports" &&
            (report ? (
              <section className="panel report-overview">
                <FileText size={30} />
                <h2>{report.service_name} investigation report</h2>
                <p>
                  Incident state, observed evidence, timeline, diagnosis, and
                  recovery results.{" "}
                  {sample
                    ? "This export contains illustrative data."
                    : "This export is a snapshot of the local backend report."}
                </p>
                <dl>
                  <div>
                    <dt>Incident ID</dt>
                    <dd>{report.incident_id}</dd>
                  </div>
                  <div>
                    <dt>Source</dt>
                    <dd>{sample ? "Illustrative sample" : "Local FastAPI"}</dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd>{report.status.replaceAll("_", " ")}</dd>
                  </div>
                  <div>
                    <dt>Evidence entries</dt>
                    <dd>{Object.keys(report.evidence).length}</dd>
                  </div>
                </dl>
                <Button onClick={() => download(report, sample)}>
                  <Download size={16} /> Download JSON report
                </Button>
              </section>
            ) : (
              <div className="panel">
                <Empty
                  title="No reports yet"
                  text="Load a sample incident or connect a local report to inspect and export the evidence."
                />
                <Button onClick={() => setReport(sampleIncident)}>
                  Load sample incident
                </Button>
              </div>
            ))}
          {(view === "investigations" || view === "approvals") &&
            (report ? (
              view === "approvals" && report.status !== "awaiting_approval" ? (
                <div className="panel">
                  <Empty
                    title="No pending approvals"
                    text="This report does not have a repair awaiting approval. Check the incident for its latest state."
                  />
                </div>
              ) : (
                <IncidentDetail
                  key={report.incident_id}
                  report={report}
                  sample={sample}
                  approval={view === "approvals"}
                />
              )
            ) : (
              <div className="panel">
                <Empty
                  title={
                    view === "approvals"
                      ? "No decisions waiting."
                      : "Ready when you are."
                  }
                  text="Load a synthetic checkout incident to explore the evidence and approval workflow."
                />
                <Button onClick={() => setReport(sampleIncident)}>
                  Load sample incident
                </Button>
              </div>
            ))}
          {view === "overview" && (
            <div className="workspace-bottom">
              <a className="panel" href="/docs#local-demo">
                <Activity size={22} />
                <h3>Run the real local workflow</h3>
                <p>
                  Start the simulator and agent. Inspect an actual
                  investigation.
                </p>
                <span className="text-link">Read the setup guide →</span>
              </a>
              <a className="panel" href="/docs#benchmark">
                <ShieldCheck size={22} />
                <h3>A repair needs verification</h3>
                <p>See how the backend checks performance and correctness.</p>
                <span className="text-link">Explore verification →</span>
              </a>
            </div>
          )}
        </>
      )}
    </>
  );
}
