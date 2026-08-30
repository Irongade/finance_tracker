import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Card: 10px radius, 1px border, no shadow, 20-24px padding (section 7.2). */
export function SectionCard({
  title,
  description,
  action,
  children,
  className,
  contentClassName,
  flush = false,
}: {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  /** no inner padding, for tables and lists that run edge to edge */
  flush?: boolean;
}) {
  return (
    <section className={cn("fade-in min-w-0 rounded-[10px] border border-hairline bg-surface", className)}>
      {title || action ? (
        <header className={cn("flex items-start justify-between gap-3 px-5 pt-5 md:px-6", flush ? "pb-3" : "pb-3")}>
          <div className="min-w-0">
            {title ? <h2 className="text-[16px] font-semibold leading-6 text-navy">{title}</h2> : null}
            {description ? <p className="mt-0.5 text-[13px] text-ink-muted">{description}</p> : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </header>
      ) : null}
      <div
        className={cn(
          flush ? "" : "px-5 pb-5 md:px-6 md:pb-6",
          !title && !action && !flush && "pt-5 md:pt-6",
          contentClassName,
        )}
      >
        {children}
      </div>
    </section>
  );
}

/** Label/value line used inside cards for budget breakdowns. */
export function LineItem({
  label,
  value,
  emphasis = false,
  muted = false,
  indent = false,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  emphasis?: boolean;
  muted?: boolean;
  indent?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-4 py-1.5",
        emphasis && "mt-1 border-t border-hairline pt-2.5 font-semibold text-navy",
        muted && "text-ink-muted",
        indent && "pl-4",
        className,
      )}
    >
      <span className="text-[13px]">{label}</span>
      <span className="text-[13px]">{value}</span>
    </div>
  );
}
