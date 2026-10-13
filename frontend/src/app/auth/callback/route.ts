import { siteOrigin } from "@/lib/auth/site-url";
import { oauthReason } from "@/lib/auth/oauth-errors";
import { NextResponse, type NextRequest } from "next/server";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";
export async function GET(request: NextRequest) {
  const origin = siteOrigin(request.headers.get("host"));
  function failure(reason: string) {
    console.warn("[SentinelOps auth] OAuth callback failure:", reason);
    return NextResponse.redirect(
      new URL("/sign-in?error=oauth&reason=" + reason, origin),
    );
  }
  if (request.nextUrl.searchParams.has("error")) {
    return failure(
      oauthReason(
        request.nextUrl.searchParams.get("error_code") || undefined,
        request.nextUrl.searchParams.get("error"),
      ),
    );
  }
  const code = request.nextUrl.searchParams.get("code");
  const next =
    request.nextUrl.searchParams.get("next") === "/reset-password"
      ? "/reset-password"
      : "/onboarding";
  if (code && supabaseConfigured()) {
    try {
      const client = await createClient();
      const { error } = await client.auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(new URL(next, origin));
      return failure(
        oauthReason(
          error.code ||
            (error.message.toLowerCase().includes("verifier")
              ? "pkce_code_verifier_not_found"
              : undefined),
        ),
      );
    } catch {
      return failure("session");
    }
  }
  return NextResponse.redirect(new URL("/sign-in?error=confirmation", origin));
}
