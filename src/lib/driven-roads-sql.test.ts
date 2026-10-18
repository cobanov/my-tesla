import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type postgres from "postgres";
import { demoSchema } from "./demo/schema";
import { drivenPointsQuery, type DrivenPointRow } from "./driven-roads-sql";
import { createSql } from "./sql-template";

let db: PGlite;
let sql: postgres.Sql;

type PositionSeed = { id: number; car: number; drive: number | null };

const positionSeeds: PositionSeed[] = [
  ...Array.from({ length: 10 }, (_, index) => ({
    id: index + 1,
    car: 1,
    drive: 1,
  })),
  ...Array.from({ length: 7 }, (_, index) => ({
    id: index + 11,
    car: 1,
    drive: 2,
  })),
  { id: 18, car: 1, drive: null },
  { id: 19, car: 1, drive: null },
  { id: 20, car: 2, drive: 3 },
  { id: 21, car: 2, drive: 3 },
];

function positionTuple({ id, car, drive }: PositionSeed) {
  const minute = String(id).padStart(2, "0");
  return `(${id}, ${car}, ${drive ?? "null"}, '2026-10-01 08:${minute}', ${33 + id / 1000}, ${-111.9 - id / 1000})`;
}

const positions = `
  insert into positions (id, car_id, drive_id, date, latitude, longitude)
  values ${positionSeeds.map(positionTuple).join(",\n    ")}
`;

const drives = `
  insert into drives (id, car_id, start_date, start_position_id, end_position_id)
  values
    (1, 1, '2026-10-01 08:01', 1, 10),
    (2, 1, '2026-10-01 08:11', 11, 17),
    (3, 2, '2026-10-01 08:20', 20, 21)
`;

async function points(
  carId: number,
  sampleSize: number,
): Promise<DrivenPointRow[]> {
  return drivenPointsQuery(sql, { carId, sampleSize });
}

function idsOf(rows: DrivenPointRow[]): number[] {
  return rows.map((row) => Math.round((row.lat - 33) * 1000));
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec("set timezone = 'UTC'");
  await db.exec(demoSchema);
  await db.exec(positions);
  await db.exec(drives);
  sql = createSql(
    async (text, params) => (await db.query(text, params)).rows as never,
  ) as unknown as postgres.Sql;
});

afterAll(async () => {
  await db.close();
});

describe("drivenPointsQuery", () => {
  test("gives every driven position of one car when they fit", async () => {
    const rows = await points(1, 100);
    expect(idsOf(rows)).toEqual(Array.from({ length: 17 }, (_, i) => i + 1));
    expect(rows[0]).toEqual({ driveId: 1, lng: -111.901, lat: 33.001 });
  });

  test("keeps every nth position and the start and end of each drive", async () => {
    expect(idsOf(await points(1, 4))).toEqual([1, 5, 10, 11, 15, 17]);
  });

  test("orders the points by drive and by time", async () => {
    const rows = await points(1, 4);
    expect(rows.map((row) => row.driveId)).toEqual([1, 1, 1, 2, 2, 2]);
  });

  test("leaves out parked positions and other cars", async () => {
    const ids = idsOf(await points(1, 100));
    expect(ids).not.toContain(18);
    expect(ids).not.toContain(20);
    expect(idsOf(await points(2, 100))).toEqual([20, 21]);
  });

  test("keeps the three latest drives between the same two places, either way", async () => {
    const home = "33.420500, -111.940000";
    const office = "33.450000, -112.073800";
    const legs = [home, office, home, office, home, office];
    await db.exec(`
      insert into positions (id, car_id, drive_id, date, latitude, longitude)
      values ${legs
        .slice(0, 5)
        .flatMap((from, index) => [
          `(${500 + index * 2}, 5, ${50 + index}, '2026-10-0${index + 1} 08:00', ${from})`,
          `(${501 + index * 2}, 5, ${50 + index}, '2026-10-0${index + 1} 08:30', ${legs[index + 1]})`,
        ])
        .join(", ")};
      insert into drives (id, car_id, start_date, start_position_id, end_position_id)
      values ${[0, 1, 2, 3, 4]
        .map(
          (index) =>
            `(${50 + index}, 5, '2026-10-0${index + 1} 08:00', ${500 + index * 2}, ${501 + index * 2})`,
        )
        .join(", ")};
    `);
    const rows = await points(5, 100);
    expect([...new Set(rows.map((row) => row.driveId))]).toEqual([52, 53, 54]);
  });

  test("rounds the coordinates to about one meter", async () => {
    await db.exec(`
      insert into positions (id, car_id, drive_id, date, latitude, longitude)
      values (30, 3, 4, '2026-10-01 09:00', 33.123456, -111.987654);
      insert into drives (id, car_id, start_date, start_position_id, end_position_id)
      values (4, 3, '2026-10-01 09:00', 30, 30);
    `);
    expect(await points(3, 100)).toEqual([
      { driveId: 4, lng: -111.98765, lat: 33.12346 },
    ]);
  });
});
