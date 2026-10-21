"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useState, type ReactNode } from "react";

export function ShowMore({
  count,
  more,
  children,
}: {
  count: number;
  more: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {children}
      {open && more}
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex h-10 w-full items-center justify-center gap-1 border-t border-border text-sm font-medium text-muted-foreground transition-tesla hover:text-foreground"
      >
        {open ? (
          <>
            <ChevronUp aria-hidden className="size-4" />
            Show fewer
          </>
        ) : (
          <>
            <ChevronDown aria-hidden className="size-4" />
            Show {count} more
          </>
        )}
      </button>
    </>
  );
}
