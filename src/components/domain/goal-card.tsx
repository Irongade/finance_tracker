"use client";

import { Archive, ArrowRightLeft, Ellipsis, ShieldCheck, TriangleAlert } from "lucide-react";
import { Chip, GoalStatusChip } from "@/components/domain/chips";
import { MoneyInput } from "@/components/domain/money-input";
import { MoneyText } from "@/components/domain/money-text";
import { PersonBadge } from "@/components/domain/person-badge";
import { ProgressBar } from "@/components/domain/progress-bar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatMonth } from "@/domain/dates";
import { formatPence } from "@/domain/money";
import type { GoalView, User } from "@/domain/types";

export interface GoalCardProps {
  goal: GoalView;
  users: [User, User];
  lisaAnnualAllowancePence: number;
  onPledgeChange: (userId: string, monthlyPence: number) => void;
  onArchive: () => void;
  onSetEmergency: () => void;
  onLogTransfer: () => void;
}

export function GoalCard({
  goal,
  users,
  lisaAnnualAllowancePence,
  onPledgeChange,
  onArchive,
  onSetEmergency,
  onLogTransfer,
}: GoalCardProps) {
  const g = goal.goal;
  const pct = Math.round(goal.progress * 100);
  return (
    <article className="fade-in flex min-w-0 flex-col gap-4 rounded-[10px] border border-hairline bg-surface p-5">
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="text-[16px] font-semibold leading-6 text-navy">{g.name}</h3>
            {g.type === "lisa" ? <Chip tone="info">LISA</Chip> : null}
            {g.isEmergencyFund ? (
              <Chip tone="positive">
                <ShieldCheck className="size-3" aria-hidden /> Emergency fund
              </Chip>
            ) : null}
          </div>
          <p className="mt-0.5 text-[12.5px] text-ink-muted">
            Target {formatMonth(`${g.targetDate.slice(0, 7)}-01`, "short")} · {goal.monthsLeft}{" "}
            {goal.monthsLeft === 1 ? "month" : "months"} left
            {goal.savedMonth ? ` · balance from ${formatMonth(goal.savedMonth)}` : " · no balance yet"}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="-mr-2 -mt-1 text-ink-muted"
              aria-label={`Actions for ${g.name}`}
            >
              <Ellipsis />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onLogTransfer}>
              <ArrowRightLeft /> Log a transfer
            </DropdownMenuItem>
            {!g.isEmergencyFund ? (
              <DropdownMenuItem onSelect={onSetEmergency}>
                <ShieldCheck /> Mark as emergency fund
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={onArchive}>
              <Archive /> Archive goal
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div>
        <div className="mb-1.5 flex items-baseline justify-between">
          <span className="text-[13px]">
            <MoneyText pence={goal.savedPence} style="whole" className="text-[18px] text-navy" />{" "}
            <span className="text-ink-muted">of {formatPence(g.targetPence, { style: "whole" })}</span>
          </span>
          <span className="money text-[13px] text-ink-muted">{pct}%</span>
        </div>
        <ProgressBar
          value={goal.progress}
          tone={goal.status.kind === "on_track" ? "positive" : "blue"}
          label={`${g.name} progress`}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {users.map((u) => {
          const pledge = g.pledges.find((p) => p.userId === u.id)?.monthlyPence ?? 0;
          const breach = goal.lisaWarnings.includes(u.id);
          return (
            <div key={u.id} className="flex flex-col gap-1">
              <label
                htmlFor={`pledge-${g.id}-${u.id}`}
                className="flex items-center gap-1.5 text-[12px] text-ink-muted"
              >
                <PersonBadge owner={{ kind: "user", userId: u.id }} users={users} size="xs" /> {u.name} £/mo
              </label>
              <MoneyInput
                id={`pledge-${g.id}-${u.id}`}
                size="sm"
                valuePence={pledge}
                onChange={(v) => onPledgeChange(u.id, v ?? 0)}
                invalid={breach}
              />
              {breach ? (
                <p className="flex items-center gap-1 text-[11.5px] font-medium text-brick">
                  <TriangleAlert className="size-3" aria-hidden /> Breaches{" "}
                  {formatPence(lisaAnnualAllowancePence, { style: "whole" })}/yr allowance
                </p>
              ) : null}
            </div>
          );
        })}
      </div>

      <dl className="grid grid-cols-3 gap-2 border-t border-hairline pt-3 text-[12.5px]">
        <div>
          <dt className="text-ink-muted">Total £/mo</dt>
          <dd>
            <MoneyText pence={goal.pledgeTotalPence} style="whole" />
          </dd>
        </div>
        <div>
          <dt className="text-ink-muted">{g.type === "lisa" ? "LISA bonus" : "Interest AER"}</dt>
          <dd>
            {g.type === "lisa" ? (
              <MoneyText pence={goal.lisaBonusPence} />
            ) : (
              <span className="money">{(g.aer * 100).toFixed(1)}%</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-ink-muted">Required £/mo</dt>
          <dd>
            <MoneyText pence={goal.requiredPence} />
          </dd>
        </div>
      </dl>
      <div>
        <GoalStatusChip status={goal.status} />
      </div>
    </article>
  );
}
