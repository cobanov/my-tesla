"use client";

import { useActionState } from "react";
import { signIn, type FormResult } from "@/lib/auth/actions";
import { FormMessage, SubmitButton, TextField } from "./fields";

const initial: FormResult = { error: null };

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState(signIn, initial);
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="next" value={next} />
      <TextField
        label="Email"
        name="email"
        type="email"
        autoComplete="username"
        defaultValue={state.values?.email}
        required
        autoFocus
      />
      <TextField
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />
      <FormMessage error={state.error} />
      <SubmitButton>Sign in</SubmitButton>
    </form>
  );
}
