import { placesPage } from "@/lib/app/places";
import { appContext, appJson, appNotFound } from "@/lib/app/request";
import { periodStart, readPeriod } from "@/lib/insights";
import {
  chargingPlaces,
  frequentRoutes,
  geofenceList,
  visitedPlaces,
} from "@/lib/places-data";

export async function GET(
  request: Request,
  { params }: RouteContext<"/api/app/cars/[carId]/places">,
) {
  const context = await appContext(params);
  if (!context) return appNotFound();
  const { car, f, preferences, now } = context;
  const period = readPeriod(
    new URL(request.url).searchParams.get("period") ?? undefined,
    preferences.period,
  );
  const from = periodStart(period, now);
  const [visited, charging, geofences, routes] = await Promise.all([
    visitedPlaces(car.id, from),
    chargingPlaces(car.id, from),
    geofenceList(),
    frequentRoutes(car.id, from, f.timeZone),
  ]);
  return appJson(
    placesPage(
      { visited, charging, geofences, routes },
      preferences,
      period,
      f,
      now,
    ),
  );
}
