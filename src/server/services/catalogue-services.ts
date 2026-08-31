/**
 * The smaller aggregates: categories, income sources, everyday accounts, debts,
 * investment accounts, variable budgets. Same create / replace / delete shape.
 */
import type { DebtInput, InvestmentAccountInput } from "@/domain/schemas";
import type {
  Account,
  Category,
  CategoryType,
  Debt,
  IncomeSource,
  InvestmentAccount,
  Owner,
  VariableBudget,
} from "@/domain/types";
import { ConflictError, DomainRuleError, NotFoundError } from "@/server/errors";
import { assertMember, loadHousehold, type Mutation, mutate, type ServiceDeps } from "./context";

export class CategoryService {
  constructor(private readonly deps: ServiceDeps) {}

  async create(householdId: string, input: { name: string; type: CategoryType }): Promise<Mutation<Category>> {
    const name = input.name.trim();
    if (!name) throw new DomainRuleError("Name the category", "name");
    const clash = await this.deps.repos.categories.findByName(householdId, name);
    if (clash) throw new ConflictError("That category already exists");
    const existing = await this.deps.repos.categories.list(householdId);
    return mutate(this.deps, householdId, (tx) =>
      this.deps.repos.categories.insert(
        householdId,
        { name, type: input.type, sort: existing.length + 1, archived: false },
        tx,
      ),
    );
  }

  async update(
    householdId: string,
    id: string,
    input: { name?: string; type?: CategoryType; archived?: boolean; sort?: number },
  ): Promise<Mutation<Category>> {
    const existing = await this.deps.repos.categories.findById(householdId, id);
    if (!existing) throw new NotFoundError("category", id);
    const name = input.name?.trim() ?? existing.name;
    if (!name) throw new DomainRuleError("Name the category", "name");
    if (name.toLowerCase() !== existing.name.toLowerCase()) {
      const clash = await this.deps.repos.categories.findByName(householdId, name);
      if (clash) throw new ConflictError("That category already exists");
    }
    return mutate(this.deps, householdId, async (tx) => {
      const updated = await this.deps.repos.categories.update(householdId, { ...existing, ...input, name }, tx);
      if (!updated) throw new NotFoundError("category", id);
      return updated;
    });
  }

  /** Deleting is blocked when in use; archive instead (section 7.4). */
  async delete(householdId: string, id: string): Promise<Mutation<null>> {
    const usage = await this.deps.repos.categories.countUsage(householdId, id);
    if (usage > 0)
      throw new DomainRuleError(
        `This category is used by ${usage} ${usage === 1 ? "row" : "rows"}. Archive it instead.`,
      );
    return mutate(this.deps, householdId, async (tx) => {
      await this.deps.repos.variableBudgets.deleteAllForCategory(householdId, id, tx);
      const ok = await this.deps.repos.categories.delete(householdId, id, tx);
      if (!ok) throw new NotFoundError("category", id);
      return null;
    });
  }
}

export class IncomeSourceService {
  constructor(private readonly deps: ServiceDeps) {}

  async create(householdId: string, input: Omit<IncomeSource, "id">): Promise<Mutation<IncomeSource>> {
    const h = await loadHousehold(this.deps, householdId);
    assertMember(h, input.userId);
    if (input.monthlyPence < 0) throw new DomainRuleError("Income can't be negative", "monthlyPence");
    return mutate(this.deps, householdId, (tx) => this.deps.repos.incomeSources.insert(householdId, input, tx));
  }

  async update(householdId: string, id: string, input: Omit<IncomeSource, "id">): Promise<Mutation<IncomeSource>> {
    const h = await loadHousehold(this.deps, householdId);
    assertMember(h, input.userId);
    if (input.monthlyPence < 0) throw new DomainRuleError("Income can't be negative", "monthlyPence");
    return mutate(this.deps, householdId, async (tx) => {
      const updated = await this.deps.repos.incomeSources.update(householdId, { id, ...input }, tx);
      if (!updated) throw new NotFoundError("income source", id);
      return updated;
    });
  }

  async delete(householdId: string, id: string): Promise<Mutation<null>> {
    return mutate(this.deps, householdId, async (tx) => {
      const ok = await this.deps.repos.incomeSources.delete(householdId, id, tx);
      if (!ok) throw new NotFoundError("income source", id);
      return null;
    });
  }
}

export class AccountService {
  constructor(private readonly deps: ServiceDeps) {}

  async create(householdId: string, input: Omit<Account, "id">): Promise<Mutation<Account>> {
    const h = await loadHousehold(this.deps, householdId);
    if (input.owner.kind === "user") assertMember(h, input.owner.userId, "owner");
    return mutate(this.deps, householdId, (tx) => this.deps.repos.accounts.insert(householdId, input, tx));
  }

  async update(householdId: string, id: string, input: Omit<Account, "id">): Promise<Mutation<Account>> {
    const h = await loadHousehold(this.deps, householdId);
    if (input.owner.kind === "user") assertMember(h, input.owner.userId, "owner");
    return mutate(this.deps, householdId, async (tx) => {
      const updated = await this.deps.repos.accounts.update(householdId, { id, ...input }, tx);
      if (!updated) throw new NotFoundError("account", id);
      return updated;
    });
  }

  async delete(householdId: string, id: string): Promise<Mutation<null>> {
    return mutate(this.deps, householdId, async (tx) => {
      const ok = await this.deps.repos.accounts.delete(householdId, id, tx);
      if (!ok) throw new NotFoundError("account", id);
      return null;
    });
  }
}

export class DebtService {
  constructor(private readonly deps: ServiceDeps) {}

  async create(householdId: string, input: DebtInput): Promise<Mutation<Debt>> {
    const h = await loadHousehold(this.deps, householdId);
    assertMember(h, input.ownerUserId, "ownerUserId");
    return mutate(this.deps, householdId, (tx) => this.deps.repos.debts.insert(householdId, input, tx));
  }

  async update(householdId: string, id: string, input: DebtInput): Promise<Mutation<Debt>> {
    const h = await loadHousehold(this.deps, householdId);
    assertMember(h, input.ownerUserId, "ownerUserId");
    return mutate(this.deps, householdId, async (tx) => {
      const updated = await this.deps.repos.debts.update(householdId, { id, ...input }, tx);
      if (!updated) throw new NotFoundError("debt", id);
      return updated;
    });
  }

  async delete(householdId: string, id: string): Promise<Mutation<null>> {
    return mutate(this.deps, householdId, async (tx) => {
      const ok = await this.deps.repos.debts.delete(householdId, id, tx);
      if (!ok) throw new NotFoundError("debt", id);
      return null;
    });
  }
}

export class InvestmentService {
  constructor(private readonly deps: ServiceDeps) {}

  async create(householdId: string, input: InvestmentAccountInput): Promise<Mutation<InvestmentAccount>> {
    const h = await loadHousehold(this.deps, householdId);
    if (input.owner.kind === "user") assertMember(h, input.owner.userId, "owner");
    return mutate(this.deps, householdId, (tx) =>
      this.deps.repos.investmentAccounts.insert(
        householdId,
        { ...input, notes: input.notes?.trim() || null, archived: false },
        tx,
      ),
    );
  }

  async update(
    householdId: string,
    id: string,
    input: Partial<InvestmentAccountInput> & { archived?: boolean },
  ): Promise<Mutation<InvestmentAccount>> {
    const h = await loadHousehold(this.deps, householdId);
    const existing = h.investmentAccounts.find((a) => a.id === id);
    if (!existing) throw new NotFoundError("investment account", id);
    const merged: InvestmentAccount = {
      ...existing,
      ...input,
      notes: input.notes === undefined ? existing.notes : input.notes?.trim() || null,
    };
    if (merged.owner.kind === "user") assertMember(h, merged.owner.userId, "owner");
    if (merged.expectedGrowth < -0.5 || merged.expectedGrowth > 0.5)
      throw new DomainRuleError("Expected growth is between -50% and 50%", "expectedGrowth");
    if (merged.contributedBeforePence < 0) throw new DomainRuleError("Can't be negative", "contributedBeforePence");
    return mutate(this.deps, householdId, async (tx) => {
      const updated = await this.deps.repos.investmentAccounts.update(householdId, merged, tx);
      if (!updated) throw new NotFoundError("investment account", id);
      return updated;
    });
  }

  async delete(householdId: string, id: string): Promise<Mutation<null>> {
    return mutate(this.deps, householdId, async (tx) => {
      const ok = await this.deps.repos.investmentAccounts.delete(householdId, id, tx);
      if (!ok) throw new NotFoundError("investment account", id);
      return null;
    });
  }
}

export class BudgetService {
  constructor(private readonly deps: ServiceDeps) {}

  async setVariableBudget(
    householdId: string,
    categoryId: string,
    owner: Owner,
    monthlyPence: number,
  ): Promise<Mutation<VariableBudget>> {
    if (!Number.isInteger(monthlyPence) || monthlyPence < 0)
      throw new DomainRuleError("Budgets are whole pence, £0 or more", "monthlyPence");
    const category = await this.deps.repos.categories.findById(householdId, categoryId);
    if (!category) throw new NotFoundError("category", categoryId);
    if (category.type !== "variable")
      throw new DomainRuleError(
        "Only variable categories take a budget; fixed budgets come from the bills",
        "categoryId",
      );
    if (owner.kind === "user") {
      const h = await loadHousehold(this.deps, householdId);
      assertMember(h, owner.userId, "owner");
    }
    return mutate(this.deps, householdId, (tx) =>
      this.deps.repos.variableBudgets.upsert(householdId, categoryId, owner, monthlyPence, tx),
    );
  }
}
