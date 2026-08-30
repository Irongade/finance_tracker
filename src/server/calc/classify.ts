import type { CategoryType, Household, Transaction } from "@/domain/types";

/** categoryId -> type. Transaction type is never stored (section 4). */
export function categoryTypes(h: Household): Map<string, CategoryType> {
  return new Map(h.categories.map((c) => [c.id, c.type]));
}

export function transactionType(txn: Transaction, types: Map<string, CategoryType>): CategoryType {
  return types.get(txn.categoryId) ?? "variable";
}

export function isSpending(type: CategoryType): boolean {
  return type === "fixed" || type === "variable";
}

export function isUser(paidBy: Transaction["paidBy"], userId: string): boolean {
  return paidBy.kind === "user" && paidBy.userId === userId;
}
