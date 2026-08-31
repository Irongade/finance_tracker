import { Skeleton } from "@/components/ui/skeleton";

/** Skeleton cards, never spinners over full pages (section 7.5). */
export default function Loading() {
  return (
    <div className="flex flex-col gap-4" aria-busy>
      <div className="mb-2 space-y-2">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-9 w-80" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    </div>
  );
}
