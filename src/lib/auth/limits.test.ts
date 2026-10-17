import { describe, expect, test } from "bun:test";
import { Backoff, FailureCap, waitText } from "./limits";

describe("Backoff", () => {
  test("allows five failures, then doubles the wait up to the cap", () => {
    const backoff = new Backoff(5, 1000, 8000);
    for (let i = 0; i < 5; i += 1) backoff.fail("a", 0);
    expect(backoff.waitMs("a", 0)).toBe(0);
    backoff.fail("a", 0);
    expect(backoff.waitMs("a", 0)).toBe(1000);
    backoff.fail("a", 0);
    expect(backoff.waitMs("a", 500)).toBe(1500);
    for (let i = 0; i < 40; i += 1) backoff.fail("a", 0);
    expect(backoff.waitMs("a", 0)).toBe(8000);
    expect(backoff.waitMs("b", 0)).toBe(0);
  });

  test("forgets an account after a success or a day", () => {
    const backoff = new Backoff(1, 1000, 8000, 10_000);
    backoff.fail("a", 0);
    backoff.fail("a", 0);
    backoff.succeed("a");
    expect(backoff.waitMs("a", 0)).toBe(0);
    backoff.fail("b", 0);
    backoff.fail("b", 0);
    expect(backoff.waitMs("b", 20_000)).toBe(0);
  });

  test("keeps at most ten thousand keys", () => {
    const backoff = new Backoff(0, 1000, 8000);
    for (let i = 0; i < 10_050; i += 1) backoff.fail(`k${i}`, 0);
    expect(backoff.waitMs("k0", 0)).toBe(0);
    expect(backoff.waitMs("k10049", 0)).toBe(1000);
  });
});

describe("FailureCap", () => {
  test("counts failures only, for one day", () => {
    const cap = new FailureCap(2);
    expect(cap.blocked("ip", 0)).toBe(false);
    cap.fail("ip", 0);
    expect(cap.blocked("ip", 1)).toBe(false);
    cap.fail("ip", 1);
    expect(cap.blocked("ip", 2)).toBe(true);
    expect(cap.blocked("ip", 24 * 3_600_000)).toBe(false);
  });
});

test("waitText says seconds or minutes", () => {
  expect(waitText(1000)).toBe("1 second");
  expect(waitText(30_500)).toBe("31 seconds");
  expect(waitText(90_000)).toBe("2 minutes");
});
