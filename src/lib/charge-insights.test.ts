import { describe, expect, test } from "bun:test";
import {
  chargeInsightTotals,
  costPer100Km,
  costPerKwh,
  curveRows,
} from "./charge-insights";

describe("curveRows", () => {
  test("puts each session in its own column, one row for each level", () => {
    const { rows, keys } = curveRows([
      {
        id: 7,
        startAt: new Date(0),
        points: [
          { level: 20, power: 170.04 },
          { level: 30, power: 150 },
        ],
      },
      {
        id: 9,
        startAt: new Date(1),
        points: [
          { level: 30, power: 120 },
          { level: 40, power: 100 },
        ],
      },
    ]);
    expect(keys.map((key) => key.key)).toEqual(["s7", "s9"]);
    expect(rows).toEqual([
      { level: 20, s7: 170, s9: null },
      { level: 30, s7: 150, s9: 120 },
      { level: 40, s7: null, s9: 100 },
    ]);
  });

  test("gives nothing for no sessions", () => {
    expect(curveRows([])).toEqual({ rows: [], keys: [] });
  });
});

describe("costs", () => {
  test("divide the cost by energy and by distance", () => {
    expect(costPerKwh(10, 40)).toBe(0.25);
    expect(costPer100Km(12, 400)).toBe(3);
  });

  test("give null without a cost or a base", () => {
    expect(costPerKwh(null, 40)).toBeNull();
    expect(costPerKwh(10, 0)).toBeNull();
    expect(costPer100Km(12, 0)).toBeNull();
  });
});

describe("chargeInsightTotals", () => {
  test("adds AC and DC, and prices only the energy with a cost", () => {
    const totals = chargeInsightTotals(
      [
        { fast: false, sessions: 3, addedKwh: 60, cost: 12, costedKwh: 60 },
        { fast: true, sessions: 1, addedKwh: 40, cost: null, costedKwh: 0 },
      ],
      500,
    );
    expect(totals.sessions).toBe(4);
    expect(totals.addedKwh).toBe(100);
    expect(totals.cost).toBe(12);
    expect(totals.perKwh).toBeCloseTo(0.2, 6);
    expect(totals.perKm).toBeCloseTo(2.4, 6);
    expect(totals.ac?.sessions).toBe(3);
    expect(totals.dc?.sessions).toBe(1);
    expect(chargeInsightTotals([], 0).cost).toBeNull();
  });
});
