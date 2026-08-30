import type { SettlementInput } from "@/domain/schemas";
import type { Settlement, SettleUp } from "@/domain/types";
import { computeHouseholdView } from "@/server/calc";
import { DomainRuleError, NotFoundError } from "@/server/errors";
import { assertMember, loadHousehold, type Mutation, mutate, type ServiceDeps } from "./context";

/** Section 5.3 plus the section 2.3 deviation: payments between the two of you net the balance off. */
export class SettleUpService {
  constructor(private readonly deps: ServiceDeps) {}

  async current(householdId: string): Promise<SettleUp> {
    const h = await loadHousehold(this.deps, householdId);
    return computeHouseholdView(h, this.deps.clock()).settleUp;
  }

  async record(householdId: string, input: SettlementInput): Promise<Mutation<Settlement>> {
    const h = await loadHousehold(this.deps, householdId);
    assertMember(h, input.fromUserId, "fromUserId");
    assertMember(h, input.toUserId, "toUserId");
    if (input.fromUserId === input.toUserId) throw new DomainRuleError("Pick two different people", "toUserId");
    return mutate(this.deps, householdId, (tx) =>
      this.deps.repos.settlements.insert(householdId, { ...input, notes: input.notes?.trim() || null }, tx),
    );
  }

  async delete(householdId: string, id: string): Promise<Mutation<null>> {
    return mutate(this.deps, householdId, async (tx) => {
      const ok = await this.deps.repos.settlements.delete(householdId, id, tx);
      if (!ok) throw new NotFoundError("settlement", id);
      return null;
    });
  }
}
