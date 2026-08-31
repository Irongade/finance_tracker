"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PasswordInput } from "@/components/domain/password-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

export function InviteForm({
  householdName,
  inviterName,
  memberName,
}: {
  householdName: string;
  inviterName: string;
  memberName: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(memberName);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="grid gap-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        const { error } = await authClient.signUp.email({ name, email, password });
        setBusy(false);
        if (error) {
          setError(error.message ?? "Could not create the account.");
          return;
        }
        router.push("/dashboard");
        router.refresh();
      }}
    >
      <div>
        <h1 className="text-[20px] font-semibold text-navy">You're invited</h1>
        <p className="mt-1 text-[13px] text-ink-muted">
          {inviterName} set up <strong>{householdName}</strong> and invited you to join as {memberName}. Pick a
          password; you'll both see the same data live.
        </p>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="name">Your name</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="password">Password</Label>
        <PasswordInput
          id="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
          minLength={8}
          required
        />
      </div>
      {error ? (
        <p className="text-[12.5px] font-medium text-brick" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={busy}>
        {busy ? "Joining…" : "Join the household"}
      </Button>
      <p className="text-center text-[11.5px] text-ink-muted">This link works once and expires after 48 hours.</p>
    </form>
  );
}
