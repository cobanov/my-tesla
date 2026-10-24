import type postgres from "postgres";
import type { RangeKind } from "./range-columns";

export function lastUsableCharge(
  sql: postgres.Sql,
  chargingProcessId: postgres.PendingQuery<postgres.Row[]>,
  kind: RangeKind,
) {
  return sql`
    select
      (array_agg(charges.rated_battery_range_km order by charges.date desc))[1]
        as rated_battery_range_km,
      (array_agg(
        ${sql(`charges.${kind}_battery_range_km`)} order by charges.date desc
      ))[1] as preferred_range_km,
      (array_agg(charges.usable_battery_level order by charges.date desc))[1]
        as usable_battery_level
    from charges
    where charges.charging_process_id = ${chargingProcessId}
      and charges.usable_battery_level > 0
    having count(*) > 0
  `;
}
