import { todayInLondon } from "@/domain/dates";
import type { Clock, Household, HouseholdView } from "@/domain/types";
import { computeHouseholdView } from "@/server/calc";
import type { Db, Tx } from "@/server/db/client";
import { DomainRuleError, NotFoundError } from "@/server/errors";
import type { Repositories } from "@/server/repositories";

export interface ServiceDeps {
  db: Db;
  repos: Repositories;
  /** Injected so tests and demos can pin "today" (section 6.1). */
  clock: () => Clock;
}

/** Europe/London today, or FIXED_TODAY=YYYY-MM-DD for demos and golden e2e runs. */
export function defaultClock(): Clock {
  const fixed = process.env.FIXED_TODAY;
  return { today: fixed && /^\d{4}-\d{2}-\d{2}$/.test(fixed) ? fixed : todayInLondon() };
}

/** Every mutation returns the entity plus the recomputed household so the UI updates without refetching (section 6). */
export interface Mutation<T> {
  result: T;
  household: Household;
  view: HouseholdView;
}

export async function mutate<T>(
  deps: ServiceDeps,
  householdId: string,
  fn: (tx: Tx) => Promise<T>,
): Promise<Mutation<T>> {
  return deps.db.transaction(async (tx) => {
    const result = await fn(tx);
    const household = await deps.repos.households.load(householdId, tx);
    if (!household) throw new NotFoundError("household", householdId);
    return { result, household, view: computeHouseholdView(household, deps.clock()) };
  });
}

export async function loadHousehold(deps: ServiceDeps, householdId: string): Promise<Household> {
  const household = await deps.repos.households.load(householdId);
  if (!household) throw new NotFoundError("household", householdId);
  return household;
}

export function memberIds(h: Household): [string, string] {
  return [h.users[0].id, h.users[1].id];
}

export function assertMember(h: Household, memberId: string, field = "userId"): void {
  if (!h.users.some((u) => u.id === memberId)) throw new DomainRuleError("Unknown household member", field);
}
