"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PasswordInput } from "@/components/domain/password-input";
import { SectionCard } from "@/components/domain/section-card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

export function ChangePasswordCard() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <SectionCard title="Change password" description="Other devices are signed out when it changes.">
      <form
        className="grid gap-3 sm:grid-cols-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          setBusy(true);
          setError(null);
          const { error } = await authClient.changePassword({
            currentPassword: current,
            newPassword: next,
            revokeOtherSessions: true,
          });
          setBusy(false);
          if (error) {
            setError(error.message ?? "Could not change the password.");
            return;
          }
          setCurrent("");
          setNext("");
          toast.success("Password changed");
        }}
      >
        <div className="grid gap-1.5">
          <Label htmlFor="pw-current">Current password</Label>
          <PasswordInput
            id="pw-current"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            required
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="pw-new">New password</Label>
          <PasswordInput
            id="pw-new"
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            minLength={8}
            required
          />
        </div>
        {error ? (
          <p className="text-[12.5px] font-medium text-brick sm:col-span-2" role="alert">
            {error}
          </p>
        ) : null}
        <div className="sm:col-span-2">
          <Button type="submit" pending={busy}>
            Change password
          </Button>
        </div>
      </form>
    </SectionCard>
  );
}
