/**
 * Aggregates with plain create / replace / delete semantics: income sources,
 * everyday accounts, debts, investment accounts.
 */
import { and, asc, eq } from "drizzle-orm";
import type { Account, Debt, IncomeSource, InvestmentAccount } from "@/domain/types";
import type { Db, DbHandle } from "@/server/db/client";
import * as s from "@/server/db/schema";
import {
  accountToRow,
  debtToRow,
  investmentAccountToRow,
  rowToAccount,
  rowToDebt,
  rowToIncomeSource,
  rowToInvestmentAccount,
} from "./mappers";

export class IncomeSourceRepository {
  constructor(private readonly db: Db) {}

  async list(householdId: string, h: DbHandle = this.db): Promise<IncomeSource[]> {
    const rows = await h
      .select()
      .from(s.incomeSources)
      .where(eq(s.incomeSources.householdId, householdId))
      .orderBy(asc(s.incomeSources.createdAt));
    return rows.map(rowToIncomeSource);
  }

  async insert(householdId: string, input: Omit<IncomeSource, "id">, h: DbHandle = this.db): Promise<IncomeSource> {
    const [r] = await h
      .insert(s.incomeSources)
      .values({ householdId, memberId: input.userId, name: input.name, monthlyPence: input.monthlyPence })
      .returning();
    if (!r) throw new Error("income source insert returned nothing");
    return rowToIncomeSource(r);
  }

  async update(householdId: string, src: IncomeSource, h: DbHandle = this.db): Promise<IncomeSource | null> {
    const [r] = await h
      .update(s.incomeSources)
      .set({ memberId: src.userId, name: src.name, monthlyPence: src.monthlyPence })
      .where(and(eq(s.incomeSources.id, src.id), eq(s.incomeSources.householdId, householdId)))
      .returning();
    return r ? rowToIncomeSource(r) : null;
  }

  async delete(householdId: string, id: string, h: DbHandle = this.db): Promise<boolean> {
    const rows = await h
      .delete(s.incomeSources)
      .where(and(eq(s.incomeSources.id, id), eq(s.incomeSources.householdId, householdId)))
      .returning({ id: s.incomeSources.id });
    return rows.length === 1;
  }
}

export class AccountRepository {
  constructor(private readonly db: Db) {}

  async list(householdId: string, h: DbHandle = this.db): Promise<Account[]> {
    const rows = await h
      .select()
      .from(s.accounts)
      .where(eq(s.accounts.householdId, householdId))
      .orderBy(asc(s.accounts.createdAt));
    return rows.map(rowToAccount);
  }

  async insert(householdId: string, input: Omit<Account, "id">, h: DbHandle = this.db): Promise<Account> {
    const [r] = await h.insert(s.accounts).values(accountToRow(householdId, input)).returning();
    if (!r) throw new Error("account insert returned nothing");
    return rowToAccount(r);
  }

  async update(householdId: string, account: Account, h: DbHandle = this.db): Promise<Account | null> {
    const [r] = await h
      .update(s.accounts)
      .set(accountToRow(householdId, account))
      .where(and(eq(s.accounts.id, account.id), eq(s.accounts.householdId, householdId)))
      .returning();
    return r ? rowToAccount(r) : null;
  }

  async delete(householdId: string, id: string, h: DbHandle = this.db): Promise<boolean> {
    const rows = await h
      .delete(s.accounts)
      .where(and(eq(s.accounts.id, id), eq(s.accounts.householdId, householdId)))
      .returning({ id: s.accounts.id });
    return rows.length === 1;
  }
}

export class DebtRepository {
  constructor(private readonly db: Db) {}

  async list(householdId: string, h: DbHandle = this.db): Promise<Debt[]> {
    const rows = await h
      .select()
      .from(s.debts)
      .where(eq(s.debts.householdId, householdId))
      .orderBy(asc(s.debts.createdAt));
    return rows.map(rowToDebt);
  }

  async insert(householdId: string, input: Omit<Debt, "id">, h: DbHandle = this.db): Promise<Debt> {
    const [r] = await h.insert(s.debts).values(debtToRow(householdId, input)).returning();
    if (!r) throw new Error("debt insert returned nothing");
    return rowToDebt(r);
  }

  async update(householdId: string, debt: Debt, h: DbHandle = this.db): Promise<Debt | null> {
    const [r] = await h
      .update(s.debts)
      .set(debtToRow(householdId, debt))
      .where(and(eq(s.debts.id, debt.id), eq(s.debts.householdId, householdId)))
      .returning();
    return r ? rowToDebt(r) : null;
  }

  async delete(householdId: string, id: string, h: DbHandle = this.db): Promise<boolean> {
    const rows = await h
      .delete(s.debts)
      .where(and(eq(s.debts.id, id), eq(s.debts.householdId, householdId)))
      .returning({ id: s.debts.id });
    return rows.length === 1;
  }
}

export class InvestmentAccountRepository {
  constructor(private readonly db: Db) {}

  async list(householdId: string, h: DbHandle = this.db): Promise<InvestmentAccount[]> {
    const rows = await h
      .select()
      .from(s.investmentAccounts)
      .where(eq(s.investmentAccounts.householdId, householdId))
      .orderBy(asc(s.investmentAccounts.createdAt));
    return rows.map(rowToInvestmentAccount);
  }

  async findById(householdId: string, id: string, h: DbHandle = this.db): Promise<InvestmentAccount | null> {
    const [r] = await h
      .select()
      .from(s.investmentAccounts)
      .where(and(eq(s.investmentAccounts.id, id), eq(s.investmentAccounts.householdId, householdId)))
      .limit(1);
    return r ? rowToInvestmentAccount(r) : null;
  }

  async insert(
    householdId: string,
    input: Omit<InvestmentAccount, "id">,
    h: DbHandle = this.db,
  ): Promise<InvestmentAccount> {
    const [r] = await h.insert(s.investmentAccounts).values(investmentAccountToRow(householdId, input)).returning();
    if (!r) throw new Error("investment account insert returned nothing");
    return rowToInvestmentAccount(r);
  }

  async update(
    householdId: string,
    account: InvestmentAccount,
    h: DbHandle = this.db,
  ): Promise<InvestmentAccount | null> {
    const [r] = await h
      .update(s.investmentAccounts)
      .set(investmentAccountToRow(householdId, account))
      .where(and(eq(s.investmentAccounts.id, account.id), eq(s.investmentAccounts.householdId, householdId)))
      .returning();
    return r ? rowToInvestmentAccount(r) : null;
  }

  async delete(householdId: string, id: string, h: DbHandle = this.db): Promise<boolean> {
    const rows = await h
      .delete(s.investmentAccounts)
      .where(and(eq(s.investmentAccounts.id, id), eq(s.investmentAccounts.householdId, householdId)))
      .returning({ id: s.investmentAccounts.id });
    return rows.length === 1;
  }
}
