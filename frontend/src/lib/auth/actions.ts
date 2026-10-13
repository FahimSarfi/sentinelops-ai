"use server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { siteOrigin } from "./site-url";
import { revalidatePath } from "next/cache";
import { auth, requireSession } from "./provider";
import { createClient, supabaseConfigured } from "../supabase/server";
import { roles, teamSizes, goals, type ActionState } from "./types";
function field(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}
export async function enterDemo(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  const name = field(form, "name");
  const email = field(form, "email").toLowerCase();
  if (name.length < 2 || name.length > 60)
    return { error: "Enter a display name between 2 and 60 characters." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
    return { error: "Enter a valid email address." };
  if (form.get("demoConsent") !== "on")
    return { error: "Confirm that you understand this is demo access." };
  try {
    await auth.startDemo(name, email);
  } catch {
    return {
      error:
        "Demo access is unavailable. Check the server auth configuration or explore the public demo.",
    };
  }
  redirect("/onboarding");
}
function workspaceFields(form: FormData) {
  const name = field(form, "workspace");
  const role = field(form, "role");
  const source = field(form, "source");
  const teamSize = field(form, "teamSize");
  const goal = field(form, "goal");
  if (
    !(teamSizes as readonly string[]).includes(teamSize) ||
    !(goals as readonly string[]).includes(goal)
  )
    return null;
  if (
    name.length < 2 ||
    name.length > 60 ||
    !(roles as readonly string[]).includes(role) ||
    (source !== "demo" && source !== "later")
  )
    return null;
  return { name, role, source, teamSize, goal, onboarded: true } as const;
}
export async function finishOnboarding(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireSession(false);
  const workspace = workspaceFields(form);
  if (!workspace)
    return {
      error: "Check your workspace name and selections, then try again.",
    };
  try {
    await auth.updateWorkspace(workspace);
  } catch {
    return { error: "Your workspace could not be saved. Please retry." };
  }
  revalidatePath("/dashboard", "layout");
  redirect(
    workspace.source === "demo" ? "/dashboard/investigations" : "/dashboard",
  );
}
export async function saveSettings(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireSession();
  const workspace = workspaceFields(form);
  if (!workspace)
    return {
      error: "Enter a workspace name of 2–60 characters and choose a role.",
    };
  try {
    await auth.updateWorkspace(workspace);
  } catch {
    return { error: "Your workspace could not be saved. Please retry." };
  }
  revalidatePath("/dashboard", "layout");
  return { success: "Workspace preferences saved." };
}
export async function signOut() {
  await auth.signOut();
  revalidatePath("/dashboard", "layout");
  redirect("/sign-in");
}

export async function authenticate(
  signup: boolean,
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  if (!supabaseConfigured())
    return {
      error:
        "Account access is not configured yet. You can explore the sample workspace below.",
    };
  const email = field(form, "email").toLowerCase();
  const password = String(form.get("password") ?? "");
  const name = field(form, "name");
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 254 ||
    password.length < 8 ||
    password.length > 128 ||
    (signup && (name.length < 2 || name.length > 60))
  )
    return { error: "Check your details. Passwords need 8–128 characters." };
  try {
    const client = await createClient();
    const result = signup
      ? await client.auth.signUp({
          email,
          password,
          options: {
            data: { name },
            emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://127.0.0.1:3000"}/auth/callback`,
          },
        })
      : await client.auth.signInWithPassword({ email, password });
    if (result.error)
      return {
        error: signup
          ? "We couldn’t create your account. Check your details or try signing in."
          : "Unable to sign in. Check your email and password, then retry.",
      };
    if (signup && !result.data.session)
      return {
        success: "Check your email to confirm your account, then sign in.",
      };
  } catch {
    return {
      error: "Account service is unavailable. Please try again shortly.",
    };
  }
  redirect("/onboarding");
}
export async function recoverPassword(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  if (!supabaseConfigured())
    return { error: "Account access is not configured yet." };
  const email = field(form, "email");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
    return { error: "Enter a valid email address." };
  try {
    const client = await createClient();
    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://127.0.0.1:3000"}/auth/callback?next=/reset-password`,
    });
    if (error)
      return { error: "We couldn’t send the reset link. Try again shortly." };
    return {
      success:
        "If an account exists for this email, you’ll receive a reset link.",
    };
  } catch {
    return { error: "Account service is unavailable. Please retry." };
  }
}
export async function resetPassword(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  if (!supabaseConfigured())
    return { error: "Account access is not configured yet." };
  const password = String(form.get("password") ?? "");
  if (password.length < 8 || password.length > 128)
    return { error: "Use a password with 8–128 characters." };
  if (password !== form.get("confirmPassword"))
    return { error: "Your passwords don’t match." };
  try {
    const client = await createClient();
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user)
      return { error: "Your link has expired. Request a new reset link." };
    const { error } = await client.auth.updateUser({ password });
    if (error)
      return {
        error: "Your password could not be updated. Try a new reset link.",
      };
  } catch {
    return { error: "Account service is unavailable. Please retry." };
  }
  redirect("/dashboard");
}

export async function signInWithGoogle(
  _: ActionState,
  _form: FormData,
): Promise<ActionState> {
  if (!supabaseConfigured())
    return {
      error:
        "Google sign-in is unavailable because account access is not configured.",
    };
  let destination: string;
  try {
    const origin = siteOrigin((await headers()).get("host"));
    const client = await createClient();
    const { data, error } = await client.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: new URL("/auth/callback", origin).toString(),
        skipBrowserRedirect: true,
      },
    });
    if (error || !data.url)
      return {
        error: "Google sign-in could not start. Please try again or use email.",
      };
    destination = data.url;
  } catch {
    return {
      error: "Google sign-in is unavailable. Please try again or use email.",
    };
  }
  redirect(destination);
}
