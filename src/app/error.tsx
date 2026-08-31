"use client";

import { RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/** Route-level failures: state what happened and what to do next, without apology (section 7.2). */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-paper px-6 text-center">
      <p className="display text-[26px] text-navy">That didn't load.</p>
      <p className="max-w-sm text-[13px] text-ink-muted">
        Your data is safe in the database; this page just failed to render. Try again, and if it keeps happening check
        the server logs
        {error.digest ? ` (error ${error.digest})` : ""}.
      </p>
      <div className="flex gap-2">
        <Button onClick={reset}>
          <RotateCcw /> Try again
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Go to the dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
