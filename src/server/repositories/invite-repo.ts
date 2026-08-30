import { and, eq, gt, isNull } from "drizzle-orm";
import type { Db, DbHandle } from "@/server/db/client";
import * as s from "@/server/db/schema";

export interface Invite {
  id: string;
  householdId: string;
  position: number;
  expiresAt: Date;
  usedAt: Date | null;
}

/** One-time invite links; only a hash of the token is stored. */
export class InviteRepository {
  constructor(private readonly db: Db) {}

  async create(
    input: { householdId: string; position: number; tokenHash: string; expiresAt: Date; createdByMemberId: string },
    h: DbHandle = this.db,
  ): Promise<Invite> {
    const [r] = await h.insert(s.invites).values(input).returning();
    if (!r) throw new Error("invite insert returned nothing");
    return { id: r.id, householdId: r.householdId, position: r.position, expiresAt: r.expiresAt, usedAt: r.usedAt };
  }

  async findValid(tokenHash: string, now: Date, h: DbHandle = this.db): Promise<Invite | null> {
    const [r] = await h
      .select()
      .from(s.invites)
      .where(and(eq(s.invites.tokenHash, tokenHash), isNull(s.invites.usedAt), gt(s.invites.expiresAt, now)))
      .limit(1);
    return r
      ? { id: r.id, householdId: r.householdId, position: r.position, expiresAt: r.expiresAt, usedAt: r.usedAt }
      : null;
  }

  async markUsed(id: string, now: Date, h: DbHandle = this.db): Promise<void> {
    await h.update(s.invites).set({ usedAt: now }).where(eq(s.invites.id, id));
  }
}
