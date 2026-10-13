export const incidentStatuses = [
  "detected",
  "investigating",
  "awaiting_approval",
  "recovering",
  "resolved",
  "failed",
  "escalated",
  "rejected",
] as const;
export type IncidentStatus = (typeof incidentStatuses)[number];
export type IncidentReport = {
  incident_id: string;
  service_name: string;
  severity: string;
  status: IncidentStatus;
  description: string;
  created_at: string;
  events: { at: string; event: string }[];
  evidence: Record<string, { tool: string; data: unknown; at: string }>;
  diagnosis: {
    finding: string;
    confidence: number;
    evidence_ids: string[];
    repair_id: string | null;
  } | null;
  recovery: unknown;
};
export function isIncidentReport(value: unknown): value is IncidentReport {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (
    typeof v.incident_id !== "string" ||
    typeof v.service_name !== "string" ||
    typeof v.severity !== "string" ||
    typeof v.status !== "string" ||
    !(incidentStatuses as readonly string[]).includes(v.status) ||
    typeof v.description !== "string" ||
    typeof v.created_at !== "string" ||
    !Number.isFinite(Date.parse(v.created_at))
  )
    return false;
  if (
    !Array.isArray(v.events) ||
    !v.events.every(
      (e) => e && typeof e.at === "string" && typeof e.event === "string",
    )
  )
    return false;
  if (
    !v.evidence ||
    typeof v.evidence !== "object" ||
    Array.isArray(v.evidence) ||
    !Object.values(v.evidence).every(
      (e) =>
        e &&
        typeof e === "object" &&
        typeof e.tool === "string" &&
        typeof e.at === "string" &&
        "data" in e,
    )
  )
    return false;
  const d = v.diagnosis;
  return (
    (d === null ||
      (typeof d === "object" &&
        d !== null &&
        "finding" in d &&
        typeof d.finding === "string" &&
        "confidence" in d &&
        typeof d.confidence === "number" &&
        "evidence_ids" in d &&
        Array.isArray(d.evidence_ids) &&
        d.evidence_ids.every((id) => typeof id === "string") &&
        "repair_id" in d &&
        (d.repair_id === null || typeof d.repair_id === "string"))) &&
    "recovery" in v
  );
}
export const sampleIncident: IncidentReport = {
  incident_id: "sample-checkout",
  service_name: "checkout",
  severity: "high",
  status: "awaiting_approval",
  description: "Elevated latency on the checkout email lookup",
  created_at: "2026-10-10T09:41:00Z",
  events: [
    { at: "2026-10-10T09:41:00Z", event: "incident_detected" },
    { at: "2026-10-10T09:41:08Z", event: "investigation_started" },
    { at: "2026-10-10T09:41:14Z", event: "evidence_observed" },
    { at: "2026-10-10T09:41:27Z", event: "proposal_ready" },
  ],
  evidence: {
    e1: {
      tool: "metrics.read",
      data: {
        observation: "Elevated query latency in synthetic checkout workload",
      },
      at: "2026-10-10T09:41:12Z",
    },
    e2: {
      tool: "query.explain",
      data: { plan: "Sequential Scan on orders", predicate: "customer_email" },
      at: "2026-10-10T09:41:14Z",
    },
    e3: {
      tool: "schema.inspect",
      data: { table: "orders", observation: "No matching email index" },
      at: "2026-10-10T09:41:20Z",
    },
  },
  diagnosis: {
    finding: "missing_checkout_email_index",
    confidence: 0.92,
    evidence_ids: ["e1", "e2", "e3"],
    repair_id: "create_checkout_email_index",
  },
  recovery: null,
};
