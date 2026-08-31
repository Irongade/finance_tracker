import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-paper px-6 text-center">
      <p className="display text-[26px] text-navy">There's no page here.</p>
      <p className="max-w-sm text-[13px] text-ink-muted">
        The address may have changed. Everything starts from the dashboard.
      </p>
      <Button asChild>
        <Link href="/dashboard">Go to the dashboard</Link>
      </Button>
    </div>
  );
}
