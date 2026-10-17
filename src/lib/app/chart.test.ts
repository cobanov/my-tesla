import { describe, expect, test } from "bun:test";
import { buildChart } from "./chart";

const style = {
  timeZone: "Europe/Istanbul",
  clock: "24h" as const,
  dateOrder: "day-month" as const,
  locale: "en-US",
  animate: true,
};

const start = Date.parse("2026-10-17T07:07:00Z");

const rows = [0, 35, 70, 105].map((minutes, index) => ({
  at: start + minutes * 60_000,
  speed: [0, 64, 118, 40][index]!,
  power: [-12, 30, 55, null][index] ?? null,
}));

describe("buildChart", () => {
  test("puts clock ticks on round local times", () => {
    const chart = buildChart({
      title: "Speed and power",
      rows,
      xKey: "at",
      xFormat: "clock",
      style,
      series: [
        { key: "speed", label: "Speed", unit: "km/h", color: "chart1" },
        {
          key: "power",
          label: "Power",
          unit: "kW",
          color: "chart4",
          axis: "right",
        },
      ],
      left: "zero",
    });
    expect(chart?.x.ticks.map((tick) => tick.label)).toEqual([
      "10:30",
      "11:00",
      "11:30",
    ]);
    expect(chart?.points[0]?.label.endsWith("10:07")).toBe(true);
    expect(chart?.points[3]?.values).toEqual([40, null]);
  });

  test("starts a zero axis at zero and keeps a second unit on the right", () => {
    const chart = buildChart({
      title: "Speed and power",
      rows,
      xKey: "at",
      xFormat: "clock",
      style,
      series: [
        { key: "speed", label: "Speed", unit: "km/h", color: "chart1" },
        {
          key: "power",
          label: "Power",
          unit: "kW",
          color: "chart4",
          axis: "right",
        },
      ],
      left: "zero",
    });
    expect(chart?.left.domain).toEqual([0, 125]);
    expect(chart?.left.ticks.at(-1)).toEqual({ value: 125, label: "125" });
    expect(chart?.right?.domain[0]).toBeLessThanOrEqual(-12);
    expect(chart?.series[1]).toMatchObject({ axis: "right", kind: "line" });
  });

  test("picks up to five ticks from bucket starts", () => {
    const weeks = Array.from({ length: 9 }, (_, index) => ({
      at: Date.parse("2026-08-03T00:00:00Z") + index * 7 * 86_400_000,
      km: 100 + index,
    }));
    const chart = buildChart({
      title: "Distance",
      rows: weeks,
      xKey: "at",
      xFormat: "day",
      style,
      series: [
        {
          key: "km",
          label: "Distance",
          unit: "km",
          color: "chart1",
          kind: "bar",
        },
      ],
      left: "zero",
    });
    expect(chart?.x.ticks.map((tick) => tick.value)).toEqual(
      [0, 2, 4, 6, 8].map((index) => weeks[index]!.at),
    );
  });

  test("gives no chart for fewer than two points", () => {
    expect(
      buildChart({
        title: "Speed",
        rows: rows.slice(0, 1),
        xKey: "at",
        xFormat: "clock",
        style,
        series: [
          { key: "speed", label: "Speed", unit: "km/h", color: "chart1" },
        ],
      }),
    ).toBeNull();
  });

  test("gives a battery level axis even ticks and a fixed percent axis", () => {
    const chart = buildChart({
      title: "Power by battery level (kW)",
      rows: [12, 30, 55, 78].map((level, index) => ({
        level,
        power: [170, 150, 90, 40][index]!,
        battery: level,
      })),
      xKey: "level",
      xFormat: "percent",
      style,
      series: [
        { key: "battery", label: "Battery", unit: "%", color: "chart1" },
        {
          key: "power",
          label: "Power",
          unit: "kW",
          color: "charge",
          axis: "right",
        },
      ],
      left: "percent",
      leftFormat: "percent",
      right: "zero",
    });
    expect(chart?.x.ticks.map((tick) => tick.label)).toEqual([
      "20%",
      "40%",
      "60%",
    ]);
    expect(chart?.left.ticks.map((tick) => tick.label)).toEqual([
      "0%",
      "25%",
      "50%",
      "75%",
      "100%",
    ]);
    expect(chart?.right?.domain).toEqual([0, 200]);
  });
});
