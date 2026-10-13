import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
async function onboard(page: import("@playwright/test").Page, empty = false) {
  await page.goto("/demo");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Explore sample workspace" }).click();
  await expect(page).toHaveURL("/onboarding");
  await page.getByLabel("Workspace name").fill("Platform engineering");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  if (empty)
    await page.getByRole("radio", { name: "Connect telemetry later" }).check();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Team size").selectOption("2–10");
  await page
    .getByLabel("Primary goal")
    .selectOption("Review repairs with confidence");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByRole("button", {
      name: empty ? "Open workspace" : "Explore demo investigation",
    })
    .click();
  await expect(page).toHaveURL(
    empty ? "/dashboard" : "/dashboard/investigations",
  );
}
async function navigate(page: import("@playwright/test").Page, name: string) {
  const toggle = page.getByRole("button", {
    name: "Open workspace navigation",
  });
  if (await toggle.isVisible()) await toggle.click();
  await page
    .getByRole("navigation", { name: "Workspace navigation" })
    .getByRole("link", { name, exact: true })
    .click();
}
test("protected routes and report API reject unauthenticated and forged sessions", async ({
  page,
  context,
}) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL("/sign-in");
  await page.goto("/onboarding");
  await expect(page).toHaveURL("/sign-in");
  await context.addCookies([
    {
      name: "sentinelops_demo",
      value: "forged.signature",
      url: "http://127.0.0.1:3100",
    },
  ]);
  await page.goto("/dashboard/reports");
  await expect(page).toHaveURL("/sign-in");
  const res = await page.request.get(
    "/api/incidents/00000000-0000-0000-0000-000000000000",
  );
  expect(res.status()).toBe(401);
});
test("sample onboarding, evidence, decisions, reports, preferences, and sign-out work", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await onboard(page);
  await expect(
    page.getByRole("heading", { name: "Follow the incident." }),
  ).toBeVisible();
  await expect(
    page.getByText("Sequential Scan on orders", { exact: false }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Timeline", exact: true }).click();
  await expect(page.getByText("investigation started")).toBeVisible();
  await navigate(page, "Approvals");
  await expect(
    page.getByRole("button", { name: "Preview approval" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Preview approval" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Sample decision recorded",
  );
  await navigate(page, "Reports");
  await navigate(page, "Approvals");
  await expect(page.getByRole("status")).toContainText(
    "Sample decision recorded: approve",
  );
  await page.getByRole("button", { name: "Reset sample decision" }).click();
  await page.getByRole("button", { name: "Preview rejection" }).click();
  await expect(page.getByRole("status")).toContainText("reject");
  await navigate(page, "Reports");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download JSON report" }).click();
  expect((await download).suggestedFilename()).toContain("sample-checkout");
  await navigate(page, "Settings");
  await page.getByLabel("Workspace name").fill("Incident response");
  await page.getByRole("button", { name: "Save preferences" }).click();
  await expect(page.getByRole("status")).toHaveText(
    "Workspace preferences saved.",
  );
  await page.reload();
  await expect(page.getByLabel("Workspace name")).toHaveValue(
    "Incident response",
  );
  await page.screenshot({
    path: `test-results/settings-${test.info().project.name}.png`,
    fullPage: true,
  });
  if (
    !(await page
      .getByRole("button", { name: "Sign out", exact: true })
      .isVisible())
  )
    await page
      .getByRole("button", { name: "Open workspace navigation" })
      .click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL("/sign-in");
  await page.goto("/dashboard");
  await expect(page).toHaveURL("/sign-in");
  expect(errors).toEqual([]);
});
test("empty workspace, search, mobile layouts, and product accessibility", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await onboard(page, true);
  await expect(
    page.getByRole("heading", { name: "A quiet workspace." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Load sample incident", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Search incidents" })
    .fill("no match");
  await expect(
    page.getByRole("heading", { name: "No matching incidents" }),
  ).toBeVisible();
  await page.getByRole("textbox", { name: "Search incidents" }).fill("");
  await navigate(page, "Incidents");
  await expect(
    page.getByText("Sequential Scan on orders", { exact: false }).first(),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  for (const name of [
    "Overview",
    "Incidents",
    "Approvals",
    "Reports",
    "Connections",
    "Settings",
  ]) {
    await navigate(page, name);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(result.violations).toEqual([]);
    if (name === "Overview")
      await page.screenshot({
        path: `test-results/dashboard-${test.info().project.name}.png`,
        fullPage: true,
      });
  }
});

test("incident evidence fits small phone widths", async ({ page }) => {
  await onboard(page);
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(
      page.getByText("Sequential Scan on orders", { exact: false }).first(),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  }
});

test("analytics modal and incident drawer preserve keyboard navigation", async ({
  page,
}, info) => {
  await onboard(page);
  await navigate(page, "Overview");
  const hydrationErrors: string[] = [];
  page.on("pageerror", (e) => hydrationErrors.push(e.message));
  await page.goto("/dashboard");
  await expect(page.locator(".app-rail")).toHaveCount(0);
  await expect(
    page.getByRole("img", { name: /4 events recorded/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Customize view" }).click();
  const modal = page.getByRole("dialog", { name: "Customize analytics" });
  await expect(modal).toBeVisible();
  const bounds = await modal.boundingBox();
  const viewport = page.viewportSize()!;
  expect(bounds).not.toBeNull();
  expect(
    Math.abs(bounds!.x + bounds!.width / 2 - viewport.width / 2),
  ).toBeLessThanOrEqual(2);
  expect(
    Math.abs(bounds!.y + bounds!.height / 2 - viewport.height / 2),
  ).toBeLessThanOrEqual(2);
  await expect(modal.locator(".analytics-toggle")).toHaveCSS(
    "flex-direction",
    "row",
  );
  await page.screenshot({
    path: `test-results/customize-modal-${info.project.name}.png`,
  });
  await modal.getByRole("checkbox").uncheck();
  await page.keyboard.press("Escape");
  await expect(modal).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Customize view" }),
  ).toBeFocused();
  await expect(page.locator(".analytics-coverage")).toHaveCount(0);
  await page.getByRole("button", { name: /Elevated latency on/ }).click();
  const drawer = page.getByRole("dialog", { name: "Incident details" });
  await expect(drawer).toBeVisible();
  await expect(drawer).toHaveCSS("overflow-y", "hidden");
  await expect(drawer.locator(".overlay-content")).toHaveCSS(
    "overflow-y",
    "auto",
  );
  if (info.project.name === "desktop") {
    await expect(page.locator(".app-sidebar")).toHaveCSS("position", "sticky");
  }
  await expect(
    drawer.getByText("Sequential Scan on orders", { exact: false }).first(),
  ).toBeVisible();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.screenshot({
    path: `test-results/incident-drawer-${info.project.name}.png`,
  });
  await page.keyboard.press("Escape");
  await expect(drawer).toHaveCount(0);
  expect(hydrationErrors).toEqual([]);
  await expect(
    page.locator(".analytics-chart circle title").first(),
  ).toHaveText("09:41:00 UTC · 1 cumulative events");
  await page.evaluate(() => window.scrollTo(0, 0));
  expect(hydrationErrors).toEqual([]);
  await expect(
    page.locator(".analytics-chart circle title").first(),
  ).toHaveText("09:41:00 UTC · 1 cumulative events");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: `test-results/clean-dashboard-${info.project.name}.png`,
    fullPage: true,
  });
});
