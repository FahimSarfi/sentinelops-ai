import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/provider";
import { isIncidentReport } from "@/lib/incidents";
export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.getSession();
  if (!session || session.mode !== "supabase" || !session.workspace.onboarded)
    return NextResponse.json(
      { error: "Sign in with a verified account to read local reports." },
      { status: 401 },
    );
  const { id } = await params;
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  )
    return NextResponse.json(
      { error: "Enter a valid incident UUID." },
      { status: 400 },
    );
  const base = process.env.SENTINELOPS_API_URL;
  if (!base)
    return NextResponse.json(
      { error: "The local backend connection is not configured." },
      { status: 503 },
    );
  try {
    const url = new URL(base);
    // The existing backend is local and has no tenant authorization. Never proxy a public host.
    if (
      !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) ||
      url.protocol !== "http:" ||
      url.username ||
      url.password
    )
      throw new Error("Unsupported backend origin");
    const response = await fetch(new URL(`/incidents/${id}/report`, url), {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
      redirect: "error",
    });
    if (response.status === 404)
      return NextResponse.json(
        { error: "No incident was found for that ID." },
        { status: 404 },
      );
    if (!response.ok) throw new Error("Backend unavailable");
    const report: unknown = await response.json();
    if (!isIncidentReport(report)) throw new Error("Unexpected report format");
    return NextResponse.json(report, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "Could not read the local report. Check that FastAPI is running and try again.",
      },
      { status: 502 },
    );
  }
}
