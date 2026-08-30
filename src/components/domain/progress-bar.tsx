import { cn } from "@/lib/utils";

export type BarTone = "blue" | "navy" | "positive" | "negative" | "ade" | "p";

const TONE: Record<BarTone, string> = {
  blue: "bg-blue",
  navy: "bg-navy",
  positive: "bg-fern",
  negative: "bg-brick",
  ade: "bg-ade-teal",
  p: "bg-p-plum",
};

export function ProgressBar({
  value,
  tone = "blue",
  className,
  label,
}: {
  value: number;
  tone?: BarTone;
  className?: string;
  label?: string;
}) {
  const pct = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0)) * 100;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-row-hover", className)}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-300 ease-out", TONE[tone])}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
