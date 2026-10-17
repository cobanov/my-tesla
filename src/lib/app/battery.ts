import {
  assessAsleep,
  assessBatteryHealth,
  assessChargingEfficiency,
  assessIdleLoss,
  assessIdlePower,
} from "../assessment";
import type {
  BatteryCapacityPoint,
  BatteryNow,
  BatteryTotals,
} from "../battery-data";
import {
  batteryFigures,
  idleWatts,
  levelChargeHistogram,
  missingChargesText,
} from "../battery-figures";
import type { Formatter } from "../format";
import {
  drainRate,
  healthCharges,
  levelShares,
  type IdlePeriod,
  type PeriodId,
} from "../insights";
import { buildChart } from "./chart";
import type { InsightPage, ShareColor } from "./contract";
import { chartBlock, panel, periodChoices, periodLabel } from "./panels";
import { appStat, appValue } from "./values";

export type BatteryInput = {
  capacity: BatteryCapacityPoint[];
  latest: BatteryNow;
  totals: BatteryTotals;
  levels: { level: number; seconds: number }[];
  charges: { startLevel: number; endLevel: number }[];
  idle: IdlePeriod[];
  minimumKwh: number | null;
};

const idleRows = 8;

function percentText(share: number): string {
  return `${Math.round(share * 100)}%`;
}

function kwhShare(
  label: string,
  kwh: number,
  total: number,
  color: ShareColor,
  f: Formatter,
) {
  const share = total ? kwh / total : 0;
  return {
    label,
    share,
    text: `${f.number(kwh)} kWh · ${percentText(share)}`,
    color,
  };
}

export function batteryPage(
  input: BatteryInput,
  period: PeriodId,
  f: Formatter,
  now: Date,
): InsightPage {
  const { capacity, totals, levels, charges, idle } = input;
  const figures = batteryFigures(capacity, input.latest, totals);
  const { estimate, health, efficiency, totalCharged } = figures;
  const series = capacity.map((point) => ({
    at: point.at.getTime(),
    kwh: Math.round(point.kwh * 10) / 10,
    range: Math.round(f.distanceValue(point.rangeKm) ?? 0),
  }));
  const shares = levelShares(
    levels.map((row) => ({ level: row.level, weightMs: row.seconds * 1000 })),
  );
  const trackedHours = levels.reduce((sum, row) => sum + row.seconds, 0) / 3600;
  const drain = drainRate(idle);
  const style = f.chartStyle;
  return {
    title: "Battery",
    subtitle: null,
    period,
    periods: periodChoices(),
    hero: [
      appStat("Health", health === null ? "—" : `${f.number(health, 1)}%`, {
        assessment: assessBatteryHealth(
          health,
          capacity.at(-1)?.odometerKm ?? null,
          f,
        ),
        detail:
          health === null
            ? missingChargesText(
                estimate?.missingCharges ?? healthCharges,
                input.minimumKwh,
                f,
              )
            : `From ${capacity.length} charges`,
      }),
      appStat(
        "Capacity now",
        estimate ? `${f.number(estimate.nowKwh, 1)} kWh` : "—",
        {
          detail: estimate ? `Best ${f.number(estimate.bestKwh, 1)} kWh` : null,
        },
      ),
      appStat(
        "Range at 100%",
        figures.rangeNow === null
          ? "—"
          : `${f.number(Math.round(f.distanceValue(figures.rangeNow) ?? 0))} ${f.units.distance}`,
        {
          detail: figures.bestRange
            ? `Best ${f.distance(figures.bestRange)}`
            : null,
        },
      ),
      appStat(
        "Charge cycles",
        figures.cycles === null ? "—" : f.number(figures.cycles, 1),
        { detail: `${f.number(totals.addedKwh)} kWh added` },
      ),
    ],
    heroBlocks:
      estimate && health !== null
        ? [
            {
              kind: "progress",
              share: Math.min(1, estimate.nowKwh / estimate.bestKwh),
              start: "0 kWh",
              end: `${f.number(estimate.nowKwh, 1)} of ${f.number(estimate.bestKwh, 1)} kWh`,
            },
          ]
        : [],
    sections: [
      {
        title: null,
        subtitle: null,
        period: false,
        panels: [
          panel(
            "Capacity (kWh)",
            [
              chartBlock(
                buildChart({
                  title: "Capacity",
                  rows: series,
                  xKey: "at",
                  xFormat: "day",
                  style,
                  series: [
                    {
                      key: "kwh",
                      label: "Capacity",
                      unit: "kWh",
                      color: "chart1",
                      kind: "area",
                      digits: 1,
                    },
                  ],
                }),
              ),
            ],
            "Estimated after each long charge",
          ),
          panel(`Range at 100% (${f.units.distance})`, [
            chartBlock(
              buildChart({
                title: "Range",
                rows: series,
                xKey: "at",
                xFormat: "day",
                style,
                series: [
                  {
                    key: "range",
                    label: "Range",
                    unit: f.units.distance,
                    color: "chart1",
                  },
                ],
              }),
            ),
          ]),
          panel(
            "Charging energy",
            totals.sessions
              ? [
                  {
                    kind: "stats",
                    stats: [
                      appStat("Added", `${f.number(totals.addedKwh)} kWh`, {
                        detail: `${totals.sessions} ${totals.sessions === 1 ? "session" : "sessions"}`,
                      }),
                      appStat(
                        "Efficiency",
                        efficiency === null
                          ? "—"
                          : `${Math.round(efficiency * 100)}%`,
                        {
                          assessment: assessChargingEfficiency(
                            efficiency === null ? null : efficiency * 100,
                            totals.dcKwh > totals.acKwh,
                          ),
                          detail: `${f.number(totals.usedKwh)} kWh from chargers`,
                        },
                      ),
                    ],
                  },
                  {
                    kind: "shares",
                    rows: [
                      kwhShare("AC", totals.acKwh, totalCharged, "charge", f),
                      kwhShare(
                        "DC fast",
                        totals.dcKwh,
                        totalCharged,
                        "primary",
                        f,
                      ),
                    ],
                  },
                ]
              : [],
          ),
        ],
      },
      {
        title: "Habits",
        subtitle: periodLabel(period),
        period: true,
        panels: [
          panel(
            "Time at each level",
            trackedHours
              ? [
                  {
                    kind: "shares",
                    rows: [...shares].reverse().map((band) => ({
                      label: band.label,
                      share: band.share,
                      text: percentText(band.share),
                      color: "primary" as const,
                    })),
                  },
                ]
              : [],
            trackedHours ? `${f.number(trackedHours)} h recorded` : null,
          ),
          panel(
            "Charge start and end levels",
            charges.length
              ? [
                  chartBlock(
                    buildChart({
                      title: "Charge levels",
                      rows: levelChargeHistogram(charges),
                      xKey: "level",
                      xFormat: "percent",
                      style,
                      left: "zero",
                      series: [
                        {
                          key: "start",
                          label: "Start",
                          unit: "",
                          color: "chart3",
                          kind: "bar",
                        },
                        {
                          key: "end",
                          label: "End",
                          unit: "",
                          color: "charge",
                          kind: "bar",
                        },
                      ],
                    }),
                  ),
                ]
              : [],
            charges.length ? `${charges.length} charges` : null,
          ),
          panel(
            "Idle drain",
            drain
              ? [
                  {
                    kind: "stats",
                    stats: [
                      appStat(
                        "Range lost",
                        `${f.number(f.distanceValue(drain.kmPerDay) ?? 0, 1)} ${f.units.distance}/day`,
                      ),
                      appStat(
                        "Battery lost",
                        `${f.number(drain.levelPerDay, 1)}%/day`,
                        { assessment: assessIdleLoss(drain.levelPerDay, f) },
                      ),
                      appStat(
                        "Average power",
                        drain.watts === null
                          ? "—"
                          : `${Math.round(drain.watts)} W`,
                        { assessment: assessIdlePower(drain.watts, f) },
                      ),
                      appStat("Asleep", `${Math.round(drain.standby * 100)}%`, {
                        assessment: assessAsleep(drain.standby),
                        detail: `of ${f.number(drain.hours)} h parked`,
                      }),
                    ],
                  },
                  {
                    kind: "table",
                    columns: ["Parked", "Range lost", "Power"],
                    rows: idle.slice(0, idleRows).map((row) => {
                      const watts = idleWatts(row);
                      return {
                        key: String(row.start.getTime()),
                        cells: [
                          appValue(
                            `${f.day(row.start, now)} ${f.clock(row.start)}`,
                          ),
                          appValue(
                            row.rangeLostKm === null
                              ? "—"
                              : `${f.number(f.distanceValue(row.rangeLostKm) ?? 0, 1)} ${f.units.distance}`,
                          ),
                          appValue(
                            watts === null ? "—" : `${f.number(watts)} W`,
                            assessIdlePower(watts, f),
                          ),
                        ],
                      };
                    }),
                  },
                ]
              : [],
            "Parked for 6 hours or more",
          ),
        ],
      },
    ],
  };
}
