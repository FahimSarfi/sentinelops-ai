import { test, expect } from "@playwright/test";
import { isIncidentReport, sampleIncident } from "../src/lib/incidents";
test("report boundary accepts the backend contract and rejects invalid responses", () => {
  expect(isIncidentReport(sampleIncident)).toBe(true);
  expect(isIncidentReport({ ...sampleIncident, diagnosis: null })).toBe(true);
  expect(isIncidentReport({ ...sampleIncident, status: "unknown" })).toBe(
    false,
  );
  expect(
    isIncidentReport({ ...sampleIncident, events: [{ event: "detected" }] }),
  ).toBe(false);
  expect(
    isIncidentReport({
      ...sampleIncident,
      evidence: { e1: { tool: "metrics" } },
    }),
  ).toBe(false);
  expect(
    isIncidentReport({
      ...sampleIncident,
      diagnosis: {
        finding: "missing_checkout_email_index",
        confidence: 0.9,
        evidence_ids: ["e1"],
        repair: "wrong_field",
      },
    }),
  ).toBe(false);
  expect(isIncidentReport({ error: "unavailable" })).toBe(false);
});
