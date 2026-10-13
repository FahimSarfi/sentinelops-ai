export const oauthMessages: Record<string, string> = {
  cancelled: "Google sign-in was cancelled. Please try again.",
  provider:
    "Google returned a sign-in error. Check the Google provider settings and Supabase Auth logs, then try again.",
  signup:
    "New account registration is disabled on this instance. Ask the project owner to enable sign-ups.",
  verification:
    "Your email needs verification. Check your inbox before signing in again.",
  session:
    "The sign-in session expired or its cookie was missing. Start again from this page using the same browser and hostname.",
  account:
    "Google could not connect to this account. Try signing in with email first.",
};
export function oauthReason(code: string | undefined, error?: string | null) {
  if (
    [
      "bad_code_verifier",
      "flow_state_not_found",
      "flow_state_expired",
      "pkce_code_verifier_not_found",
    ].includes(code || "")
  )
    return "session";
  if (code === "signup_disabled") return "signup";
  if (
    code === "provider_email_needs_verification" ||
    code === "email_not_confirmed"
  )
    return "verification";
  if (code === "email_exists" || code === "identity_already_exists")
    return "account";
  if (error === "access_denied" && !code) return "cancelled";
  return "provider";
}
