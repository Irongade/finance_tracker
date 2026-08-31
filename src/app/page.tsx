import { ArrowRight, CalendarCheck, PiggyBank, Scale } from "lucide-react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { auth } from "@/server/auth/auth";

export const metadata: Metadata = { title: "Finance Tracker" };

/** The front door: public, quiet, and straight to sign-in. Signed-in visitors skip it. */
export default async function LandingPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect("/dashboard");

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <header className="mx-auto flex w-full max-w-4xl items-center justify-between px-6 py-5">
        <span className="display text-[20px] text-navy">Finance Tracker</span>
        <Button asChild variant="outline" size="sm">
          <Link href="/login">Sign in</Link>
        </Button>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-6 py-12">
        <p className="display max-w-2xl text-balance text-[34px] leading-[1.15] text-navy md:text-[44px]">
          One ledger for the two of you. <span className="text-blue">£2,155 left this month</span> — and you both know
          it.
        </p>
        <p className="mt-4 max-w-xl text-[15px] leading-7 text-ink-muted">
          Log spending from your phone in seconds, see who owes whom, keep every bill, pot and goal honest — and close
          each month in five minutes. Two accounts, one household, your own database.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button asChild size="lg">
            <Link href="/login">
              Sign in <ArrowRight />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="lg">
            <Link href="/register">Create your household</Link>
          </Button>
        </div>

        <dl className="mt-14 grid gap-6 sm:grid-cols-3">
          {[
            {
              icon: Scale,
              title: "Settle-up, always current",
              body: "Shared costs paid from a personal account build the balance; one tap records the payment and you're all square.",
            },
            {
              icon: CalendarCheck,
              title: "Bills that speak plainly",
              body: "Paid, Due, OVERDUE — per calendar month, with budgets derived straight from the bills themselves.",
            },
            {
              icon: PiggyBank,
              title: "Pots, goals and the house",
              body: "LISA bonuses, required-per-month, a 24-month forecast and what home you could afford at the end of it.",
            },
          ].map((f) => (
            <div key={f.title} className="rounded-[10px] border border-hairline bg-surface p-5">
              <f.icon className="size-5 text-blue" aria-hidden />
              <dt className="mt-3 text-[14px] font-semibold text-navy">{f.title}</dt>
              <dd className="mt-1 text-[13px] leading-6 text-ink-muted">{f.body}</dd>
            </div>
          ))}
        </dl>
      </main>

      <footer className="mx-auto w-full max-w-4xl px-6 py-6 text-[12px] text-ink-muted">
        Private by construction: no trackers, no third parties — your numbers never leave your own database.
      </footer>
    </div>
  );
}
