"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { parsePounds, penceToInput } from "@/domain/money";
import { cn } from "@/lib/utils";

export interface MoneyInputProps {
  id?: string;
  name?: string;
  valuePence: number | null;
  onChange: (pence: number | null) => void;
  onBlur?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  allowNegative?: boolean;
  invalid?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  "aria-label"?: string;
}

/**
 * Pence-safe amount field. Keeps the user's text while typing, parses to
 * integer pence (no floats), and re-syncs when the value changes outside.
 */
export function MoneyInput({
  id,
  name,
  valuePence,
  onChange,
  onBlur,
  placeholder = "0.00",
  autoFocus,
  disabled,
  allowNegative = false,
  invalid,
  size = "md",
  className,
  "aria-label": ariaLabel,
}: MoneyInputProps) {
  const [text, setText] = useState(penceToInput(valuePence));

  // biome-ignore lint/correctness/useExhaustiveDependencies: only re-sync when the outside value changes
  useEffect(() => {
    if (parsePounds(text) !== valuePence) setText(penceToInput(valuePence));
  }, [valuePence]);

  return (
    <div className={cn("relative", className)}>
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 left-3 flex items-center text-ink-muted",
          size === "lg" ? "text-2xl font-semibold" : "text-sm",
        )}
      >
        £
      </span>
      <Input
        id={id}
        name={name}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        disabled={disabled}
        autoFocus={autoFocus}
        placeholder={placeholder}
        value={text}
        onBlur={() => {
          const parsed = parsePounds(text);
          if (parsed !== null) setText(penceToInput(parsed));
          onBlur?.();
        }}
        onChange={(e) => {
          const raw = e.target.value;
          if (!allowNegative && raw.includes("-")) return;
          setText(raw);
          onChange(parsePounds(raw));
        }}
        className={cn(
          "money pl-7",
          size === "lg" && "h-14 pl-9 text-2xl md:text-2xl",
          size === "sm" && "h-7 text-[13px]",
        )}
      />
    </div>
  );
}
