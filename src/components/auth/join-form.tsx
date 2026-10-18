"use client";

import { useActionState } from "react";
import { passwordLength } from "@/lib/auth/password-rules";
import { joinWithInvite, type FormResult } from "@/lib/auth/actions";
import { FormMessage, SubmitButton, TextField } from "./fields";

const initial: FormResult = { error: null };

export function JoinForm({ token, email }: { token: string; email: string }) {
  const [state, action] = useActionState(joinWithInvite, initial);
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
        label="Name"
        name="name"
        autoComplete="name"
        defaultValue={state.values?.name}
        required
        autoFocus
      />
      <TextField
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={passwordLength.min}
        maxLength={passwordLength.max}
        required
        hint={`At least ${passwordLength.min} characters. A few words in a row work well.`}
      />
      <TextField
        label="Password again"
        name="confirm"
        type="password"
        autoComplete="new-password"
        required
      />
      <FormMessage error={state.error} />
      <SubmitButton>Create the account</SubmitButton>
    </form>
  );
}
