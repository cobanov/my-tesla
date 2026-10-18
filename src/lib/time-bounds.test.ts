import { describe, expect, test } from "bun:test";
import { sinceOf, untilOf } from "./time-bounds";

describe("time bounds", () => {
  test("give ISO times that a Date parses, as postgres.js needs for timestamptz", () => {
    expect(sinceOf(null)).toBe("1970-01-01T00:00:00.000Z");
    expect(new Date(untilOf(null)).getTime()).toBeGreaterThan(Date.now());
    const to = new Date("2027-01-01T00:00:00Z");
    expect(untilOf(to)).toBe("2027-01-01T00:00:00.000Z");
  });
});
