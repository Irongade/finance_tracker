"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { PasswordInput } from "@/components/domain/password-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
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
        const { error } = await authClient.signIn.email({ email, password });
        setBusy(false);
        if (error) {
          setError(
            error.status === 429
              ? "Too many attempts. Wait a minute and try again."
              : "Email or password didn't match.",
          );
          return;
        }
        const next = params.get("next");
        router.push(next?.startsWith("/") ? next : "/");
        router.refresh();
      }}
    >
      <div>
        <h1 className="text-[20px] font-semibold text-navy">Sign in</h1>
        <p className="mt-1 text-[13px] text-ink-muted">Your household ledger. Two accounts, one shared view.</p>
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
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link href="/forgot-password" className="text-[12px] font-medium text-blue hover:underline">
            Forgot it?
          </Link>
        </div>
        <PasswordInput
          id="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      {error ? (
        <p className="text-[12.5px] font-medium text-brick" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={busy}>
        {busy ? "Signing in…" : "Sign in"}
      </Button>
      <p className="text-center text-[12.5px] text-ink-muted">
        First time here?{" "}
        <Link href="/register" className="font-medium text-blue hover:underline">
          Create the household
        </Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
