"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "sonner";
import { PasswordInput } from "@/components/domain/password-input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!token || params.get("error")) {
    return (
      <div className="grid gap-4">
        <div>
          <h1 className="text-[20px] font-semibold text-navy">This reset link isn't valid</h1>
          <p className="mt-1 text-[13px] text-ink-muted">
            Reset links work once and expire after an hour. Request a fresh one.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/forgot-password">Request a new link</Link>
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
        if (password !== confirm) {
          setError("Passwords don't match.");
          return;
        }
        setBusy(true);
        setError(null);
        const { error } = await authClient.resetPassword({ newPassword: password, token });
        if (error) {
          setBusy(false);
          setError(error.message ?? "Could not reset the password. The link may have expired.");
          return;
        }
        toast.success("Password changed", { description: "Sign in with the new one." });
        // stay busy through the hand-off to sign-in
        router.push("/login");
      }}
    >
      <div>
        <h1 className="text-[20px] font-semibold text-navy">Choose a new password</h1>
        <p className="mt-1 text-[13px] text-ink-muted">At least 8 characters. You'll be signed out everywhere else.</p>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="password">New password</Label>
        <PasswordInput
          id="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
          autoFocus
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="confirm">Repeat it</Label>
        <PasswordInput
          id="confirm"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          minLength={8}
          required
        />
      </div>
      {error ? (
        <p className="text-[12.5px] font-medium text-brick" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" size="lg" pending={busy}>
        Set new password
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
