"use client";
import { useActionState } from "react";
import { enterDemo } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
export function DemoForm({ enabled }: { enabled: boolean }) {
  const [state, action, pending] = useActionState(enterDemo, {});
  return (
    <form action={action} className="auth-form">
      <input type="hidden" name="name" value="Demo engineer" />
      <input type="hidden" name="email" value="engineer@example.com" />
      <p className="form-notice">
        This creates a temporary sample session, separate from a Supabase
        account. It expires in 24 hours and uses illustrative incident data.
      </p>
      <label className="checkbox-label">
        <input type="checkbox" name="demoConsent" required />
        <span>I understand this is a sample workspace.</span>
      </label>
      {state.error && (
        <p role="alert" className="form-error">
          {state.error}
        </p>
      )}
      {!enabled && (
        <p className="form-error">
          Sample access is disabled on this instance.
        </p>
      )}
      <Button disabled={!enabled || pending}>
        {pending ? "Opening sample workspace…" : "Explore sample workspace"}
      </Button>
      <a href="/sign-in" className="text-link">
        Sign in to your account
      </a>
    </form>
  );
}
