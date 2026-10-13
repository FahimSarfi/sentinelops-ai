import { requireSession } from "@/lib/auth/provider";
import { WorkspaceView } from "@/components/dashboard/workspace";
export default async function Page() {
  return <WorkspaceView session={await requireSession()} view="overview" />;
}
