import { describe, expect, test } from "bun:test";
import { chargeLeftText, durationText } from "./format";

const now = new Date("2026-10-17T12:00:00.000Z");

describe("durationText", () => {
  test("writes minutes and hours like the web dashboard", () => {
    expect(durationText(42)).toBe("42 min");
    expect(durationText(130)).toBe("2 h 10 min");
    expect(durationText(125)).toBe("2 h 05 min");
    expect(durationText(120)).toBe("2 h");
  });
});

describe("chargeLeftText", () => {
  test("counts down to the end of a charge", () => {
    expect(chargeLeftText("2026-10-17T14:10:00.000Z", now)).toBe(
      "2 h 10 min left",
    );
    expect(chargeLeftText("2026-10-17T12:00:30.000Z", now)).toBe("Almost done");
    expect(chargeLeftText(null, now)).toBeNull();
  });
});
