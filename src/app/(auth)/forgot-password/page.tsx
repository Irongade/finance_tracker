"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  if (sent) {
    return (
      <div className="grid gap-4">
        <div>
          <h1 className="text-[20px] font-semibold text-navy">Check your email</h1>
          <p className="mt-1 text-[13px] text-ink-muted">
            If an account exists for <strong>{email}</strong>, a reset link is on its way. It works once and expires in
            an hour.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/login">Back to sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <form
      className="grid gap-5"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        await authClient.requestPasswordReset({ email, redirectTo: "/reset-password" });
        setBusy(false);
        setSent(true); // same message whether or not the account exists
      }}
    >
      <div>
        <h1 className="text-[20px] font-semibold text-navy">Forgot your password?</h1>
        <p className="mt-1 text-[13px] text-ink-muted">Enter your email and we'll send a one-time reset link.</p>
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
      <Button type="submit" size="lg" pending={busy}>
        Send reset link
      </Button>
      <p className="text-center text-[12.5px] text-ink-muted">
        Remembered it?{" "}
        <Link href="/login" className="font-medium text-blue hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
