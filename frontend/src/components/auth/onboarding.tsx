"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Check,
  Database,
  Radio,
  Sparkles,
} from "lucide-react";
import { finishOnboarding } from "@/lib/auth/actions";
import { roles, teamSizes, goals, type Session } from "@/lib/auth/types";
import { Button } from "@/components/ui/button";
const steps = [
  "Your workspace",
  "Your signals",
  "Your team",
  "Your first investigation",
];
export function Onboarding({ session }: { session: Session }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState(session.workspace.name);
  const [source, setSource] = useState<"demo" | "later">(
    session.workspace.source,
  );
  const [role, setRole] = useState(session.workspace.role);
  const [teamSize, setTeamSize] = useState(session.workspace.teamSize);
  const [goal, setGoal] = useState(session.workspace.goal);
  const [state, action, pending] = useActionState(finishOnboarding, {});
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, [step]);
  return (
    <div className="onboarding-layout">
      <section className="onboarding-card">
        <div className="onboarding-progress">
          <span>STEP 0{step + 1} OF 04</span>
          <div>
            {steps.map((s, i) => (
              <span key={s} className={i <= step ? "filled" : ""} />
            ))}
          </div>
        </div>
        <form
          action={action}
          onSubmit={(event) => {
            if (step < 3) {
              event.preventDefault();
              if (name.trim().length >= 2) setStep(step + 1);
            }
          }}
        >
          <input type="hidden" name="teamSize" value={teamSize} />
          <input type="hidden" name="goal" value={goal} />
          <input type="hidden" name="workspace" value={name} />
          <input type="hidden" name="source" value={source} />
          <input type="hidden" name="role" value={role} />
          <div className="step-content" key={step}>
            <span className="step-icon">
              {step === 0 ? (
                <Sparkles />
              ) : step === 1 ? (
                <Activity />
              ) : step === 2 ? (
                <Radio />
              ) : (
                <Database />
              )}
            </span>
            <h1 ref={heading} tabIndex={-1}>
              {
                [
                  `Welcome, ${session.user.name.split(" ")[0]}.`,
                  "Start with a signal.",
                  "What brings you here?",
                  "You’re ready to go.",
                ][step]
              }
            </h1>
            <p>
              {
                [
                  "Give your workspace a name. You can change it later.",
                  "Explore the whole experience with synthetic data, or set up an empty workspace.",
                  "Choose the perspective that fits you. You can change this in settings.",
                  source === "demo"
                    ? "Follow a slow checkout from an alert to an evidence-backed repair proposal."
                    : "Your workspace starts empty. Connect a local report when you are ready.",
                ][step]
              }
            </p>
            {step === 0 && (
              <label htmlFor="workspace-name">
                Workspace name
                <input
                  id="workspace-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  minLength={2}
                  maxLength={60}
                  required
                  placeholder="e.g. Platform engineering"
                />
                <small>
                  {session.mode === "demo"
                    ? "Saved for this sample session."
                    : "Only you can access this workspace."}
                </small>
              </label>
            )}
            {step === 1 && (
              <fieldset className="choice-list">
                <legend className="sr-only">Data source</legend>
                <label
                  className={source === "demo" ? "choice selected" : "choice"}
                >
                  <input
                    type="radio"
                    name="source-choice"
                    checked={source === "demo"}
                    onChange={() => setSource("demo")}
                  />
                  <Database size={23} />
                  <span>
                    <strong>
                      Explore with demo data{" "}
                      <span className="tiny-pill">Recommended</span>
                    </strong>
                    <small>
                      A synthetic PostgreSQL checkout incident. Ready to
                      explore.
                    </small>
                  </span>
                </label>
                <label
                  className={source === "later" ? "choice selected" : "choice"}
                >
                  <input
                    type="radio"
                    name="source-choice"
                    checked={source === "later"}
                    onChange={() => setSource("later")}
                  />
                  <Radio size={23} />
                  <span>
                    <strong>Connect telemetry later</strong>
                    <small>
                      Start empty. Load a local report from Connections.
                    </small>
                  </span>
                </label>
                <a
                  href="/docs#local-demo"
                  target="_blank"
                  rel="noreferrer"
                  className="text-link"
                >
                  Want a real local investigation? Read the setup guide ↗
                </a>
              </fieldset>
            )}
            {step === 2 && (
              <>
                <fieldset className="choice-list">
                  <legend className="sr-only">Your role</legend>
                  {roles.map((r) => (
                    <label
                      key={r}
                      className={role === r ? "choice selected" : "choice"}
                    >
                      <input
                        type="radio"
                        name="role-choice"
                        checked={role === r}
                        onChange={() => setRole(r)}
                      />
                      <span>
                        <strong>{r}</strong>
                      </span>
                    </label>
                  ))}
                </fieldset>
                <div className="onboarding-selects">
                  <label htmlFor="team-size">
                    Team size
                    <select
                      id="team-size"
                      value={teamSize}
                      onChange={(e) => setTeamSize(e.target.value)}
                    >
                      {teamSizes.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </label>
                  <label htmlFor="goal">
                    Primary goal
                    <select
                      id="goal"
                      value={goal}
                      onChange={(e) => setGoal(e.target.value)}
                    >
                      {goals.map((g) => (
                        <option key={g}>{g}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </>
            )}
            {step === 3 && (
              <div className="onboarding-review">
                <span className="card-kicker">
                  {source === "demo"
                    ? "YOUR DEMO WORKFLOW"
                    : "YOUR EMPTY WORKSPACE"}
                </span>
                <h3>
                  {source === "demo" ? "Investigate checkout latency" : name}
                </h3>
                <p>
                  {source === "demo"
                    ? "Signal → evidence → proposal → human approval"
                    : "Load a local report from Connections, or explore a sample from your dashboard."}
                </p>
                <dl>
                  <div>
                    <dt>Workspace</dt>
                    <dd>{name}</dd>
                  </div>
                  <div>
                    <dt>Your role</dt>
                    <dd>{role}</dd>
                  </div>
                  <div>
                    <dt>Team size</dt>
                    <dd>{teamSize}</dd>
                  </div>
                  <div>
                    <dt>Primary goal</dt>
                    <dd>{goal}</dd>
                  </div>
                  <div>
                    <dt>Environment</dt>
                    <dd>
                      {source === "demo"
                        ? "Synthetic PostgreSQL"
                        : "No connected sources"}
                    </dd>
                  </div>
                </dl>
                <small>
                  {source === "demo"
                    ? "This walkthrough uses illustrative data and does not run an AI agent or repair."
                    : "No telemetry is connected. You can load a sample or a local report from the dashboard."}
                </small>
              </div>
            )}
          </div>
          {state.error && (
            <p role="alert" className="form-error">
              {state.error}
            </p>
          )}
          <div className="onboarding-actions">
            {step > 0 ? (
              <Button
                type="button"
                variant="ghost"
                disabled={pending}
                onClick={() => setStep(step - 1)}
              >
                <ArrowLeft size={15} /> Back
              </Button>
            ) : (
              <span />
            )}{" "}
            {step < 3 ? (
              <Button
                key="continue"
                type="button"
                disabled={name.trim().length < 2}
                onClick={(event) => {
                  event.preventDefault();
                  setStep(step + 1);
                }}
              >
                Continue <ArrowRight size={15} />
              </Button>
            ) : (
              <Button key="finish" type="submit" disabled={pending}>
                {pending
                  ? "Preparing your workspace…"
                  : source === "demo"
                    ? "Explore demo investigation"
                    : "Open workspace"}
                <ArrowRight size={15} />
              </Button>
            )}
          </div>
        </form>
      </section>
    </div>
  );
}
