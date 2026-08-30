import type { InvestmentSnapshot, ISOMonth, NetWorthSnapshot, PotSnapshot } from "@/domain/types";
import { computeHouseholdView } from "@/server/calc";
import { DomainRuleError, NotFoundError } from "@/server/errors";
import { loadHousehold, type Mutation, mutate, type ServiceDeps } from "./context";

const isMonth = (m: string) => /^\d{4}-\d{2}-01$/.test(m);

/** Month-end snapshots for pots, investments and net worth (flow 2). One row per month, upserted. */
export class SnapshotService {
  constructor(private readonly deps: ServiceDeps) {}

  async savePots(
    householdId: string,
    month: ISOMonth,
    balances: Record<string, number>,
  ): Promise<Mutation<PotSnapshot[]>> {
    if (!isMonth(month)) throw new DomainRuleError("Month must be the first of a month", "month");
    const h = await loadHousehold(this.deps, householdId);
    for (const [goalId, pence] of Object.entries(balances)) {
      if (!h.goals.some((g) => g.id === goalId)) throw new DomainRuleError("Unknown goal", "values");
      if (!Number.isInteger(pence) || pence < 0)
        throw new DomainRuleError("Balances must be whole pence, £0 or more", "values");
    }
    return mutate(this.deps, householdId, (tx) =>
      this.deps.repos.snapshots.upsertPots(householdId, month, balances, tx),
    );
  }

  async deletePot(householdId: string, id: string): Promise<Mutation<null>> {
    return mutate(this.deps, householdId, async (tx) => {
      const ok = await this.deps.repos.snapshots.deletePot(householdId, id, tx);
      if (!ok) throw new NotFoundError("pot snapshot", id);
      return null;
    });
  }

  async saveInvestments(
    householdId: string,
    month: ISOMonth,
    values: Record<string, number>,
  ): Promise<Mutation<InvestmentSnapshot[]>> {
    if (!isMonth(month)) throw new DomainRuleError("Month must be the first of a month", "month");
    const h = await loadHousehold(this.deps, householdId);
    for (const [accountId, pence] of Object.entries(values)) {
      if (!h.investmentAccounts.some((a) => a.id === accountId))
        throw new DomainRuleError("Unknown investment account", "values");
      if (!Number.isInteger(pence) || pence < 0)
        throw new DomainRuleError("Values must be whole pence, £0 or more", "values");
    }
    return mutate(this.deps, householdId, (tx) =>
      this.deps.repos.snapshots.upsertInvestments(householdId, month, values, tx),
    );
  }

  async deleteInvestment(householdId: string, id: string): Promise<Mutation<null>> {
    return mutate(this.deps, householdId, async (tx) => {
      const ok = await this.deps.repos.snapshots.deleteInvestment(householdId, id, tx);
      if (!ok) throw new NotFoundError("investment snapshot", id);
      return null;
    });
  }

  /** Appends this month's household net worth (or an explicit figure) to the history. */
  async saveNetWorth(householdId: string, month: ISOMonth, valuePence?: number): Promise<Mutation<NetWorthSnapshot>> {
    if (!isMonth(month)) throw new DomainRuleError("Month must be the first of a month", "month");
    const h = await loadHousehold(this.deps, householdId);
    const value = valuePence ?? Math.round(computeHouseholdView(h, this.deps.clock()).netWorth.totalPence);
    return mutate(this.deps, householdId, (tx) =>
      this.deps.repos.snapshots.upsertNetWorth(householdId, month, value, tx),
    );
  }

  async deleteNetWorth(householdId: string, id: string): Promise<Mutation<null>> {
    return mutate(this.deps, householdId, async (tx) => {
      const ok = await this.deps.repos.snapshots.deleteNetWorth(householdId, id, tx);
      if (!ok) throw new NotFoundError("net worth snapshot", id);
      return null;
    });
  }
}
