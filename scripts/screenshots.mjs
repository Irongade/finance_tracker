/**
 * Visual smoke: screenshot every route at phone and desktop widths, exercise
 * the quick-add sheet and settle-up dialog, and fail on console errors.
 * Usage: BASE_URL=http://localhost:3100 node scripts/screenshots.mjs
 */
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const OUT = "screenshots";
const ROUTES = [
  "/dashboard",
  "/transactions",
  "/bills",
  "/goals",
  "/my-money",
  "/budgets",
  "/pots",
  "/investments",
  "/forecast",
  "/debts",
  "/net-worth",
  "/settings",
  "/help",
  "/more",
  "/login",
  "/register",
  "/invite",
  "/onboarding",
];
const VIEWPORTS = { mobile: { width: 390, height: 844 }, desktop: { width: 1280, height: 900 } };

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const errors = [];

for (const [name, viewport] of Object.entries(VIEWPORTS)) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    isMobile: name === "mobile",
    hasTouch: name === "mobile",
  });
  const page = await context.newPage();
  // real sign-in against the seeded database
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.getByLabel("Email").fill(process.env.SEED_USER1_EMAIL ?? "ade@example.com");
  await page.getByLabel("Password", { exact: true }).fill(process.env.SEED_USER1_PASSWORD ?? "password123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(`${BASE}/dashboard`);
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`[${name}] ${page.url()}: ${msg.text()}`);
  });
  page.on("pageerror", (err) => errors.push(`[${name}] ${page.url()}: ${err.message}`));

  for (const route of ROUTES) {
    await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(400);
    const slug = route === "/" ? "dashboard" : route.slice(1).replace(/\//g, "-");
    await page.screenshot({ path: `${OUT}/${name}-${slug}.png`, fullPage: true, animations: "disabled" });
  }

  // quick-add sheet
  await page.goto(`${BASE}/transactions`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Log spending" }).first().click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/${name}-quick-add.png`, animations: "disabled" });
  await page.getByLabel("Amount").fill("20");
  await page.getByLabel("Description").fill("Takeaway");
  await page.getByRole("combobox", { name: "Category" }).click();
  await page.getByRole("option", { name: "Eating out" }).click();
  await page.getByRole("radio", { name: /Ade/ }).click();
  await page.getByLabel("Shared cost").click();
  await page.getByRole("button", { name: "Log spending" }).last().click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/${name}-after-quick-add.png`, fullPage: true, animations: "disabled" });

  // dashboard reflects it, then settle up
  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  await page
    .getByRole("button", { name: /Settle up|Record a payment/ })
    .first()
    .click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/${name}-settle-up.png`, animations: "disabled" });
  await page.getByRole("button", { name: "Record payment" }).click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/${name}-after-settle.png`, fullPage: true, animations: "disabled" });

  await context.close();
}

await browser.close();
if (errors.length) {
  console.error(`\n${errors.length} console/page errors:\n${errors.join("\n")}`);
  process.exit(1);
}
console.log(`ok: screenshots written to ${OUT}/`);
