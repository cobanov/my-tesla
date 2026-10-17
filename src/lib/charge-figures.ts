import { costBreakdown } from "./charge-cost";
import type { Formatter } from "./format";

type SessionInput = {
  fast: boolean;
  brand: string | null;
  phases: number | null;
  energyAddedKwh: number | null;
  energyUsedKwh: number | null;
  billedKwh: number | null;
  durationMin: number | null;
  startLevel: number | null;
  endLevel: number | null;
  startRangeKm: number | null;
  endRangeKm: number | null;
  cost: number | null;
  costEstimated: boolean;
};

type CurveInput = { level: number | null; power: number | null };

export function powerByLevel(
  curve: CurveInput[],
): { level: number; power: number }[] {
  const byLevel = new Map<number, { sum: number; count: number }>();
  for (const point of curve) {
    if (point.level === null || point.power === null) continue;
    const entry = byLevel.get(point.level) ?? { sum: 0, count: 0 };
    entry.sum += point.power;
    entry.count += 1;
    byLevel.set(point.level, entry);
  }
  return [...byLevel.entries()]
    .sort(([a], [b]) => a - b)
    .map(([level, entry]) => ({
      level,
      power: Math.round((entry.sum / entry.count) * 10) / 10,
    }));
}

export function chargeFigures(session: SessionInput, f: Formatter) {
  const added = session.energyAddedKwh;
  const rangeAdded =
    session.startRangeKm !== null && session.endRangeKm !== null
      ? f.distanceValue(session.endRangeKm - session.startRangeKm)
      : null;
  const levelsAdded =
    session.startLevel !== null && session.endLevel !== null
      ? session.endLevel - session.startLevel
      : null;
  return {
    averagePower:
      added !== null && session.durationMin
        ? added / (session.durationMin / 60)
        : null,
    efficiency:
      added !== null && session.energyUsedKwh
        ? (added / session.energyUsedKwh) * 100
        : null,
    rangeAdded,
    levelsAdded,
    kind: session.fast
      ? [session.brand, "DC fast charge"].filter(Boolean).join(" ")
      : `AC${session.phases ? `, ${session.phases} phase` : ""}`,
    costSource: session.costEstimated
      ? "Estimate from your price"
      : "Recorded in TeslaMate",
    breakdown: costBreakdown({
      cost: session.cost,
      addedKwh: added,
      billedKwh: session.billedKwh,
      rangeAdded,
      levelsAdded,
    }),
  };
}
