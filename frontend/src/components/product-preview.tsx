"use client";
import * as Tabs from "@radix-ui/react-tabs";
import {
  Activity,
  ArrowRight,
  Check,
  ChevronRight,
  CircleDot,
  Database,
  Fingerprint,
  GitBranch,
  LayoutDashboard,
  LockKeyhole,
  Search,
  ShieldCheck,
  Sparkles,
  Terminal,
  Workflow,
} from "lucide-react";
const stages = [
  { id: "investigate", label: "Investigate", icon: Search },
  { id: "approve", label: "Review & approve", icon: ShieldCheck },
  { id: "verify", label: "Verify recovery", icon: Activity },
];
export function ProductPreview() {
  return (
    <div className="preview-shell">
      <div className="preview-top">
        <span>
          <span className="tiny-mark">S</span> SentinelOps{" "}
          <span className="preview-slash">/</span> Command Center
        </span>
        <span className="preview-label">Illustrative preview · not live</span>
      </div>
      <div className="preview-body">
        <aside
          className="preview-sidebar"
          aria-label="Preview navigation (illustrative)"
        >
          <span className="sidebar-caption">WORKSPACE</span>
          <span>
            <LayoutDashboard size={15} /> Overview
          </span>
          <span className="selected">
            <CircleDot size={15} /> Incidents <b>01</b>
          </span>
          <span>
            <Sparkles size={15} /> AI Agent
          </span>
          <span>
            <ShieldCheck size={15} /> Approvals
          </span>
          <span>
            <Activity size={15} /> Performance
          </span>
          <span>
            <Workflow size={15} /> Activity & traces
          </span>
          <div className="command-incidents">
            <span>DEMO INCIDENTS</span>
            <div className="command-incident-selected">
              <strong>Checkout latency</strong>
              <small>Investigating · CHK-024</small>
            </div>
            <div>
              <strong>Checkout recovery</strong>
              <small>Verified · benchmark run</small>
            </div>
          </div>
          <div className="sidebar-bottom">
            <span className="avatar">D</span>
            <span>
              Demo workspace<small>Local PostgreSQL</small>
            </span>
            <LockKeyhole size={13} />
          </div>
        </aside>
        <div className="preview-content">
          <div className="preview-breadcrumb">
            Incidents <ChevronRight size={13} /> Synthetic checkout
          </div>
          <div className="preview-title">
            <div>
              <span className="eyebrow dark-eyebrow">CHECKOUT SERVICE</span>
              <h3>Checkout investigation</h3>
            </div>
            <span className="synthetic-badge">
              <span /> Synthetic
            </span>
          </div>
          <Tabs.Root defaultValue="investigate">
            <Tabs.List
              className="preview-tabs"
              aria-label="Explore incident workflow"
            >
              {stages.map(({ id, label, icon: Icon }) => (
                <Tabs.Trigger key={id} value={id}>
                  <Icon size={14} />
                  {label}
                </Tabs.Trigger>
              ))}
            </Tabs.List>
            <Tabs.Content value="investigate" className="preview-panel">
              <div className="agent-message">
                <span className="agent-icon">
                  <Sparkles size={18} />
                </span>
                <div>
                  <strong>An investigation with a paper trail.</strong>
                  <p>
                    Explore how the agent gathers evidence before proposing a
                    change.
                  </p>
                </div>
                <span className="example-tag">EXAMPLE</span>
              </div>
              <div className="evidence-grid">
                <div className="evidence-card">
                  <span>
                    <Database size={14} /> QUERY PLAN
                  </span>
                  <strong>Sequential scan</strong>
                  <p>A lookup scans the orders table.</p>
                  <div className="scan-lines">
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                  </div>
                </div>
                <div className="evidence-card">
                  <span>
                    <Fingerprint size={14} /> SCHEMA INSPECTION
                  </span>
                  <strong>Missing email index</strong>
                  <p>Check the column and existing indexes.</p>
                  <code>orders.customer_email</code>
                </div>
              </div>
              <ol
                className="command-timeline"
                aria-label="Demo AI investigation timeline"
              >
                <li>
                  <Check size={12} />
                  <span>
                    <strong>Database metrics collected</strong>
                    <small>Local checkout fixture · P95 elevated</small>
                  </span>
                  <time>09:41</time>
                </li>
                <li>
                  <Check size={12} />
                  <span>
                    <strong>Query plan and schema inspected</strong>
                    <small>Evidence E01 + E02 · sequential scan</small>
                  </span>
                  <time>09:42</time>
                </li>
                <li>
                  <ShieldCheck size={12} />
                  <span>
                    <strong>Root cause: missing email index</strong>
                    <small>Proposal ready · human approval required</small>
                  </span>
                  <time>09:43</time>
                </li>
              </ol>
              <div className="preview-result">
                <GitBranch size={16} />
                <span>Evidence first. A bounded repair proposal next.</span>
                <ArrowRight size={16} />
              </div>
            </Tabs.Content>
            <Tabs.Content value="approve" className="preview-panel">
              <div className="agent-message">
                <span className="agent-icon">
                  <ShieldCheck size={18} />
                </span>
                <div>
                  <strong>Your approval is the boundary.</strong>
                  <p>
                    Example proposal · this preview cannot execute a repair.
                  </p>
                </div>
              </div>
              <div className="proposal">
                <span className="eyebrow dark-eyebrow">
                  ALLOWLISTED OPERATION
                </span>
                <code>create_checkout_email_index</code>
                <p>
                  Expected outcome: use an index for the checkout email lookup.
                  Index creation may lock writes and uses storage.
                </p>
                <div>
                  <LockKeyhole size={15} /> The backend requires explicit human
                  approval.
                </div>
              </div>
            </Tabs.Content>
            <Tabs.Content value="verify" className="preview-panel">
              <div className="agent-message">
                <span className="agent-icon">
                  <Activity size={18} />
                </span>
                <div>
                  <strong>A repair is only half the story.</strong>
                  <p>Verification checks performance and result correctness.</p>
                </div>
              </div>
              <div className="verification-preview">
                <div>
                  <span className="benchmark-number">
                    17.89<span>×</span>
                  </span>
                  <small>
                    P95 improvement in a local synthetic PostgreSQL
                    demonstration.
                  </small>
                </div>
                <ul>
                  <li>
                    <Check size={15} /> Compare P50 and P95
                  </li>
                  <li>
                    <Check size={15} /> Inspect actual index use
                  </li>
                  <li>
                    <Check size={15} /> Check identical query results
                  </li>
                </ul>
              </div>
            </Tabs.Content>
          </Tabs.Root>
          <div className="preview-status">
            <span>
              <Terminal size={12} /> Designed for evidence-backed operations
            </span>
            <span>Human control, at every repair</span>
          </div>
        </div>
      </div>
    </div>
  );
}
