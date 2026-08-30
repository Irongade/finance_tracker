/**
 * Dev seed (section 11): two accounts, one household, the v2 workbook imported.
 *   pnpm db:seed            -> seeds an empty database
 *   pnpm db:seed -- --reset -> wipes every table first (development only)
 */
import { readFileSync } from "node:fs";
import { config } from "dotenv";

config({ path: [".env.local", ".env"] });

async function main() {
  const reset = process.argv.includes("--reset");
  const [{ getDb }, { auth }, { getServices }, { parseWorkbook }, { sql }] = await Promise.all([
    import("@/server/db/client"),
    import("@/server/auth/auth"),
    import("@/server/services"),
    import("@/server/import/workbook"),
    import("drizzle-orm"),
  ]);
  const db = getDb();

  if (reset) {
    if (process.env.NODE_ENV === "production") throw new Error("Refusing to reset a production database");
    await db.execute(sql`
      truncate table transactions, settlements, pot_snapshots, investment_snapshots, net_worth_snapshots, goal_pledges, goals, bills,
        variable_budgets, categories, income_sources, accounts, debts, investment_accounts, invites, settings, household_members, households,
        auth_rate_limit, auth_verification, auth_account, auth_session, auth_user cascade`);
    console.log("database reset");
  }

  const [{ n }] = (await db.execute(sql`select count(*)::int as n from auth_user`)).rows as { n: number }[];
  if (n > 0) {
    console.log(`database already has ${n} account(s); run with --reset to start over`);
    return;
  }

  const services = getServices();
  const u1 = {
    email: process.env.SEED_USER1_EMAIL ?? "ade@example.com",
    password: process.env.SEED_USER1_PASSWORD ?? "password123",
    name: "Ade",
  };
  const u2 = {
    email: process.env.SEED_USER2_EMAIL ?? "p@example.com",
    password: process.env.SEED_USER2_PASSWORD ?? "password123",
    name: "P",
  };

  const first = await auth.api.signUpEmail({ body: u1 });
  const membership = await services.households.create(first.user.id, {
    name: "Ade & P",
    member1Name: "Ade",
    member2Name: "P",
  });
  console.log(`household ${membership.householdId} created for ${u1.email}`);

  const workbookPath = process.env.SEED_WORKBOOK ?? "data/Ade_P_Finance_Tracker_v2.xlsx";
  const data = parseWorkbook(new Uint8Array(readFileSync(workbookPath)));
  const imported = await services.imports.importWorkbook(membership.householdId, data);
  console.log("imported", imported.result);

  const invite = await services.households.createInvite(membership.householdId, membership.memberId);
  const second = await auth.api.signUpEmail({
    body: u2,
    headers: new Headers({ cookie: `ap_invite=${invite.token}` }),
  });
  const linked = await services.households.membershipFor(second.user.id);
  if (!linked) {
    // the hook did not run in this context; bind the seat directly
    await services.households.acceptInvite(invite.token, second.user.id);
  }
  console.log(`${u2.email} joined as member 2`);

  const view = imported.view;
  console.log(
    `dashboard check: leftover £${view.budget.leftoverPence / 100}, settle-up net ${view.settleUp.netPence}p, overdue ${view.bills.overdueCount}`,
  );
  await db.$client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
