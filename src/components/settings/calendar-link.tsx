"use client";

import { CalendarPlus } from "lucide-react";
import { useState, useTransition } from "react";
import { createCalendarLink, type CalendarLink } from "@/lib/auth/actions";

const buttonClass =
  "inline-flex h-10 items-center justify-center gap-2 rounded px-5 text-sm font-medium transition-tesla disabled:opacity-60";

export function CalendarLinkPanel({
  carId,
  carName,
}: {
  carId: number;
  carName: string;
}) {
  const [link, setLink] = useState<CalendarLink | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <div className="space-y-4 py-5">
      <p className="max-w-md text-sm text-muted-foreground">
        A calendar app shows the drives and charges of {carName} from the last
        year, and checks for new ones every hour. Anyone with the link sees
        them, so keep it private. Account lists each link and can revoke it.
      </p>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => setLink(await createCalendarLink(carId)))
        }
        className={`${buttonClass} bg-background hover:bg-accent`}
      >
        <CalendarPlus className="size-4" />
        Make a calendar link
      </button>
      {link?.ok === false && (
        <p role="alert" className="text-sm text-destructive">
          {link.message}
        </p>
      )}
      {link?.ok && (
        <div role="status" className="space-y-3 rounded-lg bg-background p-4">
          <p className="text-sm font-medium">
            Copy the link now. It shows only once.
          </p>
          <code className="block text-xs break-all select-all">{link.url}</code>
          <a
            href={link.subscribe}
            className={`${buttonClass} bg-primary text-primary-foreground hover:bg-primary/90`}
          >
            Subscribe in the calendar app
          </a>
        </div>
      )}
    </div>
  );
}
