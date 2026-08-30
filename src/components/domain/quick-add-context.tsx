"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { PaidBy, Transaction } from "@/domain/types";

/** Pre-filled fields for the quick-add sheet (bills, goals and investments open it pre-linked). */
export interface QuickAddPrefill {
  amountPence?: number;
  description?: string;
  categoryId?: string;
  paidBy?: PaidBy;
  isShared?: boolean;
  date?: string;
  linkedBillId?: string | null;
  linkedGoalId?: string | null;
  linkedInvestmentId?: string | null;
  notes?: string;
  /** when set, the sheet edits this transaction instead of adding one */
  editing?: Transaction;
}

interface QuickAddContextValue {
  isOpen: boolean;
  prefill: QuickAddPrefill | null;
  open: (prefill?: QuickAddPrefill) => void;
  close: () => void;
}

const QuickAddContext = createContext<QuickAddContextValue | null>(null);

export function QuickAddProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const [prefill, setPrefill] = useState<QuickAddPrefill | null>(null);
  const open = useCallback((p?: QuickAddPrefill) => {
    setPrefill(p ?? null);
    setOpen(true);
  }, []);
  const close = useCallback(() => setOpen(false), []);
  const value = useMemo(() => ({ isOpen, prefill, open, close }), [isOpen, prefill, open, close]);
  return <QuickAddContext.Provider value={value}>{children}</QuickAddContext.Provider>;
}

export function useQuickAdd(): QuickAddContextValue {
  const ctx = useContext(QuickAddContext);
  if (!ctx) throw new Error("useQuickAdd must be used inside QuickAddProvider");
  return ctx;
}
