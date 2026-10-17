"use client";

import { LogOut } from "lucide-react";
import { useActionState, useTransition } from "react";
import { passwordLength } from "@/lib/auth/password-rules";
import {
  changePassword,
  createScriptToken,
  revokeSession,
  signOut,
  signOutOthers,
  type FormResult,
} from "@/lib/auth/actions";
import { FormMessage, SubmitButton, TextField } from "./fields";

const initial: FormResult = { error: null };

const quietButton =
  "inline-flex h-9 items-center justify-center gap-2 rounded bg-background px-4 text-sm font-medium transition-tesla hover:bg-accent disabled:opacity-60";

export function PasswordForm() {
  const [state, action] = useActionState(changePassword, initial);
  return (
    <form action={action} className="space-y-5">
      <TextField
        onCard
        label="Current password"
        name="current"
        type="password"
        autoComplete="current-password"
        required
      />
      <TextField
        onCard
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={passwordLength.min}
        maxLength={passwordLength.max}
        required
        hint={`At least ${passwordLength.min} characters. Every other session and phone signs out.`}
      />
      <TextField
        onCard
        label="New password again"
        name="confirm"
        type="password"
        autoComplete="new-password"
        required
      />
      <FormMessage error={state.error} done={state.done} />
      <div className="sm:w-56">
        <SubmitButton>Change the password</SubmitButton>
      </div>
    </form>
  );
}

export function RevokeButton({ id, label }: { id: string; label: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      aria-label={label}
      onClick={() => startTransition(() => revokeSession(id))}
      className={quietButton}
    >
      Sign out
    </button>
  );
}

export function SignOutOthersButton() {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => signOutOthers())}
      className={quietButton}
    >
      Sign out of every other session
    </button>
  );
}

export function SignOutButton() {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => signOut())}
      className={`${quietButton} bg-card`}
    >
      <LogOut className="size-4" />
      Sign out
    </button>
  );
}

export function ScriptTokenForm() {
  const [state, action] = useActionState(createScriptToken, initial);
  return (
    <div className="space-y-5">
      <form action={action} className="space-y-5">
        <TextField
          onCard
          label="Name"
          name="name"
          autoComplete="off"
          required
          hint="For example the script or the home server that uses it."
        />
        <FormMessage error={state.error} />
        <div className="sm:w-56">
          <SubmitButton>Make a token</SubmitButton>
        </div>
      </form>
      {state.done ? (
        <div role="status" className="space-y-2 rounded-lg bg-background p-4">
          <p className="text-sm font-medium">
            Copy the token for {state.values?.name} now. It shows only once.
          </p>
          <code className="block text-xs break-all select-all">
            {state.done}
          </code>
          <p className="text-xs text-subtle">
            Send it as <code>Authorization: Bearer &lt;token&gt;</code>.
          </p>
        </div>
      ) : null}
    </div>
  );
}
