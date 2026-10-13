import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
const output = "../submission";
await mkdir(output, { recursive: true });
const server = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3101",
  ],
  {
    env: {
      ...process.env,
      SENTINELOPS_E2E: "true",
      DEMO_ACCESS_ENABLED: "true",
      NEXT_PUBLIC_SUPABASE_URL: "",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
    },
    stdio: "ignore",
  },
);
let browser;
try {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch("http://127.0.0.1:3101")).ok) break;
    } catch {}
    if (i === 59) throw new Error("Demo server unavailable");
    await new Promise((r) => setTimeout(r, 500));
  }
  browser = await chromium.launch();
  const setup = await browser.newContext({ baseURL: "http://127.0.0.1:3101" });
  const initial = await setup.newPage();
  await initial.goto("/demo");
  await initial.getByRole("checkbox").check();
  await initial
    .getByRole("button", { name: "Explore sample workspace" })
    .click();
  await initial.getByLabel("Workspace name").fill("SentinelOps demo");
  await initial.getByRole("button", { name: "Continue", exact: true }).click();
  await initial.getByRole("button", { name: "Continue", exact: true }).click();
  await initial.getByRole("button", { name: "Continue", exact: true }).click();
  await initial
    .getByRole("button", { name: "Explore demo investigation" })
    .click();
  await initial.waitForURL("**/dashboard/investigations");
  const context = await browser.newContext({
    baseURL: "http://127.0.0.1:3101",
    storageState: await setup.storageState(),
    viewport: { width: 1280, height: 900 },
    recordVideo: { dir: output, size: { width: 1280, height: 900 } },
  });
  const page = await context.newPage();
  await page.emulateMedia({ reducedMotion: "reduce" });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  async function caption(text, ms = 7000) {
    await page.evaluate((text) => {
      let el = document.getElementById("demo-caption");
      if (!el) {
        el = document.createElement("div");
        el.id = "demo-caption";
        document.body.append(el);
      }
      el.textContent = text;
      el.style.cssText =
        "position:fixed;bottom:16px;left:24px;right:24px;padding:18px 24px;background:#16191ff5;color:#fff;border:1px solid #f6a467;border-radius:12px;z-index:99999;font:600 19px/1.5 system-ui;box-shadow:0 8px 30px #0004;text-align:center";
    }, text);
    await page.waitForTimeout(ms);
  }
  await page.goto("/");
  await caption(
    "SentinelOps AI | neatHack — investigate, review, verify. This recording uses illustrative sample data.",
    8000,
  );
  await page.goto("/dashboard/investigations");
  await caption(
    "Connect query-plan, schema and metric evidence before proposing a repair.",
    9000,
  );
  await page.getByRole("button", { name: "Timeline", exact: true }).click();
  await caption(
    "An incident timeline makes each investigation step inspectable.",
    7000,
  );
  await page.getByRole("button", { name: "Approval", exact: true }).click();
  await caption(
    "Human approval is required. Only one fixed index repair is allowlisted.",
    8000,
  );
  await page.getByRole("button", { name: "Preview approval" }).click();
  await caption(
    "Sample approval records a preview decision. It does not run an agent or alter PostgreSQL.",
    8000,
  );
  await page.getByRole("button", { name: "Recovery", exact: true }).click();
  await caption(
    "Recovery needs proof. No recovery is fabricated in the sample report.",
    7000,
  );
  await page
    .getByRole("navigation", { name: "Workspace navigation" })
    .getByRole("link", { name: "Reports", exact: true })
    .click();
  await caption(
    "The real backend compares latency, result fingerprints and actual index use after approval.",
    8000,
  );
  await caption(
    "124 backend/database tests pass, including approval and rollback. Live AI setup pending; Google account completion pending.",
    8000,
  );
  const video = page.video();
  await context.close();
  await video.saveAs(output + "/SentinelOps-AI-demo.webm");
  await setup.close();
  if (errors.length) throw new Error("Browser errors during recording");
  console.log(
    "Sample demo saved; no backend mutations or external account calls.",
  );
} finally {
  if (browser) await browser.close();
  server.kill();
}
