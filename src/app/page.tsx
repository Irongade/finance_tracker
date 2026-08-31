import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { auth } from "@/server/auth/auth";

export const metadata: Metadata = { title: "Daybook" };

const TICKER = [
  "Logged in ten seconds",
  "Settled up in one tap",
  "Month closed in five minutes",
  "No trackers, ever",
  "Your numbers, your database",
];

const LEDGER_ROWS = [
  { date: "01 Aug", description: "Rent", amount: "£1,200.00", chip: "Paid", tone: "bg-mint text-fern" },
  { date: "05 Aug", description: "Big shop", amount: "£82.40", chip: "Shared", tone: "bg-blue/10 text-navy" },
  { date: "12 Aug", description: "Petrol — P paid", amount: "£55.00", chip: "Shared", tone: "bg-blue/10 text-navy" },
  {
    date: "20 Aug",
    description: "Water",
    amount: "£45.00",
    chip: "OVERDUE",
    tone: "bg-blush text-brick font-semibold",
  },
  {
    date: "25 Aug",
    description: "Transfer to Ade's LISA",
    amount: "£250.00",
    chip: "+25% bonus",
    tone: "bg-mint text-fern",
  },
];

const INDEX = [
  {
    no: "01",
    title: "Settle-up, to the penny",
    body: "A shared cost paid from one pocket builds the balance; one tap nets it back to zero. Nobody keeps score, because the ledger already did.",
  },
  {
    no: "02",
    title: "Bills that speak plainly",
    body: "Paid. Due. OVERDUE. The workbook's own vocabulary, live for every calendar month — with the budgets derived straight from the bills.",
  },
  {
    no: "03",
    title: "Pots with opinions",
    body: "LISA bonuses counted as the free money they are, “Behind by £58” said out loud, and every goal projected 24 months forward.",
  },
  {
    no: "04",
    title: "The house at the end of it",
    body: "Both LISAs plus a lender's multiple: the price of the home your pots could buy two years from now, always in view.",
  },
  {
    no: "05",
    title: "Private by construction",
    body: "Two accounts, one household, one Postgres you own. No trackers, no third parties, and a CSV of everything whenever you want out.",
  },
];

/** The front door: the workbook, typeset. Signed-in visitors skip straight past it. */
export default async function LandingPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect("/dashboard");

  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-clip bg-paper">
      {/* account-book ruling with the classic red margin line */}
      <div className="pointer-events-none absolute inset-0 ledger-paper opacity-70" aria-hidden />
      <div
        className="pointer-events-none absolute inset-y-0 left-6 hidden w-px bg-brick/25 md:left-14 md:block"
        aria-hidden
      />

      <header className="relative mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6 md:px-20">
        <span className="display text-[20px] text-navy">Daybook</span>
        <Button asChild variant="outline" size="sm" className="bg-surface">
          <Link href="/login">Sign in</Link>
        </Button>
      </header>

      <main className="relative mx-auto w-full max-w-5xl flex-1 px-6 md:px-20">
        <section className="grid items-center gap-12 py-12 md:grid-cols-[7fr_5fr] md:py-20">
          <div>
            <p
              className="rise text-[12px] font-semibold tracking-[0.22em] text-brick uppercase"
              style={{ animationDelay: "0.05s" }}
            >
              The household ledger for two
            </p>
            <h1
              className="display rise mt-4 text-balance text-[42px] leading-[1.06] text-navy md:text-[60px]"
              style={{ animationDelay: "0.15s" }}
            >
              Love is patient.
              <br />
              Money shouldn't have to be.
            </h1>
            <p className="rise mt-6 max-w-md text-[15.5px] leading-7 text-ink-muted" style={{ animationDelay: "0.3s" }}>
              One shared ledger that says it straight —{" "}
              <span className="font-semibold text-navy">who paid, who owes, what's left</span> — from the weekly shop to
              the house you're saving for. Ten seconds to log it, five minutes to close the month.
            </p>
            <div className="rise mt-8 flex flex-wrap items-center gap-3" style={{ animationDelay: "0.45s" }}>
              <Button asChild size="lg" className="h-11 px-5">
                <Link href="/login">
                  Open the ledger <ArrowRight />
                </Link>
              </Button>
              <Button asChild variant="ghost" size="lg" className="h-11">
                <Link href="/register">Start your household</Link>
              </Button>
            </div>
          </div>

          {/* a page torn from the app itself, real numbers included */}
          <figure
            className="rise md:-rotate-[1.4deg]"
            style={{ animationDelay: "0.55s" }}
            aria-label="A sample month in the ledger"
          >
            <div className="rounded-[10px] border border-hairline bg-surface shadow-[0_24px_60px_-24px_rgb(31_56_100/0.35)]">
              <figcaption className="flex items-baseline justify-between border-b border-hairline px-5 py-3">
                <span className="text-[11px] font-semibold tracking-[0.18em] text-ink-muted uppercase">
                  August · the log
                </span>
                <span className="money text-[12px] text-ink-muted">page 1 of 1</span>
              </figcaption>
              <ul className="px-5 py-1">
                {LEDGER_ROWS.map((row) => (
                  <li
                    key={row.description}
                    className="flex items-center gap-3 border-b border-hairline py-2.5 text-[13px] last:border-b-0"
                  >
                    <span className="money w-12 shrink-0 text-[11.5px] text-ink-muted">{row.date}</span>
                    <span className="min-w-0 flex-1 truncate font-medium text-ink">{row.description}</span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] ${row.tone}`}>{row.chip}</span>
                    <span className="money w-20 shrink-0 text-right">{row.amount}</span>
                  </li>
                ))}
              </ul>
              <div className="border-t border-hairline bg-row-hover/50 px-5 py-4">
                <div className="relative h-7 overflow-hidden" aria-live="off">
                  <p
                    className="display absolute inset-0 text-[19px] text-navy"
                    style={{ animation: "settle-owes 9s ease-in-out infinite" }}
                  >
                    Ade owes P <span className="tabular-nums">£27.50</span>.
                  </p>
                  {/* opacity-0 base state: when animations are off (reduced motion), only the first sentence shows */}
                  <p
                    className="display absolute inset-0 text-[19px] text-fern opacity-0"
                    style={{ animation: "settle-square 9s ease-in-out infinite" }}
                  >
                    All square. <span className="text-[13px] align-middle">✓</span>
                  </p>
                </div>
                <p className="mt-1 text-[11.5px] text-ink-muted">
                  Settle-up, computed from every shared row — then netted with one tap.
                </p>
              </div>
            </div>
          </figure>
        </section>

        {/* the promises, on a slow loop */}
        <section
          className="rise relative -mx-6 overflow-hidden border-y border-hairline bg-surface/70 py-3 md:-mx-20"
          style={{ animationDelay: "0.7s" }}
          aria-hidden
        >
          <div className="flex w-max" style={{ animation: "ticker 36s linear infinite" }}>
            {[0, 1].map((copy) => (
              <div key={copy} className="flex shrink-0 items-center">
                {TICKER.map((t) => (
                  <span
                    key={`${copy}-${t}`}
                    className="flex items-center whitespace-nowrap px-6 text-[12.5px] font-medium tracking-wide text-ink-muted"
                  >
                    {t}
                    <span className="ml-12 text-brick/50">✦</span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </section>

        {/* the index, set like ledger entries */}
        <section className="py-14 md:py-20">
          <h2
            className="rise text-[12px] font-semibold tracking-[0.22em] text-ink-muted uppercase"
            style={{ animationDelay: "0.2s" }}
          >
            Contents
          </h2>
          <ol className="mt-4">
            {INDEX.map((entry, i) => (
              <li
                key={entry.no}
                className="rise group border-b border-hairline"
                style={{ animationDelay: `${0.3 + i * 0.08}s` }}
              >
                <div className="grid gap-1 py-5 md:grid-cols-[80px_260px_1fr] md:gap-6">
                  <span className="money text-[13px] text-brick/70 transition-colors group-hover:text-brick">
                    {entry.no}
                  </span>
                  <h3 className="display text-[20px] leading-tight text-navy">{entry.title}</h3>
                  <p className="max-w-xl text-[13.5px] leading-6 text-ink-muted">{entry.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* closing line, spoken the way the app speaks */}
        <section className="pb-20 text-center">
          <p className="display mx-auto max-w-2xl text-balance text-[28px] leading-[1.2] text-navy md:text-[36px]">
            “<span className="text-blue tabular-nums">£2,155</span> left this month — and you <em>both</em> know it.”
          </p>
          <p className="mt-3 text-[13px] text-ink-muted">The ledger speaks in sentences. Yours are waiting.</p>
          <Button asChild size="lg" className="mt-6 h-11 px-6">
            <Link href="/register">
              Start your household <ArrowRight />
            </Link>
          </Button>
        </section>
      </main>

      <footer className="relative border-t border-hairline">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-2 px-6 py-5 text-[12px] text-ink-muted md:px-20">
          <span>Balanced nightly. Argued about never.</span>
          <span>No trackers · no third parties · export everything, any time</span>
        </div>
      </footer>
    </div>
  );
}
