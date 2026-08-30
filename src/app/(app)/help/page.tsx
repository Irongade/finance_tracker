import type { Metadata } from "next";
import Link from "next/link";
import { SectionCard } from "@/components/domain/section-card";
import { NAV_ITEMS } from "@/components/shell/nav";
import { PageHeader } from "@/components/shell/page-header";

export const metadata: Metadata = { title: "Help" };

const STEP_KEYS = ["log", "month-end", "glance"];

const TAB_NOTES: Record<string, string> = {
  "/": "The combined view. All calculated, nothing to edit.",
  "/transactions": "Log everything; Type comes from the category. The Shared toggle powers the settle-up.",
  "/bills": "Joint and personal recurring bills, with live Paid / Due / OVERDUE status.",
  "/goals": "The pots you both pay into: pledges per person, LISA bonus, Required £/mo, On track or Behind.",
  "/my-money":
    "Income, personal bills, share of joint costs, contributions, leftover, and what's left of it this month.",
  "/budgets": "Budget vs actual, 12 rolling months, fixed and variable kept separate.",
  "/pots": "Actual pot balances, typed in monthly. Anchors Saved so far and the forecast.",
  "/investments": "Account-level investments: month-end values, contributions as transfers, growth projection.",
  "/forecast": "24-month projection from the latest balances, incl LISA bonuses.",
  "/debts": "Balances, payoff dates, avalanche vs snowball order. Feeds My Money and net worth. Empty is fine.",
  "/net-worth": "Everyday accounts + goal pots + investments − debts.",
  "/settings": "Names, the split rule, LISA assumptions, mortgage multiple, categories, export, invite.",
  "/help": "This page.",
};

export default function HelpPage() {
  return (
    <>
      <PageHeader title="Help" description="The workbook's Read Me, for the app. Same 10-minute routine." />
      <div className="grid gap-4 md:grid-cols-2">
        <SectionCard title="The monthly routine" description="About 10 minutes">
          <ol className="grid gap-2 text-[13px] leading-6 [counter-reset:step]">
            {[
              <>
                Log spending on{" "}
                <Link className="text-blue hover:underline" href="/transactions">
                  Transactions
                </Link>{" "}
                as it happens (or in one batch). Turn on Shared when it's for both of you.
              </>,
              <>
                At month end, type each pot's actual balance into{" "}
                <Link className="text-blue hover:underline" href="/pots">
                  Pots
                </Link>
                , investment values into{" "}
                <Link className="text-blue hover:underline" href="/investments">
                  Investments
                </Link>
                , and your everyday balances into{" "}
                <Link className="text-blue hover:underline" href="/net-worth">
                  Net Worth
                </Link>
                .
              </>,
              <>
                Glance at the{" "}
                <Link className="text-blue hover:underline" href="/">
                  Dashboard
                </Link>{" "}
                together: leftover, who owes whom, overdue bills, goal status, net worth.
              </>,
            ].map((step, i) => (
              <li key={STEP_KEYS[i]} className="flex gap-3">
                <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-navy text-[12px] font-semibold text-white">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </SectionCard>

        <SectionCard title="How the colours work">
          <ul className="grid gap-2 text-[13px]">
            <li className="flex items-center gap-2">
              <span className="size-3 rounded-full bg-blue" /> Blue = an action or a link.
            </li>
            <li className="flex items-center gap-2">
              <span className="size-3 rounded-full bg-mint ring-1 ring-fern/40" /> Green = Paid, On track, gains.
            </li>
            <li className="flex items-center gap-2">
              <span className="size-3 rounded-full bg-blush ring-1 ring-brick/40" /> Red = OVERDUE, Behind, over budget,
              losses.
            </li>
            <li className="flex items-center gap-2">
              <span className="size-3 rounded-full bg-butter ring-1 ring-amber/40" /> Yellow = Due, or an assumption
              worth double-checking.
            </li>
            <li className="flex items-center gap-2">
              <span className="size-3 rounded-full bg-ade-teal" />
              <span className="-ml-1 size-3 rounded-full bg-p-plum" /> Teal and plum mark who paid or owns something.
            </li>
          </ul>
        </SectionCard>

        <SectionCard className="md:col-span-2" title="What each page does" flush>
          <ul className="divide-y divide-hairline text-[13px]">
            {NAV_ITEMS.map((item) => (
              <li key={item.href} className="flex items-start gap-3 px-5 py-2.5 md:px-6">
                <item.icon className="mt-0.5 size-4 shrink-0 text-ink-muted" aria-hidden />
                <div>
                  <Link href={item.href} className="font-medium text-navy hover:underline">
                    {item.label}
                  </Link>
                  <p className="text-ink-muted">{TAB_NOTES[item.href]}</p>
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard className="md:col-span-2" title="Things worth knowing">
          <ul className="grid gap-2 text-[13px] leading-6 text-ink">
            <li>
              <strong>Settle-up:</strong> a shared cost paid from a personal account builds up what the other person
              owes you (at your Settings split, or the per-row override). Joint-account payments and savings transfers
              are excluded. Record a payment with Settle up to net it off.
            </li>
            <li>
              <strong>Bill status:</strong> link the payment to the bill on the add form (it's pre-selected when the
              description contains the bill name). Direct debits you don't log just show as Due or OVERDUE; the budget
              is still right.
            </li>
            <li>
              <strong>LISAs are per person:</strong> £4,000/year each, 25% bonus. A pledge over the allowance turns red.
            </li>
            <li>
              <strong>Required £/mo</strong> vs your pledged £/mo (incl bonus) drives the On track / Behind flags.
            </li>
            <li>
              <strong>Emergency fund:</strong> mark one goal as the emergency fund on Goals; the dashboard measures
              months of cover against all bills.
            </li>
            <li>
              <strong>Investments:</strong> one row per account, not per holding. Type the value at month end and log
              contributions as Investment contribution transfers linked to the account.
            </li>
            <li>
              <strong>ISAs:</strong> £20,000/year allowance per person across cash ISAs, S&S ISAs and LISAs (LISA money
              counts toward it).
            </li>
          </ul>
        </SectionCard>
      </div>
    </>
  );
}
