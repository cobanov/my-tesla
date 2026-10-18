import { localParts } from "./date-format";
import { dayWindow } from "./insights";

export function pickYear(
  asked: string | undefined,
  years: number[],
  now: Date,
  timeZone: string,
): number | null {
  const chosen = Number(asked);
  if (years.includes(chosen)) return chosen;
  const current = localParts(now, timeZone).year;
  if (years.includes(current)) return current;
  return years[0] ?? null;
}

export function yearWindow(
  year: number,
  timeZone: string,
): { from: Date; to: Date } {
  return {
    from: dayWindow(`${year}-01-01`, timeZone).start,
    to: dayWindow(`${year + 1}-01-01`, timeZone).start,
  };
}

export function busiest<T extends { distanceKm: number }>(
  buckets: T[],
): T | null {
  return buckets.reduce<T | null>(
    (best, bucket) =>
      bucket.distanceKm > (best?.distanceKm ?? 0) ? bucket : best,
    null,
  );
}

export function monthName(at: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "long", timeZone }).format(
    at,
  );
}
