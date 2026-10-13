"use client";
import { useContext, useState } from "react";
import { Check, Fingerprint, ShieldCheck, Sparkles } from "lucide-react";
import type { IncidentReport } from "@/lib/incidents";
import { Button } from "@/components/ui/button";
import { IncidentContext } from "./shell";
import { Empty } from "./empty-state";
export function IncidentDetail({
  report,
  sample,
  approval = false,
}: {
  report: IncidentReport;
  sample: boolean;
  approval?: boolean;
}) {
  const [tab, setTab] = useState(approval ? "Approval" : "Evidence");
  const { decision, setDecision } = useContext(IncidentContext);
  return (
    <section className="panel incident-detail">
      <div className="incident-heading">
        <div>
          <span className="eyebrow">
            {report.service_name.toUpperCase()} /{" "}
            {sample ? "SAMPLE INCIDENT" : "LOCAL REPORT"}
          </span>
          <h2>{report.description}</h2>
        </div>
        <span className="status-badge warning">
          {report.status.replaceAll("_", " ")}
        </span>
      </div>
      <div className="incident-tabs" aria-label="Incident sections">
        {["Evidence", "Timeline", "Approval", "Recovery"].map((t) => (
          <button key={t} aria-pressed={tab === t} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>
      <div className="incident-tab-content">
        {tab === "Evidence" && (
          <>
            <div className="agent-summary">
              <span className="agent-symbol">
                <Sparkles size={19} />
              </span>
              <div>
                <strong>
                  {report.diagnosis
                    ? report.diagnosis.finding.replaceAll("_", " ")
                    : "Investigation in progress"}
                </strong>
                <p>
                  {report.diagnosis
                    ? `Model-assessed confidence: ${Math.round(report.diagnosis.confidence * 100)}%. Review the cited observations before deciding.`
                    : "Evidence will appear here as the backend gathers context."}
                </p>
              </div>
            </div>
            <div className="evidence-list">
              {Object.entries(report.evidence).map(([id, e], index) => (
                <details
                  key={id}
                  open={index === 0 || e.tool === "query.explain"}
                >
                  <summary>
                    <Fingerprint size={16} />
                    <strong>{e.tool}</strong>
                    <span>{id}</span>
                  </summary>
                  {Boolean(e.data) && typeof e.data === "object" && (
                    <p className="evidence-summary">
                      {["observation", "plan", "predicate"]
                        .map((key) => {
                          const value = (e.data as Record<string, unknown>)[
                            key
                          ];
                          return typeof value === "string" ? value : null;
                        })
                        .filter(Boolean)
                        .join(" · ") ||
                        "Structured tool output. Inspect the details below."}
                    </p>
                  )}
                  <pre>{JSON.stringify(e.data, null, 2)}</pre>
                </details>
              ))}
            </div>
            {!Object.keys(report.evidence).length && (
              <Empty
                title="No evidence yet"
                text="Run the investigation in your local backend, then reload the report."
              />
            )}
          </>
        )}
        {tab === "Timeline" && (
          <ol className="incident-timeline">
            {report.events.map((e, i) => (
              <li key={`${e.event}-${i}`}>
                <span>
                  <Check size={13} />
                </span>
                <div>
                  <strong>{e.event.replaceAll("_", " ")}</strong>
                  <small>
                    {Number.isFinite(Date.parse(e.at))
                      ? new Date(e.at)
                          .toISOString()
                          .replace("T", " ")
                          .slice(0, 19)
                      : "Unknown time"}{" "}
                    UTC
                  </small>
                </div>
              </li>
            ))}
          </ol>
        )}
        {tab === "Approval" && (
          <>
            <div className="approval-proposal">
              <ShieldCheck size={28} />
              <h3>
                {report.diagnosis?.repair_id
                  ? "A proposal for your review."
                  : "No repair proposed."}
              </h3>
              <p>
                {report.diagnosis?.repair_id
                  ? "Review the evidence and operation before making a decision. Creating an index may lock writes and consumes storage."
                  : "No operation is available to approve. Review the evidence or reload the report after the investigation completes."}
              </p>
              {report.diagnosis?.repair_id && (
                <code>{report.diagnosis.repair_id}</code>
              )}
              <small>
                Evidence cited:{" "}
                {report.diagnosis?.evidence_ids.join(", ") || "None"}
              </small>
            </div>
            {sample && report.diagnosis?.repair_id ? (
              <div className="sample-decision">
                <p>
                  Sample interaction only. These controls do not run an agent or
                  change infrastructure.
                </p>
                {decision ? (
                  <>
                    <p role="status" className="form-success">
                      {decision === "approve"
                        ? "Sample decision recorded: approve. Real repairs require backend approval and verification."
                        : "Sample decision recorded: reject. No repair would be performed."}
                    </p>
                    <Button
                      variant="secondary"
                      onClick={() => setDecision(null)}
                    >
                      Reset sample decision
                    </Button>
                  </>
                ) : (
                  <div className="hero-actions">
                    <Button onClick={() => setDecision("approve")}>
                      Preview approval
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => setDecision("reject")}
                    >
                      Preview rejection
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <p className="form-notice">
                Decisions are submitted through the local backend workflow. This
                report reader cannot execute repairs.
              </p>
            )}
          </>
        )}
        {tab === "Recovery" && (
          <>
            {report.recovery ? (
              <>
                <h3>Backend verification report</h3>
                <pre className="report-json">
                  {JSON.stringify(report.recovery, null, 2)}
                </pre>
              </>
            ) : (
              <Empty
                title="Recovery needs observable proof."
                text="After an approved repair, the backend compares P50 and P95 latency, verifies index use, and checks result correctness. No recovery has been recorded in this report."
              />
            )}
          </>
        )}
      </div>
    </section>
  );
}
