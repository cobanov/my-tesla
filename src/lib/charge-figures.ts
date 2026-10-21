import { costBreakdown } from "./charge-cost";
import type { Formatter } from "./format";

export type CostBasis =
  "recorded" | "free" | "per_minute" | "per_kwh" | "price";

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
  costBasis: CostBasis | null;
  billingType: "per_kwh" | "per_minute" | null;
  costPerUnit: number | null;
  sessionFee: number | null;
  cable: string | null;
  batteryHeater: boolean | null;
};

const cableNames: Record<string, string> = {
  IEC: "IEC (Type 2)",
  SAE: "SAE (North America)",
  GB_AC: "GB/T AC",
  GB_DC: "GB/T DC",
};

const costSources: Record<CostBasis, string> = {
  recorded: "Recorded in TeslaMate",
  free: "Free Supercharging",
  per_minute: "Estimate from the geofence price",
  per_kwh: "Estimate from the geofence price",
  price: "Estimate from your price",
};

function tariffOf(session: SessionInput, f: Formatter): string | null {
  const parts = [
    session.costPerUnit === null
      ? null
      : `${f.cost(session.costPerUnit)} per ${session.billingType === "per_minute" ? "minute" : "kWh"}`,
    session.sessionFee === null
      ? null
      : `${f.cost(session.sessionFee)} per session`,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" + ") : null;
}

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
    costSource: costSources[session.costBasis ?? "recorded"],
    estimatedFrom:
      session.costBasis === "price"
        ? ("settings" as const)
        : session.costBasis === "per_minute" || session.costBasis === "per_kwh"
          ? ("geofence" as const)
          : null,
    perKwhSource:
      session.costBasis === "price" ? "Your price" : "Cost ÷ energy billed",
    tariff: tariffOf(session, f),
    cable:
      session.cable === null
        ? null
        : (cableNames[session.cable] ?? session.cable),
    batteryHeater:
      session.batteryHeater === null
        ? null
        : session.batteryHeater
          ? "Used"
          : "Not used",
    breakdown:
      session.costBasis === "free"
        ? null
        : costBreakdown({
            cost: session.cost,
            addedKwh: added,
            billedKwh: session.billedKwh,
            rangeAdded,
            levelsAdded,
          }),
  };
}
