import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/provider";
import { WorkspaceView, type View } from "@/components/dashboard/workspace";
export default async function Page({
  params,
}: {
  params: Promise<{ view: string }>;
}) {
  const { view } = await params;
  if (
    ![
      "investigations",
      "approvals",
      "reports",
      "integrations",
      "settings",
    ].includes(view)
  )
    notFound();
  return <WorkspaceView session={await requireSession()} view={view as View} />;
}
