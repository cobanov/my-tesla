import type { Formatter } from "../format";
import type { VisitedPlace } from "../places-data";
import { placesFigures } from "../places-figures";
import type { Car } from "../queries";
import type {
  BiggestCharge,
  ChargeTotals,
  DriveTotals,
  LongDrive,
  StatsBucket,
} from "../stats-data";
import { bucketRows } from "../stats-figures";
import { localDayKey } from "../insights";
import { busiest, monthName } from "../year-review";
import { buildChart } from "./chart";
import type { AppRecord, YearPage } from "./contract";
import { chartBlock, panel } from "./panels";
import { visitedRecords } from "./places";
import { statsHero } from "./stats";

export type YearInput = {
  years: number[];
  year: number | null;
  window: { from: Date; to: Date } | null;
  drives: DriveTotals;
  charges: ChargeTotals;
  months: StatsBucket[];
  days: StatsBucket[];
  longest: LongDrive[];
  charge: BiggestCharge | null;
  visited: VisitedPlace[];
};

const shownPlaces = 5;

function yearRecord(
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

export function yearPage(
  input: YearInput,
  car: Car,
  f: Formatter,
  now: Date,
): YearPage {
  const base = {
    title: "Year in review",
    year: input.year,
    years: input.years,
  };
  if (input.year === null || !input.window) {
    return {
      ...base,
      subtitle: "No drive or charge yet.",
      hero: [],
      heroBlocks: [],
      sections: [],
    };
  }
  const { from, to } = input.window;
  const lastDay = new Date(Math.min(to.getTime(), now.getTime()) - 1);
  const busiestMonth = busiest(input.months);
  const busiestDay = busiest(input.days);
  const longest = input.longest[0] ?? null;
  const charge = input.charge;
  const places = placesFigures(input.visited, []);
  const records: AppRecord[] = [
    busiestMonth &&
      yearRecord({
        key: "month",
        title: `Busiest month: ${monthName(busiestMonth.at, f.timeZone)}`,
        value: f.distance(busiestMonth.distanceKm),
        detail: `${f.duration(busiestMonth.minutes)} driving`,
      }),
    busiestDay &&
      yearRecord({
        key: "day",
        title: `Busiest day: ${f.day(busiestDay.at, now)}`,
        value: f.distance(busiestDay.distanceKm),
        detail: `${f.duration(busiestDay.minutes)} driving`,
        target: { kind: "day", day: localDayKey(busiestDay.at, f.timeZone) },
      }),
    longest &&
      yearRecord({
        key: "drive",
        title: `Longest drive: ${longest.from} → ${longest.to}`,
        value: f.distance(longest.distanceKm),
        detail: `${f.date(longest.startAt)} · ${f.duration(longest.durationMin)}`,
        target: { kind: "drive", id: longest.id },
      }),
    charge &&
      yearRecord({
        key: "charge",
        title: `Biggest charge: ${charge.place}`,
        value: f.energy(charge.addedKwh),
        detail: [
          f.date(charge.startAt),
          charge.cost === null ? null : f.cost(charge.cost),
        ]
          .filter(Boolean)
          .join(" · "),
        target: { kind: "charge", id: charge.id },
      }),
  ].filter((row): row is AppRecord => Boolean(row));
  return {
    ...base,
    subtitle: `${f.date(from)} to ${f.date(lastDay)}`,
    ...statsHero(input.drives, input.charges, car, f),
    sections: [
      {
        title: null,
        subtitle: null,
        period: false,
        panels: [
          panel(
            `Distance (${f.units.distance})`,
            [
              input.drives.drives > 0 &&
                chartBlock(
                  buildChart({
                    title: "Distance",
                    rows: bucketRows(input.months, f),
                    xKey: "at",
                    xFormat: "month",
                    style: f.chartStyle,
                    left: "zero",
                    series: [
                      {
                        key: "distance",
                        label: "Distance",
                        unit: f.units.distance,
                        color: "chart1",
                        kind: "bar",
                        digits: 1,
                      },
                    ],
                  }),
                ),
            ],
            "Per month",
          ),
          panel("Records", [
            records.length > 0 && { kind: "records", rows: records },
          ]),
          panel("Top places", [
            places.top.length > 0 && {
              kind: "records",
              rows: visitedRecords(
                places.top.slice(0, shownPlaces),
                places,
                f,
                now,
              ),
            },
          ]),
        ],
      },
    ],
  };
}
