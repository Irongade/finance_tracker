import type { Category, Owner } from "@/domain/types";
import { ConflictError, DomainRuleError } from "@/server/errors";
import type { WorkbookData } from "@/server/import/workbook";
import { loadHousehold, type Mutation, mutate, type ServiceDeps } from "./context";

export interface ImportSummary {
  categories: number;
  bills: number;
  goals: number;
  transactions: number;
  potSnapshots: number;
  incomeSources: number;
  variableBudgets: number;
  accounts: number;
  debts: number;
}

/**
 * Section 11: writes a parsed workbook into an empty household. Names are
 * resolved to ids; transactions whose description contains a joint bill's
 * name are linked to that bill (section 2.3), which is what the sheet's
 * fuzzy match did.
 */
export class ImportService {
  constructor(private readonly deps: ServiceDeps) {}

  async importWorkbook(
    householdId: string,
    data: WorkbookData,
    opts: { renameMembers?: boolean } = {},
  ): Promise<Mutation<ImportSummary>> {
    const before = await loadHousehold(this.deps, householdId);
    if (before.transactions.length || before.goals.length || before.bills.length || before.categories.length) {
      throw new ConflictError("This household already has data. Import only into an empty household.");
    }
    const [m1, m2] = before.users;
    const memberFor = (ref: "joint" | 1 | 2): Owner =>
      ref === "joint" ? { kind: "joint" } : { kind: "user", userId: ref === 1 ? m1.id : m2.id };

    return mutate(this.deps, householdId, async (tx) => {
      const r = this.deps.repos;
      if (opts.renameMembers ?? true) {
        await r.households.updateName(householdId, data.householdName, tx);
        await r.households.updateMemberName(householdId, m1.id, data.memberNames[0], tx);
        await r.households.updateMemberName(householdId, m2.id, data.memberNames[1], tx);
      }
      await r.households.updateSettings(householdId, data.settings, tx);

      const categories = await r.categories.insertMany(
        householdId,
        data.categories.map((c, i) => ({ name: c.name, type: c.type, sort: i + 1, archived: false })),
        tx,
      );
      const categoryByName = new Map<string, Category>(categories.map((c) => [c.name.toLowerCase(), c]));
      const category = (name: string, context: string) => {
        const c = categoryByName.get(name.toLowerCase());
        if (!c) throw new DomainRuleError(`Unknown category "${name}" in ${context}. Add it on Settings first.`);
        return c;
      };

      for (const src of data.incomeSources) {
        await r.incomeSources.insert(
          householdId,
          { userId: src.position === 1 ? m1.id : m2.id, name: src.name, monthlyPence: src.monthlyPence },
          tx,
        );
      }

      const bills = [];
      let billSort = 0;
      for (const b of data.bills) {
        billSort += 1;
        bills.push(
          await r.bills.insert(
            householdId,
            {
              name: b.name,
              categoryId: category(b.category, `bill ${b.name}`).id,
              monthlyPence: b.monthlyPence,
              dueDay: b.dueDay,
              owner: memberFor(b.owner),
              sort: billSort,
              notes: b.notes,
              archived: false,
            },
            tx,
          ),
        );
      }

      const goalByName = new Map<string, string>();
      let sort = 0;
      for (const g of data.goals) {
        sort += 1;
        const created = await r.goals.insert(
          householdId,
          {
            name: g.name,
            type: g.type,
            targetPence: g.targetPence,
            targetDate: g.targetDate,
            aer: g.aer,
            isEmergencyFund: g.isEmergencyFund,
            notes: g.notes,
            sort,
            archived: false,
            pledges: [
              { goalId: "", userId: m1.id, monthlyPence: g.pledges[0] },
              { goalId: "", userId: m2.id, monthlyPence: g.pledges[1] },
            ],
          },
          tx,
        );
        goalByName.set(g.name.toLowerCase(), created.id);
      }

      for (const v of data.variableBudgets) {
        const c = categoryByName.get(v.category.toLowerCase());
        if (c && c.type === "variable") await r.variableBudgets.upsert(householdId, c.id, v.monthlyPence, tx);
      }

      let potRows = 0;
      for (const snap of data.potSnapshots) {
        const balances: Record<string, number> = {};
        for (const [goalName, pence] of Object.entries(snap.balances)) {
          const id = goalByName.get(goalName.toLowerCase());
          if (id) balances[id] = pence;
        }
        potRows += (await r.snapshots.upsertPots(householdId, snap.month, balances, tx)).length;
      }

      const jointBills = bills.filter((b) => b.owner.kind === "joint");
      for (const t of data.transactions) {
        const c = category(t.category, `transaction "${t.description}"`);
        const linkedGoalId = t.linkedGoal ? (goalByName.get(t.linkedGoal.toLowerCase()) ?? null) : null;
        const linkedBill =
          c.type === "transfer" || linkedGoalId
            ? null
            : (jointBills.find((b) => t.description.toLowerCase().includes(b.name.toLowerCase())) ?? null);
        await r.transactions.insert(
          householdId,
          {
            date: t.date,
            description: t.description,
            categoryId: c.id,
            amountPence: t.amountPence,
            paidBy: memberFor(t.paidBy),
            isShared: c.type === "transfer" ? false : t.isShared,
            shareOverride: t.isShared && c.type !== "transfer" ? t.shareOverride : null,
            linkedBillId: linkedBill?.id ?? null,
            linkedGoalId,
            linkedInvestmentId: null,
            notes: t.notes,
          },
          tx,
        );
      }

      for (const a of data.accounts) {
        await r.accounts.insert(
          householdId,
          { name: a.name, owner: memberFor(a.owner), balancePence: a.balancePence },
          tx,
        );
      }
      for (const d of data.debts) {
        await r.debts.insert(
          householdId,
          {
            ownerUserId: d.owner === 1 ? m1.id : m2.id,
            lender: d.lender,
            balancePence: d.balancePence,
            apr: d.apr,
            minPaymentPence: d.minPaymentPence,
            extraPaymentPence: d.extraPaymentPence,
          },
          tx,
        );
      }

      return {
        categories: categories.length,
        bills: bills.length,
        goals: data.goals.length,
        transactions: data.transactions.length,
        potSnapshots: potRows,
        incomeSources: data.incomeSources.length,
        variableBudgets: data.variableBudgets.length,
        accounts: data.accounts.length,
        debts: data.debts.length,
      };
    });
  }
}
