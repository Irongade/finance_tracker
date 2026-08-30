import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/app-shell";
import { auth } from "@/server/auth/auth";
import { getServices } from "@/server/services";

/**
 * Every read happens here, on the server, in one round trip: session ->
 * membership -> household. The client store is hydrated with the result.
 */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  const snapshot = await getServices().households.forAuthUser(session.user.id);
  if (!snapshot) redirect("/onboarding");
  return (
    <AppShell
      initial={{
        household: snapshot.household,
        currentUserId: snapshot.membership.memberId,
        today: snapshot.view.clock.today,
      }}
    >
      {children}
    </AppShell>
  );
}
