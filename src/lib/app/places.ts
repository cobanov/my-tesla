import type { Formatter } from "../format";
import type { PeriodId } from "../insights";
import type {
  ChargingPlace,
  FrequentRoute,
  Geofence,
  VisitedPlace,
} from "../places-data";
import { placesFigures } from "../places-figures";
import { toElevation, type UnitSystem } from "../units";
import type { AppRecord, InsightPage } from "./contract";
import { panel, periodChoices, periodLabel } from "./panels";
import { appStat } from "./values";

export type PlacesInput = {
  visited: VisitedPlace[];
  charging: ChargingPlace[];
  geofences: Geofence[];
  routes: FrequentRoute[];
};

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

function record(
  input: Pick<AppRecord, "key" | "title"> & Partial<AppRecord>,
): AppRecord {
  return {
    rank: null,
    badge: null,
    value: null,
    detail: null,
    note: null,
    bar: null,
    target: null,
    links: [],
    ...input,
  };
}

export function placesPage(
  input: PlacesInput,
  settings: UnitSystem,
  period: PeriodId,
  f: Formatter,
  now: Date,
): InsightPage {
  const { visited, charging, geofences, routes } = input;
  const figures = placesFigures(visited, charging);
  const { longest, parkedTotal } = figures;
  return {
    title: "Places",
    subtitle: periodLabel(period),
    period,
    periods: periodChoices(),
    hero: [
      appStat("Places", String(visited.length), {
        detail: `${figures.arrivals} arrivals`,
      }),
      appStat(
        "Most time",
        longest && parkedTotal
          ? `${Math.round((longest.parkedS / parkedTotal) * 100)}%`
          : "—",
        { detail: longest ? `at ${longest.label}` : null },
      ),
      appStat("Charging places", String(charging.length), {
        detail: `${f.number(figures.chargedTotal)} kWh added`,
      }),
      appStat("Saved places", String(geofences.length), {
        detail: "Geofences in TeslaMate",
      }),
    ],
    heroBlocks: [],
    sections: [
      {
        title: null,
        subtitle: null,
        period: false,
        panels: [
          panel("Most visited", [
            figures.top.length > 0 && {
              kind: "records",
              rows: figures.top.map((place, index) =>
                record({
                  key: place.key,
                  rank: index + 1,
                  title: place.label,
                  value: plural(place.visits, "visit", "visits"),
                  detail: [
                    place.city && place.city !== place.label
                      ? place.city
                      : null,
                    `${f.span(place.parkedS / 60)} parked`,
                    `last visit ${f.dayInline(place.lastAt, now)}`,
                  ]
                    .filter(Boolean)
                    .join(" · "),
                  bar: {
                    share: place.visits / figures.mostVisits,
                    color: figures.chargingKeys.has(place.key)
                      ? "charge"
                      : "primary",
                  },
                }),
              ),
            },
          ]),
          panel("Charging places", [
            charging.length > 0 && {
              kind: "records",
              rows: charging.map((place) =>
                record({
                  key: place.key,
                  title: place.label,
                  badge: place.fast ? "DC" : "AC",
                  detail: `${plural(place.sessions, "charge", "charges")} · ${f.number(place.addedKwh)} kWh`,
                  value:
                    place.cost === null
                      ? "No cost"
                      : `${f.cost(place.cost)} · ${f.cost(place.cost / place.addedKwh)}/kWh`,
                }),
              ),
            },
          ]),
          panel(
            "Frequent routes",
            [
              routes.length > 0
                ? {
                    kind: "records",
                    rows: routes.map((route) =>
                      record({
                        key: route.key,
                        title: `${route.from} → ${route.to}`,
                        value: `${route.drives} drives`,
                        detail: [
                          f.distance(route.typicalKm),
                          f.duration(route.typicalMin),
                          route.whPerKm === null
                            ? null
                            : f.efficiency(route.whPerKm),
                          `usually at ${f.hour(route.usualHour)}`,
                        ]
                          .filter(Boolean)
                          .join(" · "),
                        note: `Last drive ${f.dayInline(route.lastAt, now)}`,
                        links: [
                          {
                            label: `Fastest ${f.duration(route.fastestMin)}`,
                            target: { kind: "drive", id: route.fastestId },
                          },
                          {
                            label: `Slowest ${f.duration(route.slowestMin)}`,
                            target: { kind: "drive", id: route.slowestId },
                          },
                        ],
                      }),
                    ),
                  }
                : {
                    kind: "note",
                    text: "No route with 3 drives or more in this period.",
                  },
            ],
            "3 drives or more",
          ),
        ],
      },
      {
        title: "Saved places",
        subtitle:
          "TeslaMate names a place and sets its charging cost with a geofence.",
        period: false,
        panels: [
          panel("Geofences", [
            geofences.length > 0
              ? {
                  kind: "records",
                  rows: geofences.map((fence) => {
                    const visits =
                      figures.visitsByFence.get(fence.id)?.visits ?? 0;
                    const charges = figures.chargesByFence.get(fence.id);
                    return record({
                      key: String(fence.id),
                      title: fence.name,
                      value:
                        fence.costPerUnit === null
                          ? "Price not set"
                          : `${f.cost(fence.costPerUnit)}/kWh${
                              fence.sessionFee
                                ? ` + ${f.cost(fence.sessionFee)} per session`
                                : ""
                            }`,
                      detail: [
                        `${f.number(toElevation(fence.radius, settings))} ${f.units.elevation} radius`,
                        plural(visits, "visit", "visits"),
                        charges
                          ? `${f.number(charges.addedKwh)} kWh charged`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · "),
                    });
                  }),
                }
              : { kind: "note", text: "No saved places yet." },
          ]),
        ],
      },
    ],
  };
}
