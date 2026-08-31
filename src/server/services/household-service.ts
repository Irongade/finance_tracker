import { createHash, randomBytes } from "node:crypto";
import type { Household, HouseholdView, ISOMonth, Matrix, Settings } from "@/domain/types";
import { computeBudgetMatrix, computeHouseholdView } from "@/server/calc";
import { ConflictError, DomainRuleError, NotFoundError } from "@/server/errors";
import type { Membership } from "@/server/repositories";
import { loadHousehold, type Mutation, mutate, type ServiceDeps } from "./context";

export const INVITE_TTL_MS = 48 * 60 * 60 * 1000;

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export interface HouseholdSnapshot {
  membership: Membership;
  household: Household;
  view: HouseholdView;
}

/** Membership, onboarding, invites, settings and the read models (dashboard, budgets). */
export class HouseholdService {
  constructor(private readonly deps: ServiceDeps) {}

  async forAuthUser(authUserId: string): Promise<HouseholdSnapshot | null> {
    const membership = await this.deps.repos.households.findMembership(authUserId);
    if (!membership) return null;
    const household = await this.deps.repos.households.load(membership.householdId);
    if (!household) return null;
    return { membership, household, view: computeHouseholdView(household, this.deps.clock()) };
  }

  async membershipFor(authUserId: string): Promise<Membership | null> {
    return this.deps.repos.households.findMembership(authUserId);
  }

  async snapshot(householdId: string): Promise<{ household: Household; view: HouseholdView }> {
    const household = await loadHousehold(this.deps, householdId);
    return { household, view: computeHouseholdView(household, this.deps.clock()) };
  }

  async budgetMatrix(householdId: string, startMonth: ISOMonth): Promise<Matrix> {
    const household = await loadHousehold(this.deps, householdId);
    return computeBudgetMatrix(household, startMonth, this.deps.clock());
  }

  /** First-run: the signed-in user becomes member 1; member 2 is a named slot until the invite is accepted. */
  async create(
    authUserId: string,
    input: { name: string; member1Name: string; member2Name: string },
  ): Promise<Membership> {
    const existing = await this.deps.repos.households.findMembership(authUserId);
    if (existing) throw new ConflictError("You already belong to a household");
    return this.deps.db.transaction((tx) =>
      this.deps.repos.households.create(
        { name: input.name, member1Name: input.member1Name, member2Name: input.member2Name, authUserId },
        tx,
      ),
    );
  }

  async updateNames(
    householdId: string,
    input: { name?: string; members?: { id: string; name: string }[] },
  ): Promise<Mutation<null>> {
    return mutate(this.deps, householdId, async (tx) => {
      if (input.name !== undefined) await this.deps.repos.households.updateName(householdId, input.name, tx);
      for (const m of input.members ?? []) {
        if (!m.name.trim()) throw new DomainRuleError("Name can't be empty", "name");
        await this.deps.repos.households.updateMemberName(householdId, m.id, m.name.trim(), tx);
      }
      return null;
    });
  }

  async updateSettings(householdId: string, patch: Partial<Settings>): Promise<Mutation<Settings>> {
    return mutate(this.deps, householdId, async (tx) => {
      await this.deps.repos.households.updateSettings(householdId, patch, tx);
      const settings = await this.deps.repos.households.getSettings(householdId, tx);
      if (!settings) throw new NotFoundError("settings");
      return settings;
    });
  }

  /**
   * If the wrong person registered first, the member labels and their data are
   * fine but the logins are attached to the wrong seats; this swaps them.
   */
  async swapLogins(householdId: string): Promise<Mutation<null>> {
    return mutate(this.deps, householdId, async (tx) => {
      const ok = await this.deps.repos.households.swapMemberAuth(householdId, tx);
      if (!ok) throw new DomainRuleError("Both of you need to have signed up before the logins can be swapped");
      return null;
    });
  }

  /** Returns the raw token exactly once; only its hash is stored. */
  async createInvite(
    householdId: string,
    createdByMemberId: string,
    now = new Date(),
  ): Promise<{ token: string; expiresAt: Date }> {
    const household = await loadHousehold(this.deps, householdId);
    const partner = household.users[1];
    if (partner.email) throw new ConflictError(`${partner.name} has already joined`);
    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(now.getTime() + INVITE_TTL_MS);
    await this.deps.repos.invites.create({
      householdId,
      position: 2,
      tokenHash: hashToken(token),
      expiresAt,
      createdByMemberId,
    });
    return { token, expiresAt };
  }

  async peekInvite(
    token: string,
    now = new Date(),
  ): Promise<{ householdName: string; inviterName: string; memberName: string } | null> {
    const invite = await this.deps.repos.invites.findValid(hashToken(token), now);
    if (!invite) return null;
    const household = await this.deps.repos.households.load(invite.householdId);
    if (!household) return null;
    return { householdName: household.name, inviterName: household.users[0].name, memberName: household.users[1].name };
  }

  /** Binds a freshly signed-up auth user to member slot 2 and burns the token. */
  async acceptInvite(token: string, authUserId: string, now = new Date()): Promise<Membership> {
    return this.deps.db.transaction(async (tx) => {
      const invite = await this.deps.repos.invites.findValid(hashToken(token), now, tx);
      if (!invite) throw new DomainRuleError("This invite link is invalid or has expired", "token");
      const already = await this.deps.repos.households.findMembership(authUserId, tx);
      if (already) throw new ConflictError("You already belong to a household");
      const linked = await this.deps.repos.households.linkMember(invite.householdId, invite.position, authUserId, tx);
      if (!linked) throw new ConflictError("That seat has already been taken");
      await this.deps.repos.invites.markUsed(invite.id, now, tx);
      const membership = await this.deps.repos.households.findMembership(authUserId, tx);
      if (!membership) throw new NotFoundError("membership");
      return membership;
    });
  }
}
