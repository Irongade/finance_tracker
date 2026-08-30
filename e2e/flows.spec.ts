/**
 * Section 8 flows against the seeded database (pnpm db:reset first).
 * Run with FIXED_TODAY=2026-08-28 on the server so the golden numbers hold.
 */
import { expect, test } from "@playwright/test";

const EMAIL = process.env.SEED_USER1_EMAIL ?? "ade@example.com";
const PASSWORD = process.env.SEED_USER1_PASSWORD ?? "password123";

test.describe.configure({ mode: "serial" });

test("unauthenticated visitors are sent to sign in", async ({ page }) => {
  await page.goto("/goals");
  await expect(page).toHaveURL(/\/login\?next=%2Fgoals$/);
});

test("sign in, golden dashboard, quick-add persists, settle up", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/");

  // section 12 golden values
  await expect(page.getByText("£2,155 left this month, as budgeted.")).toBeVisible();
  await expect(page.getByText("Ade owes P £27.50", { exact: true })).toBeVisible();
  await expect(page.getByText("5 overdue")).toBeVisible();
  await expect(page.getByText("Behind by £58").first()).toBeVisible();

  // flow 1: log a shared £20 paid by Ade
  await page.getByRole("button", { name: "Log spending" }).first().click();
  await page.getByLabel("Amount").fill("20");
  await page.getByLabel("Description").fill("E2E takeaway");
  await page.getByRole("combobox", { name: "Category" }).click();
  await page.getByRole("option", { name: "Eating out" }).click();
  await page.getByRole("radio", { name: /Ade/ }).click();
  await page.getByLabel("Shared cost").click();
  const posted = page.waitForResponse((r) => r.url().endsWith("/api/transactions") && r.request().method() === "POST");
  await page.getByRole("button", { name: "Log spending" }).last().click();
  await expect(page.getByText("Logged", { exact: true }).first()).toBeVisible(); // optimistic toast
  await expect(page.getByText("Ade owes P £17.50", { exact: true })).toBeVisible();
  expect((await posted).status()).toBe(201);

  // persisted: a full reload comes back from Postgres
  await page.reload();
  await expect(page.getByText("Ade owes P £17.50", { exact: true })).toBeVisible();
  await page.goto("/transactions");
  await expect(page.getByText("E2E takeaway")).toBeVisible();

  // flow 3: settle up
  await page.goto("/");
  await page.getByRole("button", { name: "Settle up" }).click();
  const settled = page.waitForResponse((r) => r.url().endsWith("/api/settlements") && r.request().method() === "POST");
  await page.getByRole("button", { name: "Record payment" }).click();
  await expect(page.getByText("All square", { exact: true })).toBeVisible();
  expect((await settled).status()).toBe(201);
  await page.reload();
  await expect(page.getByText("All square", { exact: true })).toBeVisible();

  // tidy up: delete the e2e transaction so the golden state returns (the settlement stays as history)
  await page.goto("/transactions");
  await page.getByRole("button", { name: "Actions for E2E takeaway" }).click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  const deleted = page.waitForResponse(
    (r) => r.url().includes("/api/transactions/") && r.request().method() === "DELETE",
  );
  await page.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("E2E takeaway")).toHaveCount(0);
  expect((await deleted).status()).toBe(200);

  // ...and the settlement, so the golden state is back for the next project
  const list = (await (await page.request.get("/api/settlements")).json()) as { settlements: { id: string }[] };
  for (const s of list.settlements) expect((await page.request.delete(`/api/settlements/${s.id}`)).status()).toBe(200);
  await page.goto("/");
  await expect(page.getByText("Ade owes P £27.50", { exact: true })).toBeVisible();
});

test("month-end snapshot flow", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/");
  await page.goto("/pots");
  await expect(page.getByText("£7,550 across 6 pots at the latest count.")).toBeVisible();
  const first = page.getByLabel(/Ade's LISA balance for/);
  await first.fill("2500");
  const saved = page.waitForResponse((r) => r.url().endsWith("/api/pot-snapshots") && r.request().method() === "PUT");
  await page.getByRole("button", { name: "Save snapshot" }).click();
  await expect(page.getByText("Snapshot saved", { exact: true }).first()).toBeVisible();
  expect((await saved).status()).toBe(200);
  await page.reload();
  await expect(page.getByText("£7,650 across 6 pots at the latest count.")).toBeVisible();
  await first.fill("2400");
  const restored = page.waitForResponse(
    (r) => r.url().endsWith("/api/pot-snapshots") && r.request().method() === "PUT",
  );
  await page.getByRole("button", { name: "Save snapshot" }).click();
  expect((await restored).status()).toBe(200);
});
