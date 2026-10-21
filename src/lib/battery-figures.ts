import type {
  BatteryCapacityPoint,
  BatteryNow,
  BatteryTotals,
} from "./battery-data";
import type { Formatter } from "./format";
import {
  batteryCapacity,
  healthCharges,
  levelHistogram,
  median,
  type IdlePeriod,
} from "./insights";

export function batteryFigures(
  capacity: BatteryCapacityPoint[],
  latest: BatteryNow,
  totals: BatteryTotals,
) {
  const estimate = batteryCapacity(capacity);
  return {
    estimate,
    health: estimate?.healthPercent ?? null,
    bestRange: capacity.length
      ? Math.max(...capacity.map((point) => point.rangeKm))
      : null,
    rangeNow:
      median(capacity.slice(-5).map((point) => point.rangeKm)) ??
      latest.rangeAt100Km,
    cycles: estimate ? totals.addedKwh / estimate.bestKwh : null,
    efficiency: totals.usedKwh ? totals.addedKwh / totals.usedKwh : null,
    totalCharged: totals.acKwh + totals.dcKwh,
  };
}

export function missingChargesText(
  missing: number,
  minimumKwh: number | null,
  f: Formatter,
): string {
  const count = missing < healthCharges ? `${missing} more` : `${missing}`;
  const charges = missing === 1 ? "charge" : "charges";
  return minimumKwh === null
    ? `Needs ${count} long ${charges}`
    : `Needs ${count} ${charges} of ${f.number(Math.ceil(minimumKwh))} kWh or more`;
}

export function levelChargeHistogram(
  charges: { startLevel: number; endLevel: number }[],
): { level: number; start: number; end: number }[] {
  const startBuckets = levelHistogram(charges.map((row) => row.startLevel));
  const endBuckets = levelHistogram(charges.map((row) => row.endLevel));
  return startBuckets.map((bucket, index) => ({
    level: bucket.level,
    start: bucket.count,
    end: endBuckets[index]?.count ?? 0,
  }));
}

export function idleWatts(period: IdlePeriod): number | null {
  const hours = period.durationS / 3600;
  return period.energyKwh === null ? null : (period.energyKwh / hours) * 1000;
}

const dayMs = 24 * 60 * 60 * 1000;

export function chargeAdvice(
  lfp: boolean,
  charges: { endLevel: number; endAt: Date }[],
  now: Date,
): { advice: string; detail: string | null } {
  if (lfp) {
    const lastFull = charges
      .filter((charge) => charge.endLevel >= 99)
      .reduce<Date | null>(
        (latest, charge) =>
          latest && latest >= charge.endAt ? latest : charge.endAt,
        null,
      );
    const days = lastFull
      ? Math.floor((now.getTime() - lastFull.getTime()) / dayMs)
      : null;
    return {
      advice:
        "This car has an LFP battery. Tesla recommends a charge limit of 100%, and a full charge at least once a week.",
      detail:
        days === null
          ? charges.length
            ? "No full charge in this period."
            : null
          : days === 0
            ? "The last full charge was today."
            : `The last full charge was ${days} ${days === 1 ? "day" : "days"} ago.`,
    };
  }
  const high = charges.filter((charge) => charge.endLevel > 90).length;
  return {
    advice:
      "Tesla recommends a daily charge limit of 80 to 90% for this battery, and 100% only before a long trip.",
    detail: charges.length
      ? `${high} of ${charges.length} ${charges.length === 1 ? "charge" : "charges"} in this period ended above 90%.`
      : null,
  };
}
