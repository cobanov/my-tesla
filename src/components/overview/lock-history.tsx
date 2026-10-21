import { Lock, LockOpen, ShieldCheck, ShieldOff } from "lucide-react";
import type { Formatter } from "@/lib/format";
import { historyText } from "@/lib/history/changes";
import type { HistoryEvent } from "@/lib/history/store";
import { cn } from "@/lib/utils";

function iconOf(event: HistoryEvent) {
  if (event.kind === "locked") return event.value ? Lock : LockOpen;
  return event.value ? ShieldCheck : ShieldOff;
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
  return (
    <section className={cn("rounded-xl bg-card p-5", className)}>
      <h2 className="text-sm text-muted-foreground">Locks and Sentry Mode</h2>
      {events.length ? (
        <ul className="mt-3 divide-y divide-border">
          {events.map((event) => {
            const Icon = iconOf(event);
            const at = new Date(event.at);
            return (
              <li
                key={`${event.kind}-${event.at}`}
                className="flex items-center justify-between gap-4 py-2.5 text-sm"
              >
                <span className="flex items-center gap-2">
                  <Icon
                    aria-hidden
                    className={cn(
                      "size-4",
                      event.kind === "locked" && !event.value
                        ? "text-warning"
                        : "text-muted-foreground",
                    )}
                  />
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
          })}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-subtle">
          No change in the last 7 days. My Tesla records each lock and Sentry
          Mode change from the MQTT feed.
        </p>
      )}
    </section>
  );
}
