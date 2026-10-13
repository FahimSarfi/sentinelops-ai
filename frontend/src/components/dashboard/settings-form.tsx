"use client";
import { useActionState } from "react";
import { saveSettings } from "@/lib/auth/actions";
import { goals, roles, teamSizes, type Session } from "@/lib/auth/types";
import { Button } from "@/components/ui/button";
export function SettingsForm({ session }: { session: Session }) {
  const [state, action, pending] = useActionState(saveSettings, {});
  return (
    <form action={action} className="settings-form panel">
      <h2>Workspace preferences</h2>
      <p>
        One private workspace per account. Team invitations aren’t part of this
        prototype.
      </p>
      <input type="hidden" name="source" value={session.workspace.source} />
      <label htmlFor="workspace">
        Workspace name
        <input
          id="workspace"
          name="workspace"
          defaultValue={session.workspace.name}
          minLength={2}
          maxLength={60}
          required
        />
      </label>
      <label htmlFor="role">
        Your role
        <select id="role" name="role" defaultValue={session.workspace.role}>
          {roles.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
      </label>
      <label htmlFor="teamSize">
        Team size
        <select
          id="teamSize"
          name="teamSize"
          defaultValue={session.workspace.teamSize}
        >
          {teamSizes.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </label>
      <label htmlFor="goal">
        Primary goal
        <select id="goal" name="goal" defaultValue={session.workspace.goal}>
          {goals.map((g) => (
            <option key={g}>{g}</option>
          ))}
        </select>
      </label>
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
        {pending ? "Saving…" : "Save preferences"}
      </Button>
    </form>
  );
}
