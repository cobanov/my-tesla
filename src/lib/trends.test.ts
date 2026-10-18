import { describe, expect, test } from "bun:test";
import { createFormatter } from "./format";
import { defaultPreferences } from "./preferences";
import {
  levelTrendRows,
  projectedRangeKm,
  rangeByLevel,
  rangeByTemperature,
  stateShares,
} from "./trends";

const metric = createFormatter(defaultPreferences, "Europe/Istanbul");
const imperial = createFormatter(
  { ...defaultPreferences, distance: "mi", temperature: "f" },
  "Europe/Istanbul",
);

const cold = { value: 5, samples: 1, rangeKm: 300, level: 60, usableLevel: 58 };
const warm = {
  value: 20,
  samples: 4,
  rangeKm: 1200,
  level: 240,
  usableLevel: 240,
};

describe("projectedRangeKm", () => {
  test("scales the range to 100% and takes off the level the cold locks", () => {
    expect(projectedRangeKm(warm)).toBe(500);
    expect(projectedRangeKm(cold)).toBeCloseTo(490, 6);
  });

  test("gives nothing without a battery level", () => {
    expect(projectedRangeKm({ ...warm, level: 0 })).toBeNull();
    expect(projectedRangeKm({ ...warm, samples: 0 })).toBeNull();
  });
});

describe("rangeByTemperature", () => {
  test("puts each degree and range in the units of the settings", () => {
    expect(rangeByTemperature([cold, warm], metric)).toEqual([
      { temperature: 5, range: 490 },
      { temperature: 20, range: 500 },
    ]);
    expect(rangeByTemperature([cold, warm], imperial)).toEqual([
      { temperature: 41, range: 304 },
      { temperature: 68, range: 311 },
    ]);
  });

  test("drops a group without a battery level", () => {
    expect(rangeByTemperature([{ ...cold, level: 0 }, warm], metric)).toEqual([
      { temperature: 20, range: 500 },
    ]);
  });
});

describe("rangeByLevel", () => {
  test("keeps the battery level as the key", () => {
    expect(
      rangeByLevel(
        [
          { ...cold, value: 60 },
          { ...warm, value: 80 },
        ],
        imperial,
      ),
    ).toEqual([
      { level: 60, range: 304 },
      { level: 80, range: 311 },
    ]);
  });
});

describe("levelTrendRows", () => {
  const at = new Date("2026-10-01T00:00:00Z");

  test("rounds the levels and shows the usable level only when it differs", () => {
    expect(levelTrendRows([{ at, level: 70.04, usableLevel: 69.96 }])).toEqual({
      rows: [{ at: at.getTime(), level: 70, usable: 70 }],
      usableDiffers: false,
    });
    expect(
      levelTrendRows([{ at, level: 70, usableLevel: 68 }]).usableDiffers,
    ).toBe(true);
  });
});

describe("stateShares", () => {
  test("gives the share of each state in a fixed order", () => {
    const { hours, states } = stateShares([
      { state: "asleep", seconds: 18 * 3600 },
      { state: "online", seconds: 6 * 3600 },
    ]);
    expect(hours).toBe(24);
    expect(states).toEqual([
      { state: "online", label: "Online", seconds: 6 * 3600, share: 0.25 },
      { state: "asleep", label: "Asleep", seconds: 18 * 3600, share: 0.75 },
      { state: "offline", label: "Offline", seconds: 0, share: 0 },
    ]);
  });

  test("gives zero shares without a record", () => {
    const { hours, states } = stateShares([]);
    expect(hours).toBe(0);
    expect(states.map((row) => row.share)).toEqual([0, 0, 0]);
  });
});
