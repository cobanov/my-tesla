"use client";

import Link from "next/link";
import { useActionState } from "react";
import { passwordLength } from "@/lib/auth/password-rules";
import { resetPassword, type FormResult } from "@/lib/auth/actions";
import { FormMessage, SubmitButton, TextField } from "./fields";

const initial: FormResult = { error: null };

export function ResetForm({ token, email }: { token: string; email: string }) {
  const [state, action] = useActionState(resetPassword, initial);
  if (state.done) {
    return (
      <div className="space-y-5">
        <FormMessage error={null} done={state.done} />
        <Link
          href="/login"
          className="inline-flex h-11 w-full items-center justify-center rounded bg-primary px-5 text-sm font-medium text-primary-foreground transition-tesla hover:bg-primary/90"
        >
          Sign in
        </Link>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="token" value={token} />
      <TextField
        label="Email"
        name="email"
        type="email"
        autoComplete="username"
        value={email}
        readOnly
      />
      <TextField
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={passwordLength.min}
        maxLength={passwordLength.max}
        required
        autoFocus
        hint={`At least ${passwordLength.min} characters. Every session and phone of this account signs out.`}
      />
      <TextField
        label="New password again"
        name="confirm"
        type="password"
        autoComplete="new-password"
        required
      />
      <FormMessage error={state.error} />
      <SubmitButton>Set the new password</SubmitButton>
    </form>
  );
}
