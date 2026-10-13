import { requireSession } from "@/lib/auth/provider";
import { AppShell } from "@/components/dashboard/shell";
export const metadata = { title: "Workspace — SentinelOps AI" };
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  return <AppShell session={session}>{children}</AppShell>;
}
