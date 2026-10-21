import { appContext, appJson, appNotFound } from "@/lib/app/request";
import { statsPage } from "@/lib/app/stats";
import { bucketUnit, periodStart, readPeriod } from "@/lib/insights";
import { speedEdges } from "@/lib/speed-bands";
import {
  driveStarts,
  driveTotals,
  efficiencyPoints,
  longestDrives,
  odometerTrend,
  periodChargeTotals,
  pressureTrend,
  recentTireLeaks,
  softwareUpdates,
  speedBandRows,
  statsBuckets,
} from "@/lib/stats-data";

export async function GET(
  request: Request,
  { params }: RouteContext<"/api/app/cars/[carId]/stats">,
) {
  const context = await appContext(params);
  if (!context) return appNotFound();
  const { car, f, preferences, now } = context;
  const period = readPeriod(
    new URL(request.url).searchParams.get("period") ?? undefined,
    preferences.period,
  );
  const from = periodStart(period, now);
  const unit = bucketUnit(period);
  const timeZone = f.timeZone;
  const [
    buckets,
    drives,
    charges,
    efficiency,
    starts,
    pressure,
    updates,
    longest,
    speedRows,
    leaks,
    odometer,
  ] = await Promise.all([
    statsBuckets(
      car.id,
      from,
      unit,
      timeZone,
      preferences.weekStart === "sunday",
    ),
    driveTotals(car.id, from),
    periodChargeTotals(car.id, from),
    efficiencyPoints(car.id, from),
    driveStarts(car.id, from, timeZone),
    pressureTrend(car.id, from, unit === "month" ? "week" : "day", timeZone),
    softwareUpdates(car.id),
    longestDrives(car.id, from),
    speedBandRows(car.id, from, speedEdges(preferences.distance).kmh),
    recentTireLeaks(car.id, timeZone),
    odometerTrend(car.id, from),
  ]);
  return appJson(
    statsPage(
      {
        buckets,
        drives,
        charges,
        efficiency,
        starts,
        pressure,
        updates,
        longest,
        speedRows,
        leaks,
        odometer,
      },
      car,
      preferences,
      period,
      f,
      now,
    ),
  );
}
