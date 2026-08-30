"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function InvitePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  return (
    <form
      className="grid gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        router.push("/");
      }}
    >
      <div>
        <h1 className="text-[20px] font-semibold text-navy">You're invited</h1>
        <p className="mt-1 text-[13px] text-ink-muted">
          Ade set up the household ledger and invited you. Pick a name and a password to join; you'll both see the same
          data live.
        </p>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="name">Your name</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="P" required />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
        />
      </div>
      <Button type="submit" size="lg">
        Join the household
      </Button>
      <p className="text-center text-[11.5px] text-ink-muted">This link works once and expires after 48 hours.</p>
    </form>
  );
}
