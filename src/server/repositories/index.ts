import type { Db } from "@/server/db/client";
import { BillRepository } from "./bill-repo";
import { VariableBudgetRepository } from "./budget-repo";
import { CategoryRepository } from "./category-repo";
import { GoalRepository } from "./goal-repo";
import { HouseholdRepository } from "./household-repo";
import { InviteRepository } from "./invite-repo";
import { SettlementRepository } from "./settlement-repo";
import { AccountRepository, DebtRepository, IncomeSourceRepository, InvestmentAccountRepository } from "./simple-repos";
import { SnapshotRepository } from "./snapshot-repo";
import { TransactionRepository } from "./transaction-repo";

/** Plain constructor wiring, no DI container (section 6.1). */
export function createRepositories(db: Db) {
  return {
    households: new HouseholdRepository(db),
    transactions: new TransactionRepository(db),
    settlements: new SettlementRepository(db),
    bills: new BillRepository(db),
    goals: new GoalRepository(db),
    categories: new CategoryRepository(db),
    snapshots: new SnapshotRepository(db),
    variableBudgets: new VariableBudgetRepository(db),
    incomeSources: new IncomeSourceRepository(db),
    accounts: new AccountRepository(db),
    debts: new DebtRepository(db),
    investmentAccounts: new InvestmentAccountRepository(db),
    invites: new InviteRepository(db),
  };
}

export type Repositories = ReturnType<typeof createRepositories>;
export type { Membership } from "./household-repo";
export type { Invite } from "./invite-repo";
