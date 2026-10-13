"use client";

import { useRef, useState } from "react";
import {
  Activity,
  ArrowRight,
  Check,
  Database,
  LockKeyhole,
  Search,
  ShieldCheck,
} from "lucide-react";
import { Reveal } from "../reveal";

const steps = [
  {
    id: "signal",
    title: "Read the signal",
    icon: Activity,
    tool: "metrics.read",
    type: "READ-ONLY TOOL",
    headline: "A slow checkout. A place to start.",
    text: "The synthetic checkout incident gives the agent a focused question: what is slowing down the email lookup?",
    code: [
      "service    checkout",
      "workload   synthetic PostgreSQL",
      "symptom    elevated query latency",
    ],
    evidence: "Observation → checkout query latency",
    next: "Inspect the query plan",
  },
  {
    id: "inspect",
    title: "Connect the evidence",
    icon: Search,
    tool: "query.explain + schema.inspect",
    type: "READ-ONLY TOOLS",
    headline: "Follow the query, not a hunch.",
    text: "A sequential scan and a missing email index form the illustrated evidence trail. The agent can also consult incident history before proposing a repair.",
    code: [
      "plan       Sequential Scan on orders",
      "predicate  customer_email",
      "schema     no matching email index",
    ],
    evidence: "Query plan + schema → supporting observations",
    next: "Review the diagnosis",
  },
  {
    id: "review",
    title: "Stop at the boundary",
    icon: LockKeyhole,
    tool: "create_checkout_email_index",
    type: "PROPOSED ALLOWLISTED OPERATION",
    headline: "The next move belongs to you.",
    text: "Review the diagnosis, cited evidence, and model-assessed confidence. A valid proposal and explicit human approval are required. This illustration cannot execute a repair.",
    code: [
      "validation  evidence required",
      "operation   fixed repair allowlist",
      "approval    awaiting human decision",
    ],
    evidence: "Unsupported findings → escalation, never a repair",
    next: "Explore verification",
  },
  {
    id: "verify",
    title: "Prove the recovery",
    icon: ShieldCheck,
    tool: "Before / after verification",
    type: "BACKEND VERIFICATION",
    headline: "Make the outcome observable.",
    text: "After an approved repair, the backend compares latency, confirms index use, and checks identical query results. Failed verification rolls back the new index.",
    code: [
      "latency    compare P50 and P95",
      "plan       verify actual index use",
      "results    check identical results",
    ],
    evidence: "Failed verification → roll back the new index",
    next: "Replay the investigation",
  },
];

export function Investigation() {
  const [stage, setStage] = useState("signal");
  const panels = useRef<Record<string, HTMLDivElement | null>>({});
  return (
    <section
      className="investigation-section"
      aria-labelledby="investigation-heading"
    >
      <div className="wrap">
        <Reveal className="investigation-heading">
          <div>
            <span className="eyebrow">INSIDE THE INVESTIGATION</span>
            <h2 id="investigation-heading">
              Not a black box.
              <br />
              <span>A chain of reasoning.</span>
            </h2>
          </div>
          <p>
            Follow an incident from its first signal to a verified outcome.
            Every tool call has a purpose. Every repair has a human boundary.
          </p>
        </Reveal>
        <div className="trace-meta">
          <span>
            <span className="small-dot" /> ILLUSTRATIVE INVESTIGATION
          </span>
          <span>LOCAL POSTGRESQL / SYNTHETIC DATA</span>
        </div>
        <div className="investigation-console">
          <div
            role="group"
            aria-label="Investigation story"
            className="trace-steps"
          >
            {steps.map(({ id, title, icon: Icon }, index) => (
              <button
                key={id}
                aria-pressed={stage === id}
                aria-controls={`trace-${id}`}
                onClick={() => setStage(id)}
              >
                <span className="trace-node">
                  <Icon size={19} />
                </span>
                <span>
                  <small>0{index + 1}</small>
                  {title}
                </span>
                <ArrowRight size={16} />
              </button>
            ))}
          </div>
          {steps.map((step, index) => (
            <div
              className="trace-panel"
              key={step.id}
              id={`trace-${step.id}`}
              role="region"
              aria-label={step.title}
              hidden={stage !== step.id}
              tabIndex={-1}
              ref={(node) => {
                panels.current[step.id] = node;
              }}
            >
              <div className="trace-panel-top">
                <span>AGENT TRACE / 0{index + 1}</span>
                <span>DEMONSTRATION</span>
              </div>
              <h3>{step.headline}</h3>
              <p>{step.text}</p>
              <div className="tool-call">
                <div>
                  <Database size={16} />
                  <span>{step.type}</span>
                </div>
                <code>{step.tool}</code>
                <pre>{step.code.join("\n")}</pre>
              </div>
              <div className="trace-evidence">
                <Check size={16} />
                <span>{step.evidence}</span>
              </div>
              <button
                className="trace-next"
                onClick={() => {
                  const next = steps[(index + 1) % steps.length].id;
                  setStage(next);
                  requestAnimationFrame(() =>
                    panels.current[next]?.focus({ preventScroll: true }),
                  );
                }}
              >
                {step.next}
                <ArrowRight size={16} />
              </button>
            </div>
          ))}
        </div>
        <div className="trace-caption">
          <LockKeyhole size={14} /> Read-only investigation → validated proposal
          → human approval → allowlisted repair → verification
        </div>
      </div>
    </section>
  );
}
