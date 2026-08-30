/**
 * Zod contracts shared by forms, controllers and the calc engine (section 7.1).
 * Section 9 validation rules live here and nowhere else.
 */
import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date");
const isoMonth = z.string().regex(/^\d{4}-\d{2}-01$/, "Pick a month");

export const ownerSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("joint") }),
  z.object({ kind: z.literal("user"), userId: z.string().min(1, "Pick who paid") }),
]);

export const transactionInputSchema = z
  .object({
    amountPence: z
      .number({ error: "Enter an amount" })
      .int()
      .refine((v) => v !== 0, "Amount can't be zero"),
    description: z.string().trim().min(1, "Add a description").max(120),
    categoryId: z.string().min(1, "Pick a category"),
    paidBy: ownerSchema,
    isShared: z.boolean(),
    shareOverride: z.number().min(0).max(1).nullable(),
    date: isoDate,
    linkedBillId: z.string().nullable(),
    linkedGoalId: z.string().nullable(),
    linkedInvestmentId: z.string().nullable(),
    notes: z.string().trim().max(500).nullable(),
  })
  .refine((v) => [v.linkedBillId, v.linkedGoalId, v.linkedInvestmentId].filter(Boolean).length <= 1, {
    message: "Link to one of a bill, a goal or an investment",
    path: ["linkedBillId"],
  });

export type TransactionInput = z.infer<typeof transactionInputSchema>;

export const settlementInputSchema = z
  .object({
    amountPence: z.number({ error: "Enter an amount" }).int().positive("Amount must be more than £0"),
    fromUserId: z.string().min(1),
    toUserId: z.string().min(1),
    date: isoDate,
    notes: z.string().trim().max(200).nullable(),
  })
  .refine((v) => v.fromUserId !== v.toUserId, { message: "Pick two different people", path: ["toUserId"] });

export type SettlementInput = z.infer<typeof settlementInputSchema>;

export const snapshotInputSchema = z.object({
  month: isoMonth,
  values: z.record(z.string(), z.number().int().min(0)),
});

export const billInputSchema = z.object({
  name: z.string().trim().min(1, "Name the bill").max(80),
  categoryId: z.string().min(1, "Pick a category"),
  monthlyPence: z.number({ error: "Enter the monthly amount" }).int().min(0),
  dueDay: z.number().int().min(1).max(31).nullable(),
  owner: ownerSchema,
  notes: z.string().trim().max(200).nullable(),
});

export type BillInput = z.infer<typeof billInputSchema>;

export const goalInputSchema = z.object({
  name: z.string().trim().min(1, "Name the goal").max(80),
  type: z.enum(["lisa", "standard"]),
  targetPence: z.number({ error: "Enter a target" }).int().positive(),
  targetDate: isoDate,
  aer: z.number().min(0).max(1),
  isEmergencyFund: z.boolean(),
  notes: z.string().trim().max(200).nullable(),
});

export type GoalInput = z.infer<typeof goalInputSchema>;

export const debtInputSchema = z.object({
  ownerUserId: z.string().min(1, "Pick an owner"),
  lender: z.string().trim().min(1, "Name the lender").max(80),
  balancePence: z.number({ error: "Enter the balance" }).int().min(0),
  apr: z.number().min(0, "APR is 0 to 100%").max(1, "APR is 0 to 100%"),
  minPaymentPence: z.number({ error: "Enter the minimum payment" }).int().min(0),
  extraPaymentPence: z.number().int().min(0),
});

export type DebtInput = z.infer<typeof debtInputSchema>;

export const investmentAccountInputSchema = z.object({
  name: z.string().trim().min(1, "Name the account").max(80),
  provider: z.string().trim().max(80),
  wrapper: z.enum(["ss_isa", "pension", "gia", "crypto", "other"]),
  owner: ownerSchema,
  monthlyContributionPence: z.number().int().min(0),
  expectedGrowth: z.number().min(-0.5, "Between -50% and 50%").max(0.5, "Between -50% and 50%"),
  contributedBeforePence: z.number().int().min(0, "Can't be negative"),
  notes: z.string().trim().max(200).nullable(),
});

export type InvestmentAccountInput = z.infer<typeof investmentAccountInputSchema>;

export const settingsPatchSchema = z.object({
  splitMethod: z.enum(["fifty_fifty", "proportional", "custom"]).optional(),
  customShareUser1: z.number().min(0).max(1).optional(),
  lisaBonusRate: z.number().min(0).max(1).optional(),
  lisaAnnualAllowancePence: z.number().int().min(0).optional(),
  mortgageMultiple: z.number().min(0).max(10).optional(),
});

// --- household / onboarding / catalogue bodies (section 6) ---------------------

export const householdCreateSchema = z.object({
  name: z.string().trim().min(1, "Name the household").max(80),
  member1Name: z.string().trim().min(1, "Your name").max(40),
  member2Name: z.string().trim().min(1, "Your partner's name").max(40),
});
export type HouseholdCreateInput = z.infer<typeof householdCreateSchema>;

export const householdPatchSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  members: z
    .array(z.object({ id: z.string().min(1), name: z.string().trim().min(1, "Name can't be empty").max(40) }))
    .optional(),
});

export const pledgeInputSchema = z.object({
  userId: z.string().min(1),
  monthlyPence: z.number().int().min(0, "Pledges can't be negative"),
});

export const goalCreateSchema = goalInputSchema.extend({ pledges: z.array(pledgeInputSchema).optional() });

export const archiveSchema = z.object({ archived: z.boolean() });

export const monthSnapshotSchema = z.object({ month: isoMonth, values: z.record(z.string(), z.number().int().min(0)) });

export const netWorthSnapshotSchema = z.object({ month: isoMonth, valuePence: z.number().int().optional() });

export const variableBudgetSchema = z.object({ categoryId: z.string().min(1), monthlyPence: z.number().int().min(0) });

export const categoryCreateSchema = z.object({
  name: z.string().trim().min(1, "Name the category").max(40),
  type: z.enum(["fixed", "variable", "transfer"]),
});
export const categoryPatchSchema = z.object({
  name: z.string().trim().min(1).max(40).optional(),
  type: z.enum(["fixed", "variable", "transfer"]).optional(),
  archived: z.boolean().optional(),
  sort: z.number().int().optional(),
});

export const incomeSourceSchema = z.object({
  userId: z.string().min(1),
  name: z.string().trim().min(1, "Name the source").max(60),
  monthlyPence: z.number().int().min(0),
});

export const accountSchema = z.object({
  name: z.string().trim().min(1, "Name the account").max(60),
  owner: ownerSchema,
  balancePence: z.number().int(),
});

export const investmentAccountPatchSchema = investmentAccountInputSchema
  .partial()
  .extend({ archived: z.boolean().optional() });
