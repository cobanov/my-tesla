# 0011: Charging cost from a price in Settings

Date: 2026-10-05

Status: Accepted.

## Context

TeslaMate records a cost for a charge only when the charge is in a geofence with a price. Many owners never set a geofence price, so the cost pages stay empty. The app reads the database and never writes to it, so it cannot fill the `cost` column.

## Decision

1. Settings has a price per kWh and an optional fast charging price. Each user has their own prices, in the same file as the other Settings.
2. One SQL relation, `chargeSessionsRelation()` in `src/lib/charge-sessions-sql.ts`, gives every charge query its cost. A cost that TeslaMate recorded always stays.
3. For a completed charge without a recorded cost, the cost is the price times the energy from the charger. The energy from the charger is the larger of `charge_energy_added` and `charge_energy_used`, which is the same rule that TeslaMate uses for a geofence price.
4. A DC fast charge uses the fast charging price when it is set. Otherwise it uses the price per kWh.
5. The relation also gives `cost_estimated`, so the charge page, the Stats chart, and the CSV file can name the source of each cost.
6. Update of 2026-10-18: before the price in Settings, the relation applies the rules that TeslaMate applies when a charge ends (`put_cost` in `lib/teslamate/log.ex`). A car with free Supercharging costs 0 at a Tesla Supercharger. A geofence with a per-minute price costs the session fee plus the minutes times the price. A geofence with a per-kWh price or a session fee costs the session fee plus the energy from the charger times the price. So a charge that TeslaMate did not price, for example a charge that it left open or a charge before the geofence had a price, gets the same cost that TeslaMate would give. The relation names the rule in `cost_basis`: `recorded`, `free`, `per_minute`, `per_kwh`, or `price`.

## Alternatives

1. Write the cost into TeslaMate. This breaks the read-only rule.
2. Compute the cost in each page. Each total would need the same rule again, and the totals could disagree.

## Consequences

A price change applies to all old charges at once, because the app computes the cost at each request. A user who wants a price for each place must still set it on the TeslaMate geofence.
