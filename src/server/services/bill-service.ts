import type { BillInput } from "@/domain/schemas";
import type { Bill } from "@/domain/types";
import { DomainRuleError, NotFoundError } from "@/server/errors";
import { assertMember, loadHousehold, type Mutation, mutate, type ServiceDeps } from "./context";

export class BillService {
  constructor(private readonly deps: ServiceDeps) {}

  private async check(householdId: string, input: BillInput): Promise<number> {
    const h = await loadHousehold(this.deps, householdId);
    const category = h.categories.find((c) => c.id === input.categoryId);
    if (!category) throw new DomainRuleError("Pick a category", "categoryId");
    if (category.type === "transfer")
      throw new DomainRuleError("Bills need a fixed or variable category", "categoryId");
    if (input.owner.kind === "user") assertMember(h, input.owner.userId, "owner");
    return h.bills.length;
  }

  async create(householdId: string, input: BillInput): Promise<Mutation<Bill>> {
    const count = await this.check(householdId, input);
    return mutate(this.deps, householdId, (tx) =>
      this.deps.repos.bills.insert(
        householdId,
        { ...input, sort: count + 1, notes: input.notes?.trim() || null, archived: false },
        tx,
      ),
    );
  }

  /** Drag-reorder from the Bills page: ids arrive in their new visual order. */
  async reorder(householdId: string, ids: string[]): Promise<Mutation<null>> {
    const h = await loadHousehold(this.deps, householdId);
    const known = new Set(h.bills.map((b) => b.id));
    if (!ids.every((id) => known.has(id))) throw new DomainRuleError("Unknown bill in the new order", "ids");
    return mutate(this.deps, householdId, async (tx) => {
      await this.deps.repos.bills.updateSort(householdId, ids, tx);
      return null;
    });
  }

  async update(householdId: string, id: string, input: BillInput): Promise<Mutation<Bill>> {
    await this.check(householdId, input);
    return mutate(this.deps, householdId, async (tx) => {
      const existing = await this.deps.repos.bills.findById(householdId, id, tx);
      if (!existing) throw new NotFoundError("bill", id);
      const updated = await this.deps.repos.bills.update(
        householdId,
        { ...existing, ...input, notes: input.notes?.trim() || null },
        tx,
      );
      if (!updated) throw new NotFoundError("bill", id);
      return updated;
    });
  }

  async setArchived(householdId: string, id: string, archived: boolean): Promise<Mutation<Bill>> {
    return mutate(this.deps, householdId, async (tx) => {
      const existing = await this.deps.repos.bills.findById(householdId, id, tx);
      if (!existing) throw new NotFoundError("bill", id);
      const updated = await this.deps.repos.bills.update(householdId, { ...existing, archived }, tx);
      if (!updated) throw new NotFoundError("bill", id);
      return updated;
    });
  }

  async delete(householdId: string, id: string): Promise<Mutation<null>> {
    return mutate(this.deps, householdId, async (tx) => {
      const ok = await this.deps.repos.bills.delete(householdId, id, tx);
      if (!ok) throw new NotFoundError("bill", id);
      return null;
    });
  }
}
