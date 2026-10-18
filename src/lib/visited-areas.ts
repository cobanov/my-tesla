import type { VisitedAreaRow } from "./visited-areas-sql";

export type VisitedArea = {
  key: string;
  name: string;
  within: string | null;
  places: number;
};

type AreaLevel = "country" | "state" | "city";

const enclosingLevels: Record<AreaLevel, AreaLevel[]> = {
  country: [],
  state: ["country"],
  city: ["state", "country"],
};

function areasAt(rows: VisitedAreaRow[], level: AreaLevel): VisitedArea[] {
  const areas = new Map<string, VisitedArea>();
  for (const row of rows) {
    const name = row[level];
    if (!name) continue;
    const enclosing = enclosingLevels[level].map((parent) => row[parent]);
    const key = JSON.stringify([name, ...enclosing]);
    const area = areas.get(key) ?? {
      key,
      name,
      within: enclosing.find(Boolean) ?? null,
      places: 0,
    };
    area.places += row.places;
    areas.set(key, area);
  }
  return [...areas.values()].sort(
    (a, b) => b.places - a.places || a.name.localeCompare(b.name),
  );
}

export function visitedAreas(rows: VisitedAreaRow[]) {
  return {
    countries: areasAt(rows, "country"),
    states: areasAt(rows, "state"),
    cities: areasAt(rows, "city"),
  };
}
