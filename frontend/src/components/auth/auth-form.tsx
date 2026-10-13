"use client";
import { useActionState, useState } from "react";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { authenticate } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
export function AuthForm({
  signup,
  enabled,
}: {
  signup: boolean;
  enabled: boolean;
}) {
  const [state, action, pending] = useActionState(
    authenticate.bind(null, signup),
    {},
  );
  const [visible, setVisible] = useState(false);
  return (
    <form action={action} className="auth-form">
      {signup && (
        <label htmlFor="name">
          Your name
          <input
            id="name"
            name="name"
            autoComplete="name"
            placeholder="Enter your name"
            required
            minLength={2}
            maxLength={60}
          />
        </label>
      )}
      <label htmlFor="email">
        Email address
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="Enter your email address"
          required
          maxLength={254}
        />
      </label>
      <label htmlFor="password">
        <span id="password-label">Password</span>
        <div className="password-field">
          <input
            id="password"
            aria-labelledby="password-label"
            name="password"
            placeholder="Enter your password"
            type={visible ? "text" : "password"}
            autoComplete={signup ? "new-password" : "current-password"}
            required
            minLength={8}
            maxLength={128}
            aria-describedby={signup ? "password-hint" : undefined}
          />
          <button
            type="button"
            className="icon-button"
            aria-label={visible ? "Hide password" : "Show password"}
            onClick={() => setVisible(!visible)}
          >
            {visible ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
        {signup && <small id="password-hint">Use at least 8 characters.</small>}
      </label>
      {!signup && (
        <a className="text-link forgot-link" href="/forgot-password">
          Forgot password?
        </a>
      )}
      {state.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="form-success" role="status">
          {state.success}
        </p>
      )}
      {!enabled && (
        <p className="form-notice">
          Hosted accounts aren’t configured on this instance. Explore a sample
          workspace, or return when account access is enabled.
        </p>
      )}
      <Button disabled={pending || !enabled} type="submit">
        {pending ? "Please wait…" : signup ? "Create account" : "Sign in"}
        <ArrowRight size={17} />
      </Button>
      <p className="form-switch">
        {signup ? "Already have an account?" : "New to SentinelOps?"}{" "}
        <a href={signup ? "/sign-in" : "/sign-up"}>
          {signup ? "Sign in" : "Create an account"}
        </a>
      </p>
    </form>
  );
}
