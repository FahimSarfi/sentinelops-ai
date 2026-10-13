import { oauthMessages } from "@/lib/auth/oauth-errors";
import { redirect } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { auth, demoEnabled } from "@/lib/auth/provider";
import { Brand } from "@/components/brand";
import { supabaseConfigured } from "@/lib/supabase/server";
import { AuthForm } from "./auth-form";
import { GoogleSignIn } from "./google-sign-in";
export async function AuthPage({
  signup,
  confirmationError = false,
  oauthError = false,
  oauthFailureReason,
}: {
  signup: boolean;
  confirmationError?: boolean;
  oauthError?: boolean;
  oauthFailureReason?: string;
}) {
  const session = await auth.getSession();
  if (session)
    redirect(session.workspace.onboarded ? "/dashboard" : "/onboarding");
  return (
    <main id="main" className="auth-page">
      <div className="auth-frame">
        <section className="auth-visual" aria-label="SentinelOps introduction">
          <div className="auth-centered-logo">
            <Brand />
          </div>
        </section>
        <section className="auth-panel">
          <a href="/" className="back-link">
            <ArrowLeft size={14} /> Back to website
          </a>
          <div className="auth-form-wrap">
            <h1>{signup ? "Create an account" : "Welcome back"}</h1>
            <p className="auth-subtitle">
              {signup
                ? "A little context. A clearer way to work."
                : "Sign in to your incident workspace."}
            </p>
            {confirmationError && (
              <p className="form-error" role="alert">
                This confirmation or reset link is invalid or expired. Sign in,
                or request a new password reset link.
              </p>
            )}
            {oauthError && (
              <p className="form-error" role="alert">
                {oauthMessages[oauthFailureReason || ""] ||
                  "Google sign-in was cancelled or could not be completed. Try again or sign in with email."}
              </p>
            )}
            <GoogleSignIn enabled={supabaseConfigured()} />
            <AuthForm signup={signup} enabled={supabaseConfigured()} />
            {demoEnabled() && (
              <div className="sample-access">
                <a href="/demo">
                  Explore a sample workspace <ArrowRight size={13} />
                </a>
                <small>Illustrative data · no infrastructure changes</small>
              </div>
            )}
          </div>
          <p className="auth-fine-print">
            Evidence before action. Human approval, always.
          </p>
        </section>
      </div>
    </main>
  );
}
