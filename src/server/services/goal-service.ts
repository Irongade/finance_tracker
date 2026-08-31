import type { GoalInput } from "@/domain/schemas";
import type { Goal } from "@/domain/types";
import { DomainRuleError, NotFoundError } from "@/server/errors";
import { assertMember, loadHousehold, type Mutation, memberIds, mutate, type ServiceDeps } from "./context";

export class GoalService {
  constructor(private readonly deps: ServiceDeps) {}

  /** New goals get a £0 pledge row for each member so the UI can edit both inline. */
  async create(
    householdId: string,
    input: GoalInput,
    pledges: { userId: string; monthlyPence: number }[] = [],
  ): Promise<Mutation<Goal>> {
    const h = await loadHousehold(this.deps, householdId);
    for (const p of pledges) {
      assertMember(h, p.userId, "pledges");
      if (p.monthlyPence < 0) throw new DomainRuleError("Pledges can't be negative", "pledges");
    }
    const [m1, m2] = memberIds(h);
    const byMember = new Map(pledges.map((p) => [p.userId, p.monthlyPence]));
    const goal: Omit<Goal, "id"> = {
      ...input,
      notes: input.notes?.trim() || null,
      sort: h.goals.length + 1,
      archived: false,
      pledges: [m1, m2].map((userId) => ({ goalId: "", userId, monthlyPence: byMember.get(userId) ?? 0 })),
    };
    return mutate(this.deps, householdId, async (tx) => {
      const created = await this.deps.repos.goals.insert(householdId, goal, tx);
      if (input.isEmergencyFund) await this.deps.repos.goals.setEmergencyFund(householdId, created.id, tx);
      return created;
    });
  }

  async update(householdId: string, id: string, input: GoalInput): Promise<Mutation<Goal>> {
    return mutate(this.deps, householdId, async (tx) => {
      const existing = await this.deps.repos.goals.findById(householdId, id, tx);
      if (!existing) throw new NotFoundError("goal", id);
      const updated = await this.deps.repos.goals.update(
        householdId,
        { ...existing, ...input, notes: input.notes?.trim() || null },
        tx,
      );
      if (!updated) throw new NotFoundError("goal", id);
      if (input.isEmergencyFund) await this.deps.repos.goals.setEmergencyFund(householdId, id, tx);
      return updated;
    });
  }

  async setPledge(householdId: string, goalId: string, userId: string, monthlyPence: number): Promise<Mutation<Goal>> {
    if (monthlyPence < 0) throw new DomainRuleError("Pledges can't be negative", "monthlyPence");
    const h = await loadHousehold(this.deps, householdId);
    assertMember(h, userId);
    return mutate(this.deps, householdId, async (tx) => {
      const goal = await this.deps.repos.goals.findById(householdId, goalId, tx);
      if (!goal) throw new NotFoundError("goal", goalId);
      await this.deps.repos.goals.upsertPledge(householdId, goalId, userId, monthlyPence, tx);
      const fresh = await this.deps.repos.goals.findById(householdId, goalId, tx);
      if (!fresh) throw new NotFoundError("goal", goalId);
      return fresh;
    });
  }

  /** Drag-reorder from the Goals page: ids arrive in their new visual order. */
  async reorder(householdId: string, ids: string[]): Promise<Mutation<null>> {
    const h = await loadHousehold(this.deps, householdId);
    const known = new Set(h.goals.map((g) => g.id));
    if (!ids.every((id) => known.has(id))) throw new DomainRuleError("Unknown goal in the new order", "ids");
    return mutate(this.deps, householdId, async (tx) => {
      await this.deps.repos.goals.updateSort(householdId, ids, tx);
      return null;
    });
  }

  async setEmergencyFund(householdId: string, goalId: string): Promise<Mutation<null>> {
    return mutate(this.deps, householdId, async (tx) => {
      const goal = await this.deps.repos.goals.findById(householdId, goalId, tx);
      if (!goal) throw new NotFoundError("goal", goalId);
      await this.deps.repos.goals.setEmergencyFund(householdId, goalId, tx);
      return null;
    });
  }

  async setArchived(householdId: string, id: string, archived: boolean): Promise<Mutation<Goal>> {
    return mutate(this.deps, householdId, async (tx) => {
      const existing = await this.deps.repos.goals.findById(householdId, id, tx);
      if (!existing) throw new NotFoundError("goal", id);
      const updated = await this.deps.repos.goals.update(householdId, { ...existing, archived }, tx);
      if (!updated) throw new NotFoundError("goal", id);
      return updated;
    });
  }

  async delete(householdId: string, id: string): Promise<Mutation<null>> {
    return mutate(this.deps, householdId, async (tx) => {
      const ok = await this.deps.repos.goals.delete(householdId, id, tx);
      if (!ok) throw new NotFoundError("goal", id);
      return null;
    });
  }
}
