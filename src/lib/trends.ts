import type { Formatter } from "./format";

export type LevelTrendPoint = { at: Date; level: number; usableLevel: number };

export type OdometerPoint = { at: Date; km: number };

export type RangeGroup = {
  value: number;
  samples: number;
  rangeKm: number;
  level: number;
  usableLevel: number;
};

type CarState = "online" | "asleep" | "offline";

export type StateTime = { state: CarState; seconds: number };

const carStates: { state: CarState; label: string }[] = [
  { state: "online", label: "Online" },
  { state: "asleep", label: "Asleep" },
  { state: "offline", label: "Offline" },
];

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function projectedRangeKm(group: RangeGroup): number | null {
  if (group.level <= 0 || group.samples <= 0) return null;
  const atFull = (group.rangeKm / group.level) * 100;
  const lockedLevel = (group.level - group.usableLevel) / group.samples;
  return atFull * (1 - lockedLevel / 100);
}

function rangeRows(groups: RangeGroup[], f: Formatter) {
  return groups.flatMap((group) => {
    const km = projectedRangeKm(group);
    return km === null
      ? []
      : [{ value: group.value, range: Math.round(f.distanceValue(km) ?? 0) }];
  });
}

export function rangeByTemperature(groups: RangeGroup[], f: Formatter) {
  return rangeRows(groups, f).map(({ value, range }) => ({
    temperature: Math.round(f.temperatureValue(value) ?? value),
    range,
  }));
}

export function rangeByLevel(groups: RangeGroup[], f: Formatter) {
  return rangeRows(groups, f).map(({ value, range }) => ({
    level: value,
    range,
  }));
}

export function levelTrendRows(points: LevelTrendPoint[]) {
  return {
    rows: points.map((point) => ({
      at: point.at.getTime(),
      level: round1(point.level),
      usable: round1(point.usableLevel),
    })),
    usableDiffers: points.some((point) => point.level - point.usableLevel >= 1),
  };
}

export function odometerRows(points: OdometerPoint[], f: Formatter) {
  return points.map((point) => ({
    at: point.at.getTime(),
    odometer: Math.round(f.distanceValue(point.km) ?? 0),
  }));
}

export function stateShares(times: StateTime[]) {
  const total = times.reduce((sum, time) => sum + time.seconds, 0);
  return {
    hours: total / 3600,
    states: carStates.map(({ state, label }) => {
      const seconds = times
        .filter((time) => time.state === state)
        .reduce((sum, time) => sum + time.seconds, 0);
      return { state, label, seconds, share: total ? seconds / total : 0 };
    }),
  };
}
