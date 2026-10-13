import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("marketing preview, FAQ, and keyboard workflow work without backend mutations", async ({
  page,
}) => {
  const mutations: string[] = [];
  const errors: string[] = [];
  page.on("request", (r) => {
    if (
      !["GET", "HEAD"].includes(r.method()) ||
      r.url().includes("/incidents/")
    )
      mutations.push(r.url());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Understand every incident before you act",
  );
  const visual = page.getByRole("img", {
    name: "SentinelOps sample dashboard with incident evidence, human review, and investigation analytics",
  });
  await expect(visual).toBeVisible();
  expect(
    await visual.evaluate(
      (image: HTMLImageElement) => image.complete && image.naturalWidth > 0,
    ),
  ).toBeTruthy();
  await expect(
    page.getByText("Illustrative sample data · no infrastructure changes"),
  ).toBeVisible();
  await page
    .locator("summary")
    .filter({ hasText: "Does the agent make changes on its own?" })
    .click();
  await expect(
    page.getByText("No. Investigation uses bounded read-only database tools.", {
      exact: false,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Inspect the query plan" }).click();
  await expect(
    page.getByRole("region", { name: "Connect the evidence" }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Review the diagnosis" }).click();
  await expect(
    page.getByRole("region", { name: "Stop at the boundary" }),
  ).toContainText("This illustration cannot execute a repair");
  await page.getByRole("button", { name: "Explore verification" }).click();
  await expect(
    page.getByRole("region", { name: "Prove the recovery" }),
  ).toContainText("Failed verification rolls back");
  expect(mutations).toEqual([]);
  expect(errors).toEqual([]);
  await page.screenshot({
    path: `test-results/landing-${test.info().project.name}.png`,
    fullPage: true,
  });
});

test("navigation and account routes have recoverable states", async ({
  page,
}, info) => {
  await page.goto("/");
  if (info.project.name === "desktop")
    await page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("link", { name: "Resources", exact: true })
      .click();
  else {
    await page.getByRole("button", { name: "Open navigation" }).click();
    await page
      .getByRole("navigation", { name: "Mobile navigation" })
      .getByRole("link", { name: "Resources", exact: true })
      .click();
  }
  await expect(page).toHaveURL("/docs");
  await expect(
    page.getByRole("heading", { name: "A real workflow. On your machine." }),
  ).toBeVisible();
  await page.goto("/sign-in?error=confirmation");
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: /invalid or expired|not configured/ }),
  ).toContainText("invalid or expired");
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute(
    "type",
    "password",
  );
  await page.getByRole("button", { name: "Show password" }).click();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute(
    "type",
    "text",
  );
  await page.getByRole("link", { name: "Forgot password?" }).click();
  await expect(page).toHaveURL("/forgot-password");
  await page.getByLabel("Email address").fill("engineer@example.com");
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: /invalid or expired|not configured/ }),
  ).toContainText("not configured");
  const res = await page.goto("/not-a-real-page");
  expect(res?.status()).toBe(404);
});

test("public pages pass accessibility and fit narrow and wide viewports", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const url of [
    "/",
    "/docs",
    "/sign-in",
    "/sign-up",
    "/forgot-password",
    "/reset-password",
    "/demo",
  ]) {
    await page.goto(url);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(result.violations).toEqual([]);
  }
  for (const width of [320, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    await page.screenshot({
      path: `test-results/hero-${width}-${test.info().project.name}.png`,
    });
  }
});

test("reference hero composition at requested viewport widths", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop", "Viewport sweep runs once.");
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [390, 768, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    const preview = page.locator(".centered-hero-preview");
    const box = await preview.boundingBox();
    expect(box!.width / width).toBeGreaterThan(0.79);
    expect(box!.width / width).toBeLessThan(0.93);
    if (width >= 1440) {
      const heading = await page.locator("h1").evaluate((el) => ({
        height: el.getBoundingClientRect().height,
        lineHeight: parseFloat(getComputedStyle(el).lineHeight),
      }));
      expect(Math.round(heading.height / heading.lineHeight)).toBe(2);
    } else {
      await page.getByRole("button", { name: "Open navigation" }).click();
      expect(
        (
          await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
            .analyze()
        ).violations,
      ).toEqual([]);
      await page.keyboard.press("Escape");
      await expect(
        page.getByRole("button", { name: "Open navigation" }),
      ).toBeFocused();
    }
    await page.screenshot({ path: `test-results/reference-hero-${width}.png` });
    await preview.screenshot({
      path: `test-results/reference-preview-${width}.png`,
    });
    await page
      .locator(".centered-hero-actions")
      .getByRole("link", { name: "View Demo" })
      .click();
    await expect(page).toHaveURL(/#product$/);
    await expect(page.locator("#product")).toBeInViewport();
  }
});

test("marketing buttons remain readable and stable on hover and keyboard focus", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop", "Mouse states run on desktop.");
  await page.goto("/");
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const selector of [
    ".centered-hero-actions .button-primary",
    ".centered-hero-actions .button-secondary",
    ".closing-cta .button-primary",
    ".closing-cta .button-secondary",
    ".trace-next",
  ]) {
    const button = page.locator(selector).filter({ visible: true }).first();
    await button.scrollIntoViewIfNeeded();
    const before = await button.boundingBox();
    await button.hover();
    expect(await button.boundingBox()).toEqual(before);
    expect(
      (
        await new AxeBuilder({ page })
          .include(selector)
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await button.focus();
    await expect(button).toBeFocused();
    expect(
      (
        await new AxeBuilder({ page })
          .include(selector)
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
  }
});

test("Google access is visible without configuration and cancelled OAuth is recoverable", async ({
  page,
}) => {
  for (const route of ["/sign-in", "/sign-up"]) {
    await page.goto(route);
    await expect(
      page.getByRole("button", { name: "Continue with Google" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Continue with Google" }),
    ).toBeDisabled();
  }
  await page.goto(
    "/auth/callback?error=access_denied&error_description=private-provider-message",
  );
  await expect(page).toHaveURL("/sign-in?error=oauth&reason=cancelled");
  await expect(
    page.getByRole("alert").filter({ hasText: "Google sign-in was cancelled" }),
  ).toBeVisible();
  await expect(page.locator("body")).not.toContainText(
    "private-provider-message",
  );
});
