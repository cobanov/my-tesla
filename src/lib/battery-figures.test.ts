import { describe, expect, test } from "bun:test";
import { chargeAdvice } from "./battery-figures";

const now = new Date("2026-10-18T12:00:00Z");
const daysAgo = (days: number) =>
  new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

describe("chargeAdvice", () => {
  test("asks an LFP battery for a weekly full charge and counts the days", () => {
    const advice = chargeAdvice(
      true,
      [
        { endLevel: 100, endAt: daysAgo(9) },
        { endLevel: 99, endAt: daysAgo(3) },
        { endLevel: 80, endAt: daysAgo(1) },
      ],
      now,
    );
    expect(advice.advice).toContain("charge limit of 100%");
    expect(advice.detail).toBe("The last full charge was 3 days ago.");
    expect(
      chargeAdvice(true, [{ endLevel: 100, endAt: daysAgo(0.5) }], now).detail,
    ).toBe("The last full charge was today.");
    expect(
      chargeAdvice(true, [{ endLevel: 90, endAt: daysAgo(1) }], now).detail,
    ).toBe("No full charge in this period.");
    expect(chargeAdvice(true, [], now).detail).toBeNull();
  });

  test("counts the charges above 90% for other cells", () => {
    const advice = chargeAdvice(
      false,
      [
        { endLevel: 90, endAt: daysAgo(4) },
        { endLevel: 91, endAt: daysAgo(3) },
        { endLevel: 100, endAt: daysAgo(2) },
      ],
      now,
    );
    expect(advice.advice).toContain("80 to 90%");
    expect(advice.detail).toBe(
      "2 of 3 charges in this period ended above 90%.",
    );
    expect(chargeAdvice(false, [], now).detail).toBeNull();
  });
});
