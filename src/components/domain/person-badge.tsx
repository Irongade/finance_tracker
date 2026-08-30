import type { Owner, User } from "@/domain/types";
import { cn } from "@/lib/utils";

export type PersonKey = "user1" | "user2" | "joint";

export function personKey(owner: Owner, users: [User, User]): PersonKey {
  if (owner.kind === "joint") return "joint";
  return owner.userId === users[0].id ? "user1" : "user2";
}

export function ownerLabel(owner: Owner, users: [User, User]): string {
  if (owner.kind === "joint") return "Joint";
  return users.find((u) => u.id === owner.userId)?.name ?? "?";
}

export const PERSON_STYLE: Record<PersonKey, { avatar: string; text: string; chip: string; hex: string }> = {
  user1: {
    avatar: "bg-ade-teal text-white",
    text: "text-ade-ink",
    chip: "bg-ade-teal/12 text-ade-ink",
    hex: "#2E8FA3",
  },
  user2: { avatar: "bg-p-plum text-white", text: "text-p-ink", chip: "bg-p-plum/12 text-p-ink", hex: "#8A4FBE" },
  joint: { avatar: "bg-navy text-white", text: "text-navy", chip: "bg-navy/8 text-navy", hex: "#1F3864" },
};

const SIZE = {
  xs: "size-5 text-[10px]",
  sm: "size-6 text-[11px]",
  md: "size-8 text-[13px]",
  lg: "size-10 text-[15px]",
};

export interface PersonBadgeProps {
  owner: Owner;
  users: [User, User];
  size?: keyof typeof SIZE;
  withName?: boolean;
  className?: string;
}

/** Ade / P / Joint avatar with the person accent (section 7.2). */
export function PersonBadge({ owner, users, size = "sm", withName = false, className }: PersonBadgeProps) {
  const key = personKey(owner, users);
  const label = ownerLabel(owner, users);
  const initial = key === "joint" ? "J" : label.slice(0, 1).toUpperCase();
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)} title={label}>
      <span
        role="img"
        aria-hidden={withName}
        aria-label={withName ? undefined : label}
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-full font-semibold leading-none",
          SIZE[size],
          PERSON_STYLE[key].avatar,
        )}
      >
        {initial}
      </span>
      {withName ? <span className={cn("text-[13px] font-medium", PERSON_STYLE[key].text)}>{label}</span> : null}
    </span>
  );
}
