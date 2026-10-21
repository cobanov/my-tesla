"use client";

import { LogOut } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { passwordLength } from "@/lib/auth/password-rules";
import {
  changePassword,
  createInvite,
  createScriptToken,
  signOut,
  signOutOthers,
  type FormResult,
} from "@/lib/auth/actions";
import { CopyField } from "@/components/copy-field";
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

export function RevokeButton({
  action,
  label,
  children,
}: {
  action: () => Promise<void>;
  label: string;
  children: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      aria-label={label}
      onClick={() => startTransition(action)}
      className={quietButton}
    >
      {children}
    </button>
  );
}

export function RemoveMemberButton({
  name,
  action,
}: {
  name: string;
  action: () => Promise<void>;
}) {
  const [asking, setAsking] = useState(false);
  const [pending, startTransition] = useTransition();
  if (!asking) {
    return (
      <button
        type="button"
        aria-label={`Remove ${name}`}
        onClick={() => setAsking(true)}
        className={quietButton}
      >
        Remove
      </button>
    );
  }
  return (
    <div
      role="group"
      aria-label={`Remove ${name} and sign them out everywhere?`}
      className="flex shrink-0 gap-2"
    >
      <button
        type="button"
        autoFocus
        onClick={() => setAsking(false)}
        className={quietButton}
      >
        Keep
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(action)}
        className={`${quietButton} text-destructive`}
      >
        Remove {name}
      </button>
    </div>
  );
}

export function InviteForm() {
  const [state, action] = useActionState(createInvite, initial);
  return (
    <div className="space-y-5">
      <form action={action} className="space-y-5">
        <TextField
          onCard
          label="Email of the person"
          name="email"
          type="email"
          autoComplete="off"
          defaultValue={state.done ? "" : state.values?.email}
          required
          hint="The link works once, for 3 days, and only for this email."
        />
        <FormMessage error={state.error} />
        <div className="sm:w-56">
          <SubmitButton>Make an invite link</SubmitButton>
        </div>
      </form>
      {state.done ? (
        <div role="status" className="space-y-3 rounded-lg bg-background p-4">
          <p className="text-sm font-medium">
            Invite link for {state.values?.email}
          </p>
          <CopyField label="invite link" value={state.done} />
          <p className="text-xs text-subtle">
            Send it to them yourself. It shows only once here, works once, and
            expires in 3 days.
          </p>
        </div>
      ) : null}
    </div>
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
        <div role="status" className="space-y-3 rounded-lg bg-background p-4">
          <p className="text-sm font-medium">Token for {state.values?.name}</p>
          <CopyField label="token" value={state.done} />
          <p className="text-xs text-subtle">
            It shows only once. Send it as{" "}
            <code>Authorization: Bearer &lt;token&gt;</code>.
          </p>
        </div>
      ) : null}
    </div>
  );
}
