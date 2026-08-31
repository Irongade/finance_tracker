"use client";

import { ArrowLeftRight } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/domain/confirm-dialog";
import { PersonBadge } from "@/components/domain/person-badge";
import { SectionCard } from "@/components/domain/section-card";
import { Button } from "@/components/ui/button";
import { ApiError, api } from "@/lib/api";
import { useHousehold } from "@/store/household-store";

/**
 * Shows which login is attached to which person. If the wrong person
 * registered first (the workbook import assumes person 1 registered), the
 * names look swapped relative to the sign-ins; this fixes the binding without
 * touching any data.
 */
export function SwapLoginsCard() {
  const { users, currentUserId } = useHousehold();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const bothLinked = users.every((u) => u.email);

  return (
    <SectionCard
      title="Who signs in as whom"
      description="Every transaction, pledge and bill belongs to a person; the email is just their key."
    >
      <ul className="grid gap-2">
        {users.map((u) => (
          <li key={u.id} className="flex items-center gap-2 text-[13px]">
            <PersonBadge owner={{ kind: "user", userId: u.id }} users={users} size="sm" withName />
            <span className="text-ink-muted">
              {u.email ? `signs in as ${u.email}` : "hasn't joined yet"}
              {u.id === currentUserId ? " (you)" : ""}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[12px] text-ink-muted">
          Wrong way round? Swapping moves the sign-ins, not the data or the names.
        </p>
        <Button variant="outline" size="sm" disabled={!bothLinked} onClick={() => setConfirming(true)} pending={busy}>
          <ArrowLeftRight /> Swap sign-ins
        </Button>
      </div>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Swap the sign-ins?"
        description={`${users[0].email ?? "?"} becomes ${users[1].name}, and ${users[1].email ?? "?"} becomes ${users[0].name}. Nothing else changes.`}
        confirmLabel="Swap"
        onConfirm={() => {
          setBusy(true);
          void api({ method: "POST", url: "/api/household/swap-logins" })
            .then(() => {
              toast.success("Sign-ins swapped");
              window.location.reload();
            })
            .catch((e) => {
              setBusy(false);
              toast.error("Could not swap", { description: e instanceof ApiError ? e.message : undefined });
            });
        }}
      />
    </SectionCard>
  );
}
