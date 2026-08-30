"use client";

import { ArrowRight, Check, FileSpreadsheet, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MoneyInput } from "@/components/domain/money-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const STEPS = ["Household", "People", "Data", "Routine"];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [household, setHousehold] = useState("Ade & P");
  const [names, setNames] = useState(["Ade", "P"]);
  const [incomes, setIncomes] = useState<(number | null)[]>([340_000, 260_000]);
  const [mode, setMode] = useState<"import" | "blank">("import");

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
            <Input id="hh" value={household} onChange={(e) => setHousehold(e.target.value)} />
          </div>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="grid gap-4">
          <div>
            <h1 className="text-[20px] font-semibold text-navy">Both of you</h1>
            <p className="mt-1 text-[13px] text-ink-muted">
              Names and monthly take-home. You can change these on Settings and My Money later.
            </p>
          </div>
          {[0, 1].map((i) => (
            <div key={i} className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor={`n${i}`}>Person {i + 1}</Label>
                <Input
                  id={`n${i}`}
                  value={names[i]}
                  onChange={(e) => setNames((n) => n.map((x, j) => (j === i ? e.target.value : x)))}
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
                  "Everything the spreadsheet knows, in one go. Checked against the workbook's own totals.",
                ],
                ["blank", Sparkles, "Start blank", "Set up categories, bills and goals yourself."],
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
              Drop the .xlsx here or click to choose
              <input type="file" accept=".xlsx" className="sr-only" />
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

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep((s) => s + 1)}>
            Continue <ArrowRight />
          </Button>
        ) : (
          <Button onClick={() => router.push("/")}>
            Open the dashboard <ArrowRight />
          </Button>
        )}
      </div>
    </div>
  );
}
