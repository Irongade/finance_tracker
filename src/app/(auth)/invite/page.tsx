import { cookies } from "next/headers";
import Link from "next/link";
import { InviteForm } from "@/components/domain/invite-form";
import { Button } from "@/components/ui/button";
import { INVITE_COOKIE } from "@/server/auth/auth";
import { getServices } from "@/server/services";

/** The invite link parked a token in a cookie (see /api/invites/[token]); show who's inviting and take a name + password. */
export default async function InvitePage({ searchParams }: PageProps<"/invite">) {
  const { invalid } = await searchParams;
  const token = (await cookies()).get(INVITE_COOKIE)?.value;
  const invite = token && !invalid ? await getServices().households.peekInvite(token) : null;

  if (!invite) {
    return (
      <div className="grid gap-4">
        <div>
          <h1 className="text-[20px] font-semibold text-navy">This invite link isn't valid</h1>
          <p className="mt-1 text-[13px] text-ink-muted">
            Invite links work once and expire after 48 hours. Ask your partner to create a fresh one from Settings.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/login">Sign in instead</Link>
        </Button>
      </div>
    );
  }
  return (
    <InviteForm householdName={invite.householdName} inviterName={invite.inviterName} memberName={invite.memberName} />
  );
}
