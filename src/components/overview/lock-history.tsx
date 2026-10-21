import {
  ChevronDown,
  ChevronUp,
  Lock,
  LockOpen,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";
import type { Formatter } from "@/lib/format";
import { historyText } from "@/lib/history/changes";
import type { HistoryEvent } from "@/lib/history/store";
import { cn } from "@/lib/utils";

const shownFirst = 5;

function EventIcon({ event }: { event: HistoryEvent }) {
  const className = cn(
    "size-4",
    event.kind === "locked" && !event.value
      ? "text-warning"
      : "text-muted-foreground",
  );
  if (event.kind === "locked") {
    return event.value ? (
      <Lock aria-hidden className={className} />
    ) : (
      <LockOpen aria-hidden className={className} />
    );
  }
  return event.value ? (
    <ShieldCheck aria-hidden className={className} />
  ) : (
    <ShieldOff aria-hidden className={className} />
  );
}

function EventRow({
  event,
  now,
  f,
}: {
  event: HistoryEvent;
  now: Date;
  f: Formatter;
}) {
  const at = new Date(event.at);
  return (
    <li className="flex items-center justify-between gap-4 py-2.5 text-sm">
      <span className="flex items-center gap-2">
        <EventIcon event={event} />
        {historyText(event)}
      </span>
      <time
        dateTime={at.toISOString()}
        className="text-muted-foreground tabular"
      >
        {f.day(at, now)} {f.clock(at)}
      </time>
    </li>
  );
}

export function LockHistory({
  events,
  now,
  f,
  className,
}: {
  events: HistoryEvent[];
  now: Date;
  f: Formatter;
  className?: string;
}) {
  const first = events.slice(0, shownFirst);
  const rest = events.slice(shownFirst);
  return (
    <section className={cn("rounded-xl bg-card p-5", className)}>
      <h2 className="text-sm text-muted-foreground">Locks and Sentry Mode</h2>
      {events.length ? (
        <>
          <ul className="mt-3 divide-y divide-border">
            {first.map((event) => (
              <EventRow
                key={`${event.kind}-${event.at}`}
                event={event}
                now={now}
                f={f}
              />
            ))}
          </ul>
          {rest.length > 0 && (
            <details className="group border-t border-border">
              <summary className="flex h-10 cursor-pointer list-none items-center justify-center gap-1 text-sm font-medium text-muted-foreground transition-tesla hover:text-foreground [&::-webkit-details-marker]:hidden">
                <ChevronDown aria-hidden className="size-4 group-open:hidden" />
                <ChevronUp
                  aria-hidden
                  className="hidden size-4 group-open:block"
                />
                <span className="group-open:hidden">
                  Show {rest.length} more
                </span>
                <span className="hidden group-open:inline">Show fewer</span>
              </summary>
              <ul className="divide-y divide-border border-t border-border">
                {rest.map((event) => (
                  <EventRow
                    key={`${event.kind}-${event.at}`}
                    event={event}
                    now={now}
                    f={f}
                  />
                ))}
              </ul>
            </details>
          )}
        </>
      ) : (
        <p className="mt-3 text-sm text-subtle">
          No change in the last 7 days. My Tesla records each lock and Sentry
          Mode change from the MQTT feed.
        </p>
      )}
    </section>
  );
}
