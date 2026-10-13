import { describe, expect, test } from "bun:test";
import {
  canonicalCarPath,
  carPath,
  carSlugs,
  findCarByParam,
  slugify,
} from "./car-slug";

describe("slugify", () => {
  test.each([
    ["Cobanov", "cobanov"],
    ["Rika", "rika"],
    ["Red Rocket", "red-rocket"],
    ["  Model Y — Daily  ", "model-y-daily"],
    ["Işıl Şimşek", "isil-simsek"],
    ["Çağlar Ölmez Üzüm Göç", "caglar-olmez-uzum-goc"],
    ["Straße", "strasse"],
    ["Tesla 2", "tesla-2"],
    ["🚗", ""],
    ["", ""],
  ])("slugify(%p)", (name, expected) => {
    expect(slugify(name)).toBe(expected);
  });
});

describe("carSlugs", () => {
  test("uses the name of each car", () => {
    const slugs = carSlugs([
      { id: 1, name: "Cobanov" },
      { id: 2, name: "Rika" },
    ]);
    expect(slugs.get(1)).toBe("cobanov");
    expect(slugs.get(2)).toBe("rika");
  });

  test("adds the id when two names give the same slug", () => {
    const slugs = carSlugs([
      { id: 3, name: "Juniper" },
      { id: 7, name: "juniper" },
      { id: 9, name: "Highland" },
    ]);
    expect(slugs.get(3)).toBe("juniper-3");
    expect(slugs.get(7)).toBe("juniper-7");
    expect(slugs.get(9)).toBe("highland");
  });

  test("falls back to the id for a name without letters or digits", () => {
    expect(carSlugs([{ id: 4, name: "🚗" }]).get(4)).toBe("car-4");
  });

  test("never gives a slug that reads as a car id", () => {
    expect(carSlugs([{ id: 5, name: "2024" }]).get(5)).toBe("car-5");
  });
});

describe("car paths", () => {
  const cars = [
    { id: 1, slug: "cobanov" },
    { id: 2, slug: "rika" },
  ];

  test("builds the path from the slug", () => {
    expect(carPath(cars[0])).toBe("/cars/cobanov");
    expect(carPath(cars[1], "/drives")).toBe("/cars/rika/drives");
  });

  test.each([
    ["cobanov", 1],
    ["rika", 2],
    ["2", 2],
    ["1", 1],
    ["3", null],
    ["unknown", null],
    ["123456", null],
  ] as const)("findCarByParam(%p)", (param, expected) => {
    expect(findCarByParam(cars, param)?.id ?? null).toBe(expected);
  });

  test.each([
    ["/cars/2", "/cars/rika"],
    ["/cars/2/drives/41", "/cars/rika/drives/41"],
    ["/cars/rika/stats", "/cars/rika/stats"],
    ["/elsewhere", "/elsewhere"],
  ])("canonicalCarPath(%p)", (pathname, expected) => {
    expect(canonicalCarPath(pathname, "rika")).toBe(expected);
  });
});
