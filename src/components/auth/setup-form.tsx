"use client";

import { useActionState } from "react";
import { passwordLength } from "@/lib/auth/password-rules";
import { setUp, type FormResult } from "@/lib/auth/actions";
import { FormMessage, SubmitButton, TextField } from "./fields";

const initial: FormResult = { error: null };

export function SetupForm({ token }: { token: string }) {
  const [state, action] = useActionState(setUp, initial);
  return (
    <form action={action} className="space-y-5">
      {token ? (
        <input type="hidden" name="token" value={token} />
      ) : (
        <TextField
          label="Setup code"
          name="token"
          autoComplete="off"
          required
          hint="The server prints a setup link with this code in its log when it starts without an account."
        />
      )}
      <TextField
        label="Name"
        name="name"
        autoComplete="name"
        defaultValue={state.values?.name}
        required
      />
      <TextField
        label="Email"
        name="email"
        type="email"
        autoComplete="username"
        defaultValue={state.values?.email}
        required
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
      <SubmitButton>Create the admin account</SubmitButton>
    </form>
  );
}
