import type postgres from "postgres";

type Part = postgres.PendingQuery<postgres.Row[]>;

export function latestRangedPositionDate(
  sql: postgres.Sql,
  carId: Part | number,
  condition: Part = sql`true`,
) {
  return sql`coalesce((
    select positions.date from positions
    where positions.car_id = ${carId}
      and positions.ideal_battery_range_km is not null
      and ${condition}
    order by positions.date desc
    limit 1
  ), '-infinity'::timestamp)`;
}
