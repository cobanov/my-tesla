import { batteryPage } from "@/lib/app/battery";
import { appContext, appJson, appNotFound } from "@/lib/app/request";
import {
  batteryNow,
  capacityHistory,
  chargeLevels,
  chargeLevelTrend,
  chargeTotals,
  idlePeriods,
  levelTime,
  longChargeKwh,
  projectedRanges,
  stateTimes,
} from "@/lib/battery-data";
import { periodStart, readPeriod } from "@/lib/insights";

export async function GET(
  request: Request,
  { params }: RouteContext<"/api/app/cars/[carId]/battery">,
) {
  const context = await appContext(params);
  if (!context) return appNotFound();
  const { car, f, preferences, now } = context;
  const period = readPeriod(
    new URL(request.url).searchParams.get("period") ?? undefined,
    preferences.period,
  );
  const from = periodStart(period, now);
  const [
    capacity,
    latest,
    totals,
    levels,
    charges,
    idle,
    minimumKwh,
    levelTrend,
    ranges,
    states,
  ] = await Promise.all([
    capacityHistory(car.id),
    batteryNow(car.id),
    chargeTotals(car.id),
    levelTime(car.id, from),
    chargeLevels(car.id, from),
    idlePeriods(car.id, from),
    longChargeKwh(car.id),
    chargeLevelTrend(car.id, from),
    projectedRanges(car.id, from),
    stateTimes(car.id, from, now),
  ]);
  return appJson(
    batteryPage(
      {
        capacity,
        latest,
        totals,
        levels,
        charges,
        idle,
        minimumKwh,
        levelTrend,
        ranges,
        states,
        lfpBattery: car.lfpBattery,
      },
      period,
      f,
      now,
    ),
  );
}
