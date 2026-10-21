import type { Formatter } from "@/lib/format";
import type { VisitedPlace } from "@/lib/places-data";
import { cn } from "@/lib/utils";

export function VisitedPlaces({
  places,
  mostVisits,
  chargingKeys,
  f,
  now,
}: {
  places: VisitedPlace[];
  mostVisits: number;
  chargingKeys: Set<string>;
  f: Formatter;
  now: Date;
}) {
  return (
    <ol className="space-y-4">
      {places.map((place, index) => (
        <li key={place.key} className="flex items-start gap-4">
          <span className="w-4 pt-0.5 text-sm text-subtle tabular">
            {index + 1}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-4">
              <span className="truncate text-sm font-medium">
                {place.label}
              </span>
              <span className="shrink-0 text-sm tabular">
                {place.visits}{" "}
                <span className="text-muted-foreground">
                  {place.visits === 1 ? "visit" : "visits"}
                </span>
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-700 ease-tesla starting:w-0!",
                  chargingKeys.has(place.key) ? "bg-charge" : "bg-primary",
                )}
                style={{
                  width: `${(place.visits / mostVisits) * 100}%`,
                }}
              />
            </div>
            <p className="mt-1.5 truncate text-xs text-subtle tabular">
              {[
                place.city && place.city !== place.label ? place.city : null,
                `${f.span(place.parkedS / 60)} parked`,
                `last visit ${f.dayInline(place.lastAt, now)}`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
