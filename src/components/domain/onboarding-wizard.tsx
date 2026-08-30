"use client";

import { ArrowRight, Check, FileSpreadsheet, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { MoneyInput } from "@/components/domain/money-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, api } from "@/lib/api";
import { cn } from "@/lib/utils";

const STEPS = ["Household", "People", "Data", "Routine"];

interface Membership {
  householdId: string;
  memberId: string;
}

export function OnboardingWizard({ defaultName }: { defaultName: string }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [household, setHousehold] = useState("");
  const [names, setNames] = useState([defaultName, ""]);
  const [incomes, setIncomes] = useState<(number | null)[]>([null, null]);
  const [mode, setMode] = useState<"import" | "blank">("import");
  const [file, setFile] = useState<File | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [members, setMembers] = useState<{ id: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fail = (e: unknown) => setError(e instanceof ApiError ? e.message : "Something went wrong. Try again.");

  const createHousehold = async () => {
    if (membership) return true;
    setBusy(true);
    setError(null);
    try {
      const data = await api<{ membership: Membership }>({
        method: "POST",
        url: "/api/household",
        body: { name: household.trim() || `${names[0]} & ${names[1]}`, member1Name: names[0], member2Name: names[1] },
      });
      setMembership(data.membership);
      const snap = await api<{ household: { users: { id: string }[] } }>({ method: "GET", url: "/api/household" });
      setMembers(snap.household.users);
      return true;
    } catch (e) {
      fail(e);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const saveData = async () => {
    setBusy(true);
    setError(null);
    try {
      if (mode === "import") {
        if (!file) throw new ApiError(400, "Choose the .xlsx file first");
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/household/import", { method: "POST", body: form, credentials: "same-origin" });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          throw new ApiError(res.status, data.error ?? "Import failed");
        }
        const data = (await res.json()) as { result: { transactions: number; goals: number; bills: number } };
        toast.success("Workbook imported", {
          description: `${data.result.goals} goals, ${data.result.bills} bills, ${data.result.transactions} transactions.`,
        });
      } else {
        for (const [i, pence] of incomes.entries()) {
          const member = members[i];
          if (member && pence !== null && pence > 0) {
            await api({
              method: "POST",
              url: "/api/income-sources",
              body: { userId: member.id, name: "Salary (take-home)", monthlyPence: pence },
            });
          }
        }
      }
      return true;
    } catch (e) {
      fail(e);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const next = async () => {
    if (step === 1) {
      if (!names[0].trim() || !names[1].trim()) {
        setError("Both names are needed");
        return;
      }
      if (!(await createHousehold())) return;
    }
    if (step === 2 && !(await saveData())) return;
    setError(null);
    setStep((s) => s + 1);
  };

  return (
    <div className="grid gap-6">
      <ol className="flex items-center gap-2 text-[11.5px] font-medium text-ink-muted">
        {STEPS.map((s, i) => (
          <li key={s} className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex size-5 items-center justify-center rounded-full text-[11px]",
                i < step ? "bg-fern text-white" : i === step ? "bg-navy text-white" : "bg-row-hover",
              )}
            >
              {i < step ? <Check className="size-3" /> : i + 1}
            </span>
            <span className={cn(i === step && "text-navy")}>{s}</span>
            {i < STEPS.length - 1 ? <span className="h-px w-4 bg-hairline" /> : null}
          </li>
        ))}
      </ol>

      {step === 0 ? (
        <div className="grid gap-4">
          <div>
            <h1 className="text-[20px] font-semibold text-navy">Name the household</h1>
            <p className="mt-1 text-[13px] text-ink-muted">One household, two people, everything shared.</p>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="hh">Household name</Label>
            <Input
              id="hh"
              value={household}
              onChange={(e) => setHousehold(e.target.value)}
              placeholder="e.g. Ade & P"
              autoFocus
            />
          </div>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="grid gap-4">
          <div>
            <h1 className="text-[20px] font-semibold text-navy">Both of you</h1>
            <p className="mt-1 text-[13px] text-ink-muted">
              You are person 1. Your partner gets a seat now and a login when they accept your invite. Incomes can wait
              if you're importing the workbook.
            </p>
          </div>
          {[0, 1].map((i) => (
            <div key={i} className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor={`n${i}`}>{i === 0 ? "Your name" : "Partner's name"}</Label>
                <Input
                  id={`n${i}`}
                  value={names[i]}
                  onChange={(e) => setNames((n) => n.map((x, j) => (j === i ? e.target.value : x)))}
                  disabled={membership !== null}
                  required
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={`i${i}`}>Monthly take-home</Label>
                <MoneyInput
                  id={`i${i}`}
                  valuePence={incomes[i]}
                  onChange={(v) => setIncomes((arr) => arr.map((x, j) => (j === i ? v : x)))}
                />
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {step === 2 ? (
        <div className="grid gap-4">
          <div>
            <h1 className="text-[20px] font-semibold text-navy">Bring your data</h1>
            <p className="mt-1 text-[13px] text-ink-muted">
              Import the v2 workbook (settings, categories, bills, goals, pledges, balances, transactions) or start
              blank.
            </p>
          </div>
          <div className="grid gap-2">
            {(
              [
                [
                  "import",
                  FileSpreadsheet,
                  "Import Ade_P_Finance_Tracker_v2.xlsx",
                  "Everything the spreadsheet knows, in one go. Names and incomes come from the workbook.",
                ],
                [
                  "blank",
                  Sparkles,
                  "Start blank",
                  "Set up categories, bills and goals yourself. The incomes you typed are saved.",
                ],
              ] as const
            ).map(([value, Icon, title, desc]) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                aria-pressed={mode === value}
                className={cn(
                  "flex items-start gap-3 rounded-lg border p-3 text-left",
                  mode === value ? "border-blue bg-blue/8" : "border-hairline hover:bg-row-hover",
                )}
              >
                <Icon className="mt-0.5 size-5 text-navy" aria-hidden />
                <span>
                  <span className="block text-[13.5px] font-medium text-navy">{title}</span>
                  <span className="block text-[12.5px] text-ink-muted">{desc}</span>
                </span>
              </button>
            ))}
          </div>
          {mode === "import" ? (
            <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-hairline bg-paper px-4 py-6 text-center text-[12.5px] text-ink-muted hover:bg-row-hover">
              <FileSpreadsheet className="size-6" aria-hidden />
              {file ? <span className="font-medium text-navy">{file.name}</span> : "Click to choose the .xlsx"}
              <input
                type="file"
                accept=".xlsx"
                className="sr-only"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
          ) : null}
        </div>
      ) : null}

      {step === 3 ? (
        <div className="grid gap-4">
          <div>
            <h1 className="text-[20px] font-semibold text-navy">The 10-minute routine</h1>
            <p className="mt-1 text-[13px] text-ink-muted">Same as the spreadsheet, just from your phone.</p>
          </div>
          <ol className="grid gap-2 text-[13px] leading-6">
            {[
              "Log spending with the + button as it happens. Turn on Shared when it's for both of you.",
              "At month end, type pot balances into Pots and account balances into Net Worth.",
              "Glance at the Dashboard together: leftover, who owes whom, overdue bills, goal status, net worth.",
            ].map((t, i) => (
              <li key={t} className="flex gap-3">
                <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-navy text-[12px] font-semibold text-white">
                  {i + 1}
                </span>
                <span>{t}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {error ? (
        <p className="text-[12.5px] font-medium text-brick" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0 || busy || (step === 2 && membership !== null)}
        >
          Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={next} disabled={busy}>
            {busy ? "Saving…" : "Continue"} <ArrowRight />
          </Button>
        ) : (
          <Button
            onClick={() => {
              router.push("/");
              router.refresh();
            }}
          >
            Open the dashboard <ArrowRight />
          </Button>
        )}
      </div>
    </div>
  );
}
