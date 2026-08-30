import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Page title in Fraunces; everything else stays quiet. */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-5 flex flex-wrap items-end justify-between gap-3 md:mb-6", className)}>
      <div className="min-w-0">
        <h1 className="display text-[26px] leading-tight text-navy md:text-[30px]">{title}</h1>
        {description ? <p className="mt-1 text-[13px] text-ink-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
