import type { TransactionInput } from "@/domain/schemas";
import type { ISOMonth, Transaction } from "@/domain/types";
import { DomainRuleError, NotFoundError } from "@/server/errors";
import { assertMember, loadHousehold, type Mutation, mutate, type ServiceDeps } from "./context";

/**
 * Transactions. Invariants (section 9): the category belongs to the household
 * and is active for new rows; paid_by = user needs a member; transfers carry no
 * sharing; a transaction links to at most one of bill / goal / investment, and
 * the linked entity must be the household's.
 */
export class TransactionService {
  constructor(private readonly deps: ServiceDeps) {}

  async listByMonth(householdId: string, month: ISOMonth): Promise<Transaction[]> {
    return this.deps.repos.transactions.listByMonth(householdId, month);
  }

  private normalise(
    h: Awaited<ReturnType<typeof loadHousehold>>,
    input: TransactionInput,
    previousCategoryId?: string,
  ): Omit<Transaction, "id"> {
    const category = h.categories.find((c) => c.id === input.categoryId);
    if (!category) throw new DomainRuleError("Pick a category", "categoryId");
    if (category.archived && category.id !== previousCategoryId)
      throw new DomainRuleError("That category is archived", "categoryId");
    if (input.paidBy.kind === "user") assertMember(h, input.paidBy.userId, "paidBy");
    if (input.linkedBillId && !h.bills.some((b) => b.id === input.linkedBillId))
      throw new DomainRuleError("Unknown bill", "linkedBillId");
    if (input.linkedGoalId && !h.goals.some((g) => g.id === input.linkedGoalId))
      throw new DomainRuleError("Unknown goal", "linkedGoalId");
    if (input.linkedInvestmentId && !h.investmentAccounts.some((a) => a.id === input.linkedInvestmentId)) {
      throw new DomainRuleError("Unknown investment account", "linkedInvestmentId");
    }
    const isTransfer = category.type === "transfer";
    const isShared = isTransfer ? false : input.isShared;
    return {
      date: input.date,
      description: input.description.trim(),
      categoryId: input.categoryId,
      amountPence: input.amountPence,
      paidBy: input.paidBy,
      isShared,
      shareOverride: isShared ? input.shareOverride : null,
      linkedBillId: input.linkedBillId,
      linkedGoalId: input.linkedGoalId,
      linkedInvestmentId: input.linkedInvestmentId,
      notes: input.notes?.trim() || null,
    };
  }

  /** CSV import (section 8 flow 1 at scale): all rows validated with the same invariants, inserted in one transaction. */
  async createMany(householdId: string, inputs: TransactionInput[]): Promise<Mutation<Transaction[]>> {
    const h = await loadHousehold(this.deps, householdId);
    const rows = inputs.map((input) => this.normalise(h, input));
    return mutate(this.deps, householdId, async (tx) => {
      const created: Transaction[] = [];
      for (const row of rows) created.push(await this.deps.repos.transactions.insert(householdId, row, tx));
      return created;
    });
  }

  async create(householdId: string, input: TransactionInput): Promise<Mutation<Transaction>> {
    const h = await loadHousehold(this.deps, householdId);
    const row = this.normalise(h, input);
    return mutate(this.deps, householdId, (tx) => this.deps.repos.transactions.insert(householdId, row, tx));
  }

  async update(householdId: string, id: string, input: TransactionInput): Promise<Mutation<Transaction>> {
    const h = await loadHousehold(this.deps, householdId);
    const existing = h.transactions.find((t) => t.id === id);
    if (!existing) throw new NotFoundError("transaction", id);
    const row = this.normalise(h, input, existing.categoryId);
    return mutate(this.deps, householdId, async (tx) => {
      const updated = await this.deps.repos.transactions.update(householdId, { id, ...row }, tx);
      if (!updated) throw new NotFoundError("transaction", id);
      return updated;
    });
  }

  async delete(householdId: string, id: string): Promise<Mutation<Transaction>> {
    return mutate(this.deps, householdId, async (tx) => {
      const existing = await this.deps.repos.transactions.findById(householdId, id, tx);
      if (!existing) throw new NotFoundError("transaction", id);
      await this.deps.repos.transactions.delete(householdId, id, tx);
      return existing;
    });
  }
}
