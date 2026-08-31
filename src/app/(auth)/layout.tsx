import Link from "next/link";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-paper px-4 py-10">
      <Link href="/" className="display mb-6 text-[28px] text-navy">
        Finance Tracker
      </Link>
      <div className="w-full max-w-md rounded-[10px] border border-hairline bg-surface p-6 shadow-[0_12px_40px_rgb(27_42_68/0.08)] md:p-8">
        {children}
      </div>
      <p className="mt-6 max-w-md text-center text-[11.5px] text-ink-muted">
        Two accounts, one household. Everything stays in your own database.
      </p>
    </div>
  );
}
