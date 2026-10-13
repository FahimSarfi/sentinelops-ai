"use client";
import { useState } from "react";
import type { IncidentReport } from "@/lib/incidents";
import { Button } from "@/components/ui/button";
import { Overlay } from "./overlay";
export function ReportAnalytics({
  report,
  sample,
}: {
  report: IncidentReport | null;
  sample: boolean;
}) {
  const [metric, setMetric] = useState("events");
  const [customize, setCustomize] = useState(false);
  const [showCoverage, setShowCoverage] = useState(true);
  const entries = Object.entries(report?.evidence ?? {});
  const cited = new Set(report?.diagnosis?.evidence_ids ?? []);
  const coverage = entries.length
    ? Math.round(
        (entries.filter(([id]) => cited.has(id)).length / entries.length) * 100,
      )
    : 0;
  const times = report
    ? (metric === "events"
        ? report.events.map((e) => e.at)
        : entries.map(([, e]) => e.at)
      )
        .filter((t) => Number.isFinite(Date.parse(t)))
        .sort()
    : [];
  const spanMs =
    times.length > 1
      ? Date.parse(times[times.length - 1]) - Date.parse(times[0])
      : 0;
  const duration = spanMs / 1000;
  const x = (t: string) =>
    30 +
    (spanMs > 0 ? ((Date.parse(t) - Date.parse(times[0])) / spanMs) * 570 : 0);
  const y = (i: number) => 160 - ((i + 1) / Math.max(1, times.length)) * 125;
  const stages = ["Detected", "Investigation", "Proposal", "Recovery"];
  const counts = stages.map(
    (_, i) =>
      report?.events.filter((e) =>
        i === 0
          ? /detect/.test(e.event)
          : i === 1
            ? /investigat|evidence/.test(e.event)
            : i === 2
              ? /proposal|approv|reject/.test(e.event)
              : /recover|resolv|fail/.test(e.event),
      ).length ?? 0,
  );
  return (
    <section className="analytics-section" aria-label="Report analytics">
      <div className="analytics-toolbar">
        <div>
          <h2>Investigation analytics</h2>
          <p>
            {sample
              ? "Illustrative sample · One incident snapshot"
              : report
                ? "Loaded report · One incident snapshot"
                : "No report loaded"}
          </p>
        </div>
        <Button variant="secondary" onClick={() => setCustomize(true)}>
          Customize view
        </Button>
      </div>
      <div
        className={
          showCoverage ? "analytics-grid" : "analytics-grid no-coverage"
        }
      >
        <div className="panel analytics-chart">
          <div className="analytics-title">
            <h3>Cumulative activity over time</h3>
            <select
              aria-label="Chart metric"
              value={metric}
              onChange={(e) => setMetric(e.target.value)}
            >
              <option value="events">Timeline events</option>
              <option value="evidence">Evidence observations</option>
            </select>
          </div>
          {times.length ? (
            <>
              <svg
                viewBox="0 0 620 180"
                role="img"
                aria-label={`${times.length} ${metric} recorded across ${duration ?? 0} seconds`}
              >
                {[35, 80, 125, 160].map((y) => (
                  <line
                    key={y}
                    x1="30"
                    x2="600"
                    y1={y}
                    y2={y}
                    stroke="#ececea"
                  />
                ))}
                <polyline
                  points={times.map((t, i) => `${x(t)},${y(i)}`).join(" ")}
                  fill="none"
                  stroke="#6157c8"
                  strokeWidth="3"
                />
                {times.map((t, i) => (
                  <circle
                    key={`${t}-${i}`}
                    cx={x(t)}
                    cy={y(i)}
                    r="5"
                    fill="#6157c8"
                  >
                    <title>{`${new Date(t).toISOString().slice(11, 19)} UTC · ${i + 1} cumulative ${metric}`}</title>
                  </circle>
                ))}
                <text x="8" y="165" fontSize="10" fill="#606060">
                  0
                </text>
                <text x="8" y="39" fontSize="10" fill="#606060">
                  {times.length}
                </text>
              </svg>
              <p className="chart-axis-label">
                Cumulative observations · elapsed time (UTC)
              </p>
              <div className="chart-caption">
                <span>
                  {new Date(times[0]).toISOString().slice(11, 19)} UTC
                </span>
                <span>
                  {new Date(times[times.length - 1])
                    .toISOString()
                    .slice(11, 19)}{" "}
                  UTC · {times.length} observations · {duration}s span
                </span>
              </div>
              <details className="chart-data">
                <summary>View observation timestamps</summary>
                <ol>
                  {times.map((t, i) => (
                    <li key={`${t}-${i}`}>
                      {new Date(t).toISOString()} · {i + 1} cumulative {metric}
                    </li>
                  ))}
                </ol>
              </details>
            </>
          ) : (
            <div className="chart-empty">Connect a report to see activity.</div>
          )}
        </div>
        {showCoverage && (
          <div className="panel analytics-coverage">
            <h3>Evidence cited in diagnosis</h3>
            <div
              className="coverage-ring"
              style={{
                background: `conic-gradient(#6157c8 ${coverage}%, #eeedf3 0)`,
              }}
            >
              <span>{entries.length ? `${coverage}%` : "—"}</span>
            </div>
            <p>
              {entries.filter(([id]) => cited.has(id)).length} of{" "}
              {entries.length} observations cited
            </p>
            <small>
              Citation coverage measures references, not diagnostic accuracy.
            </small>
          </div>
        )}
        <div className="panel analytics-stages">
          <h3>Recorded workflow activity</h3>
          {stages.map((stage, i) => (
            <div className="stage-bar" key={stage}>
              <span>{stage}</span>
              <div>
                <i
                  style={{
                    width: `${(counts[i] / Math.max(1, ...counts)) * 100}%`,
                  }}
                />
              </div>
              <strong>{counts[i]}</strong>
            </div>
          ))}
          <small>
            Counts from this report’s timeline. Recovery appears after backend
            verification.
          </small>
        </div>
      </div>
      {customize && (
        <Overlay
          title="Customize analytics"
          onClose={() => setCustomize(false)}
        >
          <div className="analytics-customization">
            <p>Choose which report observations to display.</p>
            <label className="analytics-toggle">
              <input
                type="checkbox"
                checked={showCoverage}
                onChange={(e) => setShowCoverage(e.target.checked)}
              />{" "}
              Show evidence citation coverage
            </label>
            <p className="muted">
              Changes apply to this view. Charts use the loaded incident
              snapshot.
            </p>
            <div className="overlay-actions">
              <Button onClick={() => setCustomize(false)}>Done</Button>
            </div>
          </div>
        </Overlay>
      )}
    </section>
  );
}
