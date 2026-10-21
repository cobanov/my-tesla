import { describe, expect, test } from "bun:test";
import { visitedAreas } from "./visited-areas";
import type { VisitedAreaRow } from "./visited-areas-sql";

const row = (
  country: string | null,
  state: string | null,
  city: string | null,
  places: number,
): VisitedAreaRow => ({ country, state, city, places });

const rows = [
  row("United States", "Arizona", "Tempe", 5),
  row("United States", "Arizona", "Phoenix", 3),
  row("United States", "Nevada", "Las Vegas", 2),
  row("United States", "Missouri", "Springfield", 1),
  row("United States", "Illinois", "Springfield", 1),
  row("Mexico", null, "Nogales", 1),
  row("Mexico", null, null, 2),
  row(null, null, null, 4),
];

describe("visitedAreas", () => {
  test("adds the places of each country, most places first", () => {
    expect(
      visitedAreas(rows).countries.map((area) => [area.name, area.places]),
    ).toEqual([
      ["United States", 12],
      ["Mexico", 3],
    ]);
  });

  test("names the country of each state", () => {
    expect(
      visitedAreas(rows).states.map((area) => [
        area.name,
        area.within,
        area.places,
      ]),
    ).toEqual([
      ["Arizona", "United States", 8],
      ["Nevada", "United States", 2],
      ["Illinois", "United States", 1],
      ["Missouri", "United States", 1],
    ]);
  });

  test("keeps two cities of one name in two states apart", () => {
    const springfields = visitedAreas(rows).cities.filter(
      (area) => area.name === "Springfield",
    );
    expect(springfields.map((area) => area.within).sort()).toEqual([
      "Illinois",
      "Missouri",
    ]);
    expect(new Set(springfields.map((area) => area.key)).size).toBe(2);
  });

  test("names the country of a city without a state", () => {
    const nogales = visitedAreas(rows).cities.find(
      (area) => area.name === "Nogales",
    );
    expect(nogales?.within).toBe("Mexico");
  });

  test("leaves out an address without a name at that level", () => {
    const { countries, states, cities } = visitedAreas(rows);
    expect(cities).toHaveLength(6);
    expect(states.some((area) => area.name === "Mexico")).toBe(false);
    expect(countries.every((area) => area.name)).toBe(true);
  });

  test("gives empty lists without a record", () => {
    expect(visitedAreas([])).toEqual({ countries: [], states: [], cities: [] });
  });
});
