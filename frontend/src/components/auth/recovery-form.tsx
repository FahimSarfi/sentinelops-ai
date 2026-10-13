"use client";
import { useActionState } from "react";
import { recoverPassword, resetPassword } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
export function RecoveryForm({ reset }: { reset: boolean }) {
  const [state, action, pending] = useActionState(
    reset ? resetPassword : recoverPassword,
    {},
  );
  return (
    <form action={action} className="auth-form">
      {reset ? (
        <>
          <label htmlFor="password">
            New password
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              required
            />
          </label>
          <label htmlFor="confirm-password">
            Confirm password
            <input
              id="confirm-password"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              required
            />
          </label>
        </>
      ) : (
        <label htmlFor="email">
          Email address
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
          />
        </label>
      )}
      {state.error && (
        <p role="alert" className="form-error">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="form-success">
          {state.success}
        </p>
      )}
      <Button disabled={pending}>
        {pending
          ? "Please wait…"
          : reset
            ? "Save new password"
            : "Send reset link"}
      </Button>
      <a className="text-link" href="/sign-in">
        Back to sign in
      </a>
    </form>
  );
}
