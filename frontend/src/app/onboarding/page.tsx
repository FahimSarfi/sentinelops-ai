import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/provider";
import { signOut } from "@/lib/auth/actions";
import { Brand } from "@/components/brand";
import { Onboarding } from "@/components/auth/onboarding";
export const metadata = { title: "Set up your workspace — SentinelOps AI" };
export default async function Page() {
  const session = await requireSession(false);
  if (session.workspace.onboarded) redirect("/dashboard");
  return (
    <>
      <header className="onboarding-header wrap">
        <Brand />
        <form action={signOut}>
          <button className="button button-ghost">Sign out</button>
        </form>
      </header>
      <main id="main" className="onboarding-page wrap">
        <Onboarding session={session} />
      </main>
    </>
  );
}
