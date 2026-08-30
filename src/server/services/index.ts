import { type Db, getDb } from "@/server/db/client";
import { createRepositories } from "@/server/repositories";
import { BillService } from "./bill-service";
import {
  AccountService,
  BudgetService,
  CategoryService,
  DebtService,
  IncomeSourceService,
  InvestmentService,
} from "./catalogue-services";
import { defaultClock, type ServiceDeps } from "./context";
import { GoalService } from "./goal-service";
import { HouseholdService } from "./household-service";
import { ImportService } from "./import-service";
import { SettleUpService } from "./settle-up-service";
import { SnapshotService } from "./snapshot-service";
import { TransactionService } from "./transaction-service";

export function createServices(db: Db, clock = defaultClock) {
  const deps: ServiceDeps = { db, repos: createRepositories(db), clock };
  return {
    deps,
    households: new HouseholdService(deps),
    transactions: new TransactionService(deps),
    settleUp: new SettleUpService(deps),
    bills: new BillService(deps),
    goals: new GoalService(deps),
    snapshots: new SnapshotService(deps),
    categories: new CategoryService(deps),
    incomeSources: new IncomeSourceService(deps),
    accounts: new AccountService(deps),
    debts: new DebtService(deps),
    investments: new InvestmentService(deps),
    budgets: new BudgetService(deps),
    imports: new ImportService(deps),
  };
}

export type Services = ReturnType<typeof createServices>;

const globalForServices = globalThis as unknown as { __financeServices?: Services };

/** Process-wide singleton for route handlers and server components. */
export function getServices(): Services {
  if (!globalForServices.__financeServices) globalForServices.__financeServices = createServices(getDb());
  return globalForServices.__financeServices;
}

export type { Mutation } from "./context";
