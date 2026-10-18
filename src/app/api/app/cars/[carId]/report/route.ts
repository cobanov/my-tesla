import { reportPage } from "@/lib/app/report";
import { appContext, appJson, appNotFound } from "@/lib/app/request";
import { tripRoutes } from "@/lib/queries";
import { tripPresets, tripRange } from "@/lib/trip";
import { tripsInRange } from "@/lib/trip-data";

export async function GET(
  request: Request,
  { params }: RouteContext<"/api/app/cars/[carId]/report">,
) {
  const context = await appContext(params);
  if (!context) return appNotFound();
  const { car, f, now, showMaps } = context;
  const search = new URL(request.url).searchParams;
  const range = tripRange(
    search.get("from"),
    search.get("to"),
    f.timeZone,
    now,
  );
  const { trips, drives, charges } =
    range === "invalid"
      ? { trips: [], drives: [], charges: [] }
      : await tripsInRange(car, range);
  const routes = showMaps
    ? await tripRoutes(
        car.id,
        [...drives].reverse().map((drive) => drive.id),
      )
    : null;
  return appJson(
    reportPage(
      {
        range,
        presets: tripPresets(now, f.timeZone),
        trips,
        drives,
        charges,
        routes,
      },
      car,
      f,
      now,
    ),
  );
}
