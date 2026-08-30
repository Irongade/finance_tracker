import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** 28-32px figure, quiet label, optional sub-line and action. */
export function KpiCard({
  label,
  value,
  sub,
  action,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "fade-in flex min-w-0 flex-col gap-1 rounded-[10px] border border-hairline bg-surface p-5",
        className,
      )}
    >
      <p className="text-[12.5px] font-medium tracking-wide text-ink-muted">{label}</p>
      <div className="text-[28px] leading-none text-navy md:text-[30px]">{value}</div>
      {sub ? <div className="mt-1 text-[12.5px] text-ink-muted">{sub}</div> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
