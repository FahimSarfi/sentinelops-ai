import "server-only";
import {
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient, supabaseConfigured } from "../supabase/server";
import {
  roles,
  goals,
  teamSizes,
  type AuthProvider,
  type Session,
  type Workspace,
} from "./types";
const cookieName = "sentinelops_demo";
const lifetime = 60 * 60 * 24;
// Stable within a single local process. Set AUTH_SESSION_SECRET for restarts/multiple workers.
const processState = globalThis as typeof globalThis & {
  sentinelDemoKey?: string;
};
function secret() {
  const configured = process.env.AUTH_SESSION_SECRET;
  if (configured && configured.length < 32)
    throw new Error("AUTH_SESSION_SECRET must contain at least 32 characters.");
  return (
    configured ||
    (processState.sentinelDemoKey ??= randomBytes(32).toString("hex"))
  );
}
export function demoEnabled() {
  return (
    process.env.DEMO_ACCESS_ENABLED === "true" ||
    process.env.NODE_ENV !== "production"
  );
}
function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}
function validWorkspace(value: Workspace) {
  return (
    value &&
    typeof value.name === "string" &&
    value.name.length >= 2 &&
    value.name.length <= 60 &&
    (roles as readonly string[]).includes(value.role) &&
    ["demo", "later"].includes(value.source) &&
    typeof value.onboarded === "boolean" &&
    (teamSizes as readonly string[]).includes(value.teamSize) &&
    (goals as readonly string[]).includes(value.goal)
  );
}
async function read(): Promise<Session | null> {
  const store = await cookies();
  if (!demoEnabled()) return null;
  const raw = store.get(cookieName)?.value;
  if (!raw || raw.length > 3800) return null;
  try {
    const [payload, signature, extra] = raw.split(".");
    if (!payload || !signature || extra) return null;
    const expected = Buffer.from(sign(payload));
    const actual = Buffer.from(signature);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual))
      return null;
    const session = JSON.parse(
      Buffer.from(payload, "base64url").toString(),
    ) as Session;
    if (
      session.mode !== "demo" ||
      !Number.isFinite(session.expiresAt) ||
      session.expiresAt <= Date.now() ||
      !session.user ||
      typeof session.user.id !== "string" ||
      typeof session.user.name !== "string" ||
      typeof session.user.email !== "string" ||
      !validWorkspace(session.workspace)
    )
      return null;
    return session;
  } catch {
    return null;
  }
}
async function write(session: Session) {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  (await cookies()).set(cookieName, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.max(0, Math.floor((session.expiresAt - Date.now()) / 1000)),
  });
}
export const auth: AuthProvider = {
  async getSession() {
    if (supabaseConfigured()) {
      const client = await createClient();
      const {
        data: { user },
        error,
      } = await client.auth.getUser();
      if (!error && user) {
        const { data, error: workspaceError } = await client
          .from("workspaces")
          .select("name,role,source,team_size,goal")
          .eq("owner_id", user.id)
          .maybeSingle();
        if (workspaceError && workspaceError.code !== "PGRST205")
          throw new Error(
            "Workspace storage is unavailable. Apply the Supabase schema and retry.",
          );
        return {
          user: {
            id: user.id,
            email: user.email ?? "",
            name: String(
              user.user_metadata.name ??
                user.email?.split("@")[0] ??
                "Engineer",
            ),
          },
          workspace: data
            ? {
                name: data.name,
                role: data.role,
                source: data.source,
                teamSize: data.team_size,
                goal: data.goal,
                onboarded: true,
              }
            : {
                name: "My workspace",
                role: roles[0],
                source: "demo",
                teamSize: "Just me",
                goal: "Investigate incidents faster",
                onboarded: false,
              },
          expiresAt: Date.now() + lifetime * 1000,
          mode: "supabase",
        };
      }
    }
    return read();
  },
  async startDemo(name, email) {
    if (!demoEnabled())
      throw new Error(
        "Demo access is disabled. A production auth provider has not been configured.",
      );
    await write({
      user: { id: randomUUID(), name, email },
      workspace: {
        name: "My workspace",
        role: roles[0],
        source: "demo",
        teamSize: "Just me",
        goal: "Investigate incidents faster",
        onboarded: false,
      },
      expiresAt: Date.now() + lifetime * 1000,
      mode: "demo",
    });
  },
  async updateWorkspace(workspace) {
    const session = await requireSession(false);
    if (!validWorkspace(workspace))
      throw new Error("Invalid workspace settings.");
    if (session.mode === "supabase") {
      const client = await createClient();
      const { error } = await client.from("workspaces").upsert(
        {
          owner_id: session.user.id,
          name: workspace.name,
          role: workspace.role,
          source: workspace.source,
          team_size: workspace.teamSize,
          goal: workspace.goal,
        },
        { onConflict: "owner_id" },
      );
      if (error) throw new Error("Unable to save workspace.");
    } else await write({ ...session, workspace });
  },
  async signOut() {
    if (supabaseConfigured()) {
      const client = await createClient();
      const { error } = await client.auth.signOut();
      if (error) throw new Error("Unable to sign out. Please retry.");
    }
    (await cookies()).delete(cookieName);
  },
};
export async function requireSession(onboarded = true) {
  const session = await auth.getSession();
  if (!session) redirect("/sign-in");
  if (onboarded && !session.workspace.onboarded) redirect("/onboarding");
  return session;
}
