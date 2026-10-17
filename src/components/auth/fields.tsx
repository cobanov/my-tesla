"use client";

import { LoaderCircle } from "lucide-react";
import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";

export function TextField({
  label,
  hint,
  className,
  onCard = false,
  ...input
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  name: string;
  onCard?: boolean;
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="text-sm text-muted-foreground">
        {label}
      </label>
      <input
        {...input}
        id={id}
        aria-describedby={hintId}
        className={cn(
          "mt-1.5 h-11 w-full rounded px-3 text-[15px] transition-tesla outline-none placeholder:text-subtle focus-visible:ring-2 focus-visible:ring-ring",
          onCard ? "bg-background" : "bg-card",
        )}
      />
      {hint && (
        <p id={hintId} className="mt-1.5 text-xs text-subtle">
          {hint}
        </p>
      )}
    </div>
  );
}

export function SubmitButton({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded bg-primary px-5 text-sm font-medium text-primary-foreground transition-tesla hover:bg-primary/90 disabled:opacity-70"
    >
      {pending && <LoaderCircle className="size-4 animate-spin" />}
      {children}
    </button>
  );
}

export function FormMessage({
  error,
  done,
}: {
  error: string | null;
  done?: string;
}) {
  if (error) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {error}
      </p>
    );
  }
  return done ? (
    <p role="status" className="text-sm text-good">
      {done}
    </p>
  ) : null;
}
