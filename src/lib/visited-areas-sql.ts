import type postgres from "postgres";

export type VisitedAreaRow = {
  country: string | null;
  state: string | null;
  city: string | null;
  places: number;
};

export function visitedAreasQuery(
  sql: postgres.Sql,
  options: { carId: number; since: Date },
) {
  const since = sql`(${options.since.toISOString()}::timestamptz at time zone 'UTC')`;
  return sql<VisitedAreaRow[]>`
    select a.country, a.state, a.city, count(*)::int as places
    from addresses a
    where a.id in (
      select start_address_id from drives
      where car_id = ${options.carId} and start_date >= ${since}
      union
      select end_address_id from drives
      where car_id = ${options.carId} and end_date >= ${since}
      union
      select address_id from charging_processes
      where car_id = ${options.carId}
        and (start_date >= ${since} or end_date >= ${since})
    )
    group by a.country, a.state, a.city
  `;
}
