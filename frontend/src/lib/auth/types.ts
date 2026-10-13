export const roles = [
  "Site reliability engineer",
  "Backend engineer",
  "Platform / DevOps",
  "Exploring the product",
] as const;
export const teamSizes = ["Just me", "2–10", "11–50", "51+"] as const;
export const goals = [
  "Investigate incidents faster",
  "Review repairs with confidence",
  "Verify recovery",
  "Explore the prototype",
] as const;
export type Workspace = {
  name: string;
  role: string;
  source: "demo" | "later";
  onboarded: boolean;
  teamSize: string;
  goal: string;
};
export type Session = {
  user: { id: string; name: string; email: string };
  workspace: Workspace;
  expiresAt: number;
  mode: "demo" | "supabase";
};
export type ActionState = { error?: string; success?: string };
export interface AuthProvider {
  getSession(): Promise<Session | null>;
  startDemo(name: string, email: string): Promise<void>;
  updateWorkspace(workspace: Workspace): Promise<void>;
  signOut(): Promise<void>;
}
