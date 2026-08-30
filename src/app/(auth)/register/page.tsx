"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  return (
    <form
      className="grid gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        router.push("/onboarding");
      }}
    >
      <div>
        <h1 className="text-[20px] font-semibold text-navy">Create your account</h1>
        <p className="mt-1 text-[13px] text-ink-muted">
          You'll set up the household next and invite your partner from Settings. No public signup.
        </p>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="name">Your name</Label>
        <Input
          id="name"
          autoComplete="given-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ade"
          required
        />
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
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
        />
        <p className="text-[11.5px] text-ink-muted">Hashed with scrypt; sessions are 30-day rolling cookies.</p>
      </div>
      <Button type="submit" size="lg">
        Continue
      </Button>
      <p className="text-center text-[12.5px] text-ink-muted">
        Already set up?{" "}
        <Link href="/login" className="font-medium text-blue hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
