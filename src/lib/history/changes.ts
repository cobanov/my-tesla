import type { HistoryEvent, LastValues } from "./store";

export type Watched = { locked: boolean | null; sentryMode: boolean | null };

export function historyChanges(
  last: LastValues,
  view: Watched,
  at: number,
): { events: HistoryEvent[]; last: LastValues } {
  const seen: LastValues = {
    locked: view.locked ?? last.locked,
    sentry: view.sentryMode ?? last.sentry,
  };
  const events = (["locked", "sentry"] as const)
    .filter(
      (kind) =>
        last[kind] !== null && seen[kind] !== null && seen[kind] !== last[kind],
    )
    .map((kind) => ({ kind, value: seen[kind] === true, at }));
  return { events, last: seen };
}

export function historyText(event: HistoryEvent): string {
  if (event.kind === "locked") return event.value ? "Locked" : "Unlocked";
  return event.value ? "Sentry Mode on" : "Sentry Mode off";
}
