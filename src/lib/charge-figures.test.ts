import { describe, expect, test } from "bun:test";
import { chargeFigures, powerByLevel } from "./charge-figures";
import { createFormatter } from "./format";
import { defaultPreferences } from "./preferences";

const f = createFormatter(defaultPreferences, "Europe/Istanbul");

const session = {
  fast: true,
  brand: "Tesla",
  phases: null,
  energyAddedKwh: 40,
  energyUsedKwh: 44,
  billedKwh: 44,
  durationMin: 30,
  startLevel: 20,
  endLevel: 80,
  startRangeKm: 90,
  endRangeKm: 360,
  cost: 440,
  costEstimated: false,
};

describe("powerByLevel", () => {
  test("averages the power at each battery level", () => {
    expect(
      powerByLevel([
        { level: 21, power: 150 },
        { level: 20, power: 120 },
        { level: 20, power: 125 },
        { level: null, power: 90 },
        { level: 22, power: null },
      ]),
    ).toEqual([
      { level: 20, power: 122.5 },
      { level: 21, power: 150 },
    ]);
  });
});

describe("chargeFigures", () => {
  test("derives the power, the efficiency, the range, and the cost parts", () => {
    const figures = chargeFigures(session, f);
    expect(figures.averagePower).toBe(80);
    expect(figures.efficiency).toBeCloseTo(90.9, 1);
    expect(figures.rangeAdded).toBe(270);
    expect(figures.levelsAdded).toBe(60);
    expect(figures.kind).toBe("Tesla DC fast charge");
    expect(figures.costSource).toBe("Recorded in TeslaMate");
    expect(figures.breakdown?.perKwhBilled).toBe(10);
  });

  test("names an AC charge with its phases and an estimated cost", () => {
    const figures = chargeFigures(
      { ...session, fast: false, phases: 3, costEstimated: true, cost: null },
      f,
    );
    expect(figures.kind).toBe("AC, 3 phase");
    expect(figures.costSource).toBe("Estimate from your price");
    expect(figures.breakdown).toBeNull();
  });
});
