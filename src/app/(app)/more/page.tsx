"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { SectionCard } from "@/components/domain/section-card";
import { MOBILE_PRIMARY } from "@/components/shell/nav";
import { PageHeader } from "@/components/shell/page-header";
import { useNavOrder } from "@/hooks/use-nav-order";

export default function MorePage() {
  const { items } = useNavOrder();
  const rest = items.filter((i) => !MOBILE_PRIMARY.includes(i.href));
  return (
    <>
      <PageHeader title="More" />
      <SectionCard flush>
        <ul className="divide-y divide-hairline">
          {rest.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex items-center gap-3 px-4 py-3.5 text-[14px] font-medium text-ink hover:bg-row-hover"
              >
                <item.icon className="size-5 text-ink-muted" aria-hidden />
                <span className="flex-1">{item.label}</span>
                <ChevronRight className="size-4 text-ink-muted" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </SectionCard>
    </>
  );
}
