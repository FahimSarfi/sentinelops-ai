"use client";
import { useActionState } from "react";
import { signInWithGoogle } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
export function GoogleSignIn({ enabled }: { enabled: boolean }) {
  const [state, action, pending] = useActionState(signInWithGoogle, {});
  return (
    <div className="google-access">
      <form action={action}>
        <Button
          type="submit"
          variant="secondary"
          disabled={pending || !enabled}
        >
          <svg
            className="google-mark"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
          >
            <path
              fill="#4285F4"
              d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.89-1.74 2.98-4.3 2.98-7.36Z"
            />
            <path
              fill="#34A853"
              d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.04.96-3.38.96-2.6 0-4.8-1.76-5.58-4.12H3.08v2.59A10 10 0 0 0 12 22Z"
            />
            <path
              fill="#FBBC05"
              d="M6.42 13.92A6 6 0 0 1 6.1 12c0-.66.11-1.31.32-1.92V7.49H3.08A10 10 0 0 0 2 12c0 1.61.38 3.14 1.08 4.51l3.34-2.59Z"
            />
            <path
              fill="#EA4335"
              d="M12 5.96c1.47 0 2.79.5 3.82 1.5l2.86-2.87A9.64 9.64 0 0 0 12 2a10 10 0 0 0-8.92 5.49l3.34 2.59A6 6 0 0 1 12 5.96Z"
            />
          </svg>
          {pending ? "Connecting to Google…" : "Continue with Google"}
        </Button>
        {state.error && (
          <p role="alert" className="form-error">
            {state.error}
          </p>
        )}
      </form>
      {!enabled && (
        <p className="form-notice">
          Google sign-in needs configured account access.
        </p>
      )}
      <p className="auth-divider">
        <span>or continue with email</span>
      </p>
    </div>
  );
}
