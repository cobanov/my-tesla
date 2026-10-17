import { describe, expect, test } from "bun:test";
import { evenTicks, niceDomain, niceZeroDomain } from "./nice-domain";

describe("niceDomain", () => {
  test("puts five even ticks around the values", () => {
    expect(niceDomain([59.8, 60.6])).toEqual([59.5, 61.5]);
    expect(niceDomain([440, 446])).toEqual([435, 455]);
    expect(niceDomain([227, 231])).toEqual([226, 234]);
  });

  test("keeps every value inside the domain", () => {
    const values = [3.2, 97.4, 51];
    const [low, high] = niceDomain(values) ?? [0, 0];
    expect(low).toBeLessThanOrEqual(3.2);
    expect(high).toBeGreaterThanOrEqual(97.4);
  });

  test("gives a domain to one flat value", () => {
    const [low, high] = niceDomain([230, 230]) ?? [0, 0];
    expect(low).toBeLessThan(230);
    expect(high).toBeGreaterThan(230);
  });

  test("gives no domain without values", () => {
    expect(niceDomain([])).toBeUndefined();
  });
});

describe("niceZeroDomain", () => {
  test("starts at zero and ends close above the largest value", () => {
    expect(niceZeroDomain([0, 118])).toEqual([0, 125]);
    expect(niceZeroDomain([12, 76])).toEqual([0, 80]);
    expect(niceZeroDomain([0.4])).toEqual([0, 0.5]);
  });

  test("falls back to the even domain for negative values", () => {
    expect(niceZeroDomain([-40, 120])).toEqual(niceDomain([-40, 120]));
  });

  test("gives no domain without values", () => {
    expect(niceZeroDomain([])).toBeUndefined();
  });
});

describe("evenTicks", () => {
  test("splits a domain into even steps", () => {
    expect(evenTicks([0, 125])).toEqual([0, 25, 50, 75, 100, 125]);
    expect(evenTicks([0, 80])).toEqual([0, 20, 40, 60, 80]);
    expect(evenTicks([59.5, 61.5])).toEqual([59.5, 60, 60.5, 61, 61.5]);
  });
});
