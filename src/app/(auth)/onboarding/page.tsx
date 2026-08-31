import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { OnboardingWizard } from "@/components/domain/onboarding-wizard";
import { auth } from "@/server/auth/auth";
import { getServices } from "@/server/services";

/** First run (section 7.4): household -> names & incomes -> import or blank -> the routine. */
export default async function OnboardingPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  const membership = await getServices().households.membershipFor(session.user.id);
  if (membership) redirect("/dashboard");
  return <OnboardingWizard defaultName={session.user.name} />;
}
