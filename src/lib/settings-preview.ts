import type { Formatter } from "./format";

const sample = {
  at: new Date("2026-09-08T11:05:00Z"),
  now: new Date("2026-10-01T09:00:00Z"),
  distanceKm: 152.4,
  temperatureC: 21.4,
  pressureBar: 2.9,
  whPerKm: 152,
  speedKmh: 118,
  cost: 1234.5,
};

export function previewRows(f: Formatter): [label: string, value: string][] {
  return [
    ["Distance", f.distance(sample.distanceKm)],
    ["Speed", f.speed(sample.speedKmh)],
    ["Outside", f.temperature(sample.temperatureC)],
    ["Tire", f.pressure(sample.pressureBar)],
    ["Efficiency", f.efficiency(sample.whPerKm)],
    ["Cost", f.cost(sample.cost)],
    ["Date", f.day(sample.at, sample.now)],
    ["Time", f.clock(sample.at)],
  ];
}
