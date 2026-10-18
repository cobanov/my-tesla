import type postgres from "postgres";

const cellsPerDegree = 200;
const drivesPerPlacePair = 3;

export type DrivenPointRow = { driveId: number; lng: number; lat: number };

function cellOf(sql: postgres.Sql, position: string) {
  return sql`concat(
    round(${sql(`${position}.latitude`)} * ${cellsPerDegree}), ':',
    round(${sql(`${position}.longitude`)} * ${cellsPerDegree})
  )`;
}

export function drivenPointsQuery(
  sql: postgres.Sql,
  options: { carId: number; sampleSize: number },
) {
  return sql<DrivenPointRow[]>`
    with keyed as (
      select
        d.id,
        d.start_date,
        d.start_position_id,
        d.end_position_id,
        ${cellOf(sql, "sp")} as start_cell,
        ${cellOf(sql, "ep")} as end_cell
      from drives d
      left join positions sp on sp.id = d.start_position_id
      left join positions ep on ep.id = d.end_position_id
      where d.car_id = ${options.carId}
    ),
    chosen as (
      select id, start_position_id, end_position_id
      from (
        select
          k.*,
          row_number() over (
            partition by
              least(k.start_cell, k.end_cell),
              greatest(k.start_cell, k.end_cell)
            order by k.start_date desc
          ) as latest
        from keyed k
      ) ranked
      where latest <= ${drivesPerPlacePair}
    ),
    sampling as (
      select greatest(1, ceil(count(*) / ${options.sampleSize}::float8))::int
        as every
      from positions
      where drive_id in (select id from chosen)
    )
    select
      p.drive_id::int as "driveId",
      round(p.longitude, 5)::float8 as lng,
      round(p.latitude, 5)::float8 as lat
    from positions p
    cross join sampling s
    where p.drive_id in (select id from chosen)
      and (
        p.id % s.every = 0
        or p.id in (select start_position_id from chosen)
        or p.id in (select end_position_id from chosen)
      )
    order by p.drive_id, p.date, p.id
  `;
}
