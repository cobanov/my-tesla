import { describe, expect, test } from "bun:test";
import { deviceClaim } from "./pairing-request";

const code = "a".repeat(43);

describe("deviceClaim", () => {
  test("keeps a valid code and a clean device name and system", () => {
    expect(
      deviceClaim({ code, name: " Ege's iPhone\u0007 ", platform: "iOS" }),
    ).toEqual({ code, name: "Ege's iPhone", platform: "ios" });
    expect(deviceClaim({ code, name: "", platform: "tv" })).toEqual({
      code,
      name: "A phone",
      platform: "phone",
    });
    expect(deviceClaim({ code, name: "x".repeat(200) })?.name).toHaveLength(60);
  });

  test("refuses a missing or malformed code", () => {
    expect(deviceClaim({ code: "short" })).toBeNull();
    expect(deviceClaim(null)).toBeNull();
    expect(deviceClaim("text")).toBeNull();
  });
});
