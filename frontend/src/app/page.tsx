import { WorkspaceShowcase } from "@/components/workspace-showcase";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Check,
  Code2,
  Database,
  Fingerprint,
  GitBranch,
  LockKeyhole,
  Search,
  ShieldCheck,
  Workflow,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { SiteHeader } from "@/components/site-header";
import { Investigation } from "@/components/marketing/investigation";
import { ButtonLink } from "@/components/ui/button";
const questions = [
  [
    "Does the agent make changes on its own?",
    "No. Investigation uses bounded read-only database tools. A valid proposal and your explicit approval are required before the backend executes a fixed, allowlisted repair.",
  ],
  [
    "What can I connect today?",
    "The local prototype investigates an isolated PostgreSQL checkout simulator. Connect an existing incident report from your local FastAPI instance, or explore the clearly labeled sample workspace.",
  ],
  [
    "How do accounts and sample access work?",
    "Accounts use Supabase authentication, with private workspace preferences. Sample access is a separate temporary session with illustrative data. Neither path connects production infrastructure.",
  ],
  [
    "Is SentinelOps production-ready?",
    "SentinelOps AI is a neatHack 2026 prototype. The local backend demonstrates investigation, approval, and recovery verification. We do not offer production service guarantees or commercial plans.",
  ],
];
export default function Home() {
  return (
    <div className="landing-page">
      <SiteHeader landing />
      <main id="main">
        <section className="centered-hero wrap" aria-labelledby="hero-heading">
          <div className="centered-hero-copy">
            <span className="centered-hero-eyebrow">
              [ AI INCIDENT RESPONSE ]
            </span>
            <h1 id="hero-heading">
              Understand every incident
              <br className="hero-heading-break" /> before you act
            </h1>
            <p>
              Bring investigations, evidence, human approvals, and verified
              recovery into one intelligent workflow. SentinelOps AI helps
              engineering teams resolve incidents with greater clarity and
              control.
            </p>
            <div className="centered-hero-actions">
              <ButtonLink href="/sign-up">Get Started</ButtonLink>
              <ButtonLink href="#product" variant="secondary">
                View Demo
              </ButtonLink>
            </div>
          </div>
          <figure className="centered-hero-preview">
            <WorkspaceShowcase />
            <figcaption>
              THE SENTINELOPS WORKSPACE{" "}
              <span>Illustrative sample data · no infrastructure changes</span>
            </figcaption>
          </figure>
        </section>
        <section
          className="stack-strip wrap"
          aria-label="Project technology stack"
        >
          <span>
            A focused stack.
            <br />
            <strong>An observable workflow.</strong>
          </span>
          <div>
            <span>
              <Code2 />
              FastAPI
            </span>
            <span>
              <Database />
              PostgreSQL
            </span>
            <span>
              <Workflow />
              OpenTelemetry
            </span>
            <span className="wordmark">
              neatlogs<span className="orange-dot">.</span>
            </span>
            <span>
              <GitBranch />
              Entire
            </span>
          </div>
        </section>
        <section className="section wrap why-section" id="product">
          <div>
            <span className="eyebrow">BUILT FOR THE ENGINEER ON CALL</span>
            <h2>
              Less time piecing it together.
              <br />
              More context to make the call.
            </h2>
          </div>
          <p>
            When checkout slows down, another alert isn’t enough. You need to
            know what changed, what the evidence supports, and whether the
            proposed repair actually worked.
          </p>
          <div className="capabilities">
            {[
              {
                icon: Search,
                title: "Investigate with purpose",
                text: "Bounded, read-only tools inspect query plans, schema, metrics, and incident history.",
              },
              {
                icon: Fingerprint,
                title: "Understand the evidence",
                text: "Follow the observations behind a diagnosis. Unsupported findings escalate instead of becoming repairs.",
              },
              {
                icon: ShieldCheck,
                title: "Decide with confidence",
                text: "Review a fixed repair proposal. Explicit human approval comes before any change.",
              },
            ].map(({ icon: Icon, title, text }, i) => (
              <article key={title}>
                <span className="capability-number">0{i + 1}</span>
                <Icon size={24} />
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>
        <div id="how-it-works">
          <Investigation />
        </div>
        <section className="section wrap split-section">
          <div>
            <span className="eyebrow">THE DECISION STAYS WITH YOU</span>
            <h2>
              AI does the digging.
              <br />
              You hold the keys.
            </h2>
            <p>
              Move from an evidence-backed diagnosis to a deliberate decision.
              The backend validates the proposal, accepts only an allowlisted
              operation, and verifies the result after approval.
            </p>
            <ButtonLink href="/docs" variant="secondary">
              Explore the safety model <ArrowUpRight size={16} />
            </ButtonLink>
          </div>
          <div className="repair-card">
            <div className="board-top">
              <LockKeyhole size={20} />
              <span>EXAMPLE REPAIR PROPOSAL</span>
              <span className="tiny-pill">Review needed</span>
            </div>
            <h3>Add the missing checkout index.</h3>
            <p>
              Query plan and schema observations support a missing index on the
              email lookup.
            </p>
            <code>create_checkout_email_index</code>
            <ul>
              <li>
                <Check size={16} /> Evidence cited and validated
              </li>
              <li>
                <Check size={16} /> Fixed, bounded operation
              </li>
              <li>
                <Check size={16} /> Latency and result correctness checked
              </li>
            </ul>
            <div className="repair-status">
              <ShieldCheck size={16} /> Awaiting human approval
            </div>
            <small>
              Illustrative proposal. This website cannot execute repairs.
            </small>
          </div>
        </section>
        <section className="technical-band" id="integrations">
          <div className="wrap split-section">
            <div>
              <span className="eyebrow">AN INSPECTABLE FOUNDATION</span>
              <h2>Built to show its work.</h2>
              <p>
                FastAPI runs the incident workflow. PostgreSQL makes the
                scenario reproducible. OpenTelemetry records the steps for
                neatlogs. Evidence and observable proof are part of the product.
              </p>
              <a className="text-link" href="/docs#local-demo">
                Run the local workflow <ArrowRight size={16} />
              </a>
            </div>
            <div className="technical-list">
              {[
                [
                  "01",
                  "FastAPI + PostgreSQL",
                  "A real local investigation against a synthetic checkout fixture.",
                ],
                [
                  "02",
                  "OpenTelemetry + neatlogs",
                  "Instrumented agent tools, decisions, and recovery checks.",
                ],
                [
                  "03",
                  "Verified recovery",
                  "Compare latency, inspect index use, and check identical query results.",
                ],
              ].map(([n, title, text]) => (
                <div key={n}>
                  <span>{n}</span>
                  <div>
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="faq wrap">
          <div>
            <span className="eyebrow">A LITTLE MORE CONTEXT</span>
            <h2>
              Good questions.
              <br />
              Clear answers.
            </h2>
            <a className="text-link" href="/docs">
              Read the documentation <ArrowUpRight size={15} />
            </a>
          </div>
          <div>
            {questions.map(([q, a]) => (
              <details key={q}>
                <summary>
                  {q}
                  <span aria-hidden="true">+</span>
                </summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="closing-cta">
          <div className="wrap">
            <div>
              <span className="eyebrow">
                YOUR NEXT INCIDENT, WITH MORE CONTEXT
              </span>
              <h2>
                Start with evidence.
                <br />
                Move forward with clarity.
              </h2>
              <p>
                Explore SentinelOps AI. Built for engineering teams, at neatHack
                2026.
              </p>
            </div>
            <div className="hero-actions">
              <ButtonLink href="/sign-up">
                Create your workspace <ArrowRight size={17} />
              </ButtonLink>
              <ButtonLink href="/demo" variant="secondary">
                Try the sample
              </ButtonLink>
            </div>
          </div>
        </section>
      </main>
      <footer className="site-footer wrap">
        <div>
          <Brand />
          <p>
            Intelligence for the incident.
            <br />
            Control for the engineer.
          </p>
        </div>
        <nav aria-label="Footer product">
          <strong>Product</strong>
          <a href="/#product">Overview</a>
          <a href="/#how-it-works">Incident workflow</a>
          <a href="/demo">Sample workspace</a>
        </nav>
        <nav aria-label="Footer resources">
          <strong>Resources</strong>
          <a href="/docs">Documentation</a>
          <a href="/docs#benchmark">Verification</a>
          <a href="/docs#development">Development</a>
        </nav>
        <nav aria-label="Footer workspace">
          <strong>Workspace</strong>
          <a href="/sign-in">Sign in</a>
          <a href="/sign-up">Create account</a>
          <a href="/dashboard">Dashboard</a>
        </nav>
        <div className="footer-bottom">
          <span>© 2026 SentinelOps AI</span>
          <span>neatHack prototype · evidence before action</span>
        </div>
      </footer>
    </div>
  );
}
