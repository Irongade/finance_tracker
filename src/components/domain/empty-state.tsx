import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Empty states are invitations with one primary action (section 7.2). */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 px-6 py-10 text-center", className)}>
      {Icon ? (
        <span className="mb-1 inline-flex size-10 items-center justify-center rounded-full bg-row-hover text-ink-muted">
          <Icon className="size-5" aria-hidden />
        </span>
      ) : null}
      <p className="text-[15px] font-semibold text-navy">{title}</p>
      {description ? <p className="max-w-sm text-[13px] text-ink-muted">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
