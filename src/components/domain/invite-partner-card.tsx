"use client";

import { Check, Copy, Link2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PersonBadge } from "@/components/domain/person-badge";
import { SectionCard } from "@/components/domain/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/domain/dates";
import { ApiError, api } from "@/lib/api";
import { useHousehold } from "@/store/household-store";

/** Section 3: the first account invites the second with a one-time link (48 h). */
export function InvitePartnerCard() {
  const { users } = useHousehold();
  const partner = users[1];
  const [link, setLink] = useState<{ url: string; expiresAt: string; emailed: boolean } | null>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const create = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const data = await api<{ url: string; expiresAt: string; emailed: boolean }>({
        method: "POST",
        url: "/api/invites",
        body: email.trim() ? { email: email.trim() } : {},
      });
      setLink(data);
      if (email.trim()) {
        if (data.emailed) toast.success("Invite emailed", { description: email.trim() });
        else toast("Email isn't set up on the server", { description: "Copy the link and send it yourself." });
      }
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not create the link");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SectionCard
      title="Invite your partner"
      description="No public signup: one account creates the household and invites the other with a one-time link."
    >
      {partner.email ? (
        <p className="flex items-center gap-2 text-[13px] text-fern">
          <Check className="size-4" aria-hidden />{" "}
          <PersonBadge owner={{ kind: "user", userId: partner.id }} users={users} size="xs" /> {partner.name} has joined
          ({partner.email}).
        </p>
      ) : link ? (
        <div className="grid gap-2">
          <div className="flex items-center gap-2">
            <Input readOnly value={link.url} className="h-8 flex-1 text-[12px]" aria-label="Invite link" />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard?.writeText(link.url);
                toast.success("Link copied");
              }}
            >
              <Copy /> Copy
            </Button>
          </div>
          <p className="text-[12px] text-ink-muted">
            Works once, until {formatDate(link.expiresAt.slice(0, 10), "long")}. Send it to {partner.name} however you
            like.
          </p>
        </div>
      ) : (
        <div className="grid gap-2">
          <p className="text-[13px] text-ink-muted">
            {partner.name} hasn't joined yet. Their pledges and bills are already here; the link just gives them a
            login.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={`${partner.name}'s email (optional)`}
              aria-label="Partner's email"
              className="h-8 w-56"
            />
            <Button onClick={create} pending={busy}>
              <Link2 /> {email.trim() ? "Email the invite" : "Create invite link"}
            </Button>
          </div>
        </div>
      )}
      <p className="mt-3 text-[12px] text-ink-muted">
        Both accounts have identical permissions. Everything is scoped to this household.
      </p>
    </SectionCard>
  );
}
