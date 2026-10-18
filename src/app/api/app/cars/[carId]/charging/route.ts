import { chargingInsightsPage } from "@/lib/app/charging-insights";
import { appContext, appJson, appNotFound } from "@/lib/app/request";
import {
  chargeLevelTimes,
  chargeStarts,
  chargeTypeTotals,
  dcCurves,
} from "@/lib/charge-insights-data";
import { periodStart, readPeriod } from "@/lib/insights";
import { chargingPlaces } from "@/lib/places-data";
import { carSnapshot } from "@/lib/queries";
import { driveTotals } from "@/lib/stats-data";

export async function GET(
  request: Request,
  { params }: RouteContext<"/api/app/cars/[carId]/charging">,
) {
  const context = await appContext(params);
  if (!context) return appNotFound();
  const { car, f, preferences, now } = context;
  const period = readPeriod(
    new URL(request.url).searchParams.get("period") ?? undefined,
    preferences.period,
  );
  const from = periodStart(period, now);
  const [types, starts, curves, places, drives, levelTimes, snapshot] =
    await Promise.all([
      chargeTypeTotals(car.id, from),
      chargeStarts(car.id, from, f.timeZone),
      dcCurves(car.id, from),
      chargingPlaces(car.id, from),
      driveTotals(car.id, from),
      chargeLevelTimes(car.id),
      carSnapshot(car.id),
    ]);
  return appJson(
    chargingInsightsPage(
      {
        types,
        starts,
        curves,
        places,
        drivenKm: drives.distanceKm,
        levelTimes,
        batteryLevel: snapshot.batteryLevel,
      },
      period,
      preferences.weekStart === "sunday",
      f,
    ),
  );
}
