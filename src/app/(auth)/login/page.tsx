"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("ade@example.com");
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
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
      </div>
      <Button type="submit" size="lg">
        Sign in
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
